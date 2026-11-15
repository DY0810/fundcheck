/// <reference types="node" />
// Eval runner: each case → real POST /api/extract → runCheck → score against hand labels.
// Usage: npx tsx evals/run.ts [--url https://fundcheck.cyberprivacy.workers.dev] [--only e01,e03]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type {
  CheckInput, CheckResult, EvalCase, EvalCaseResult, EvalRun, ExtractResponse, Provider, RuleId, RulesFile, VendorList,
} from '../src/shared/contracts';
import rulesJson from '../src/shared/rules.json';
import { SAMPLE_PLAN } from '../src/fixtures/sample-plan';

const rules = rulesJson as RulesFile;
// shortcut: `orAsk` is an evals-only extension of EvalCase (an Ask chip also counts as a hit); move it into contracts.ts if the UI needs it.
type Must = EvalCase['expect']['mustFlag'][number] & { orAsk?: boolean };
const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const base = (arg('--url') ?? 'http://localhost:8787').replace(/\/$/, '');
const only = arg('--only')?.split(',').map((s) => s.trim());
const dump = arg('--dump'); // optional path: raw extraction + check per case, for triaging failures
const dumped: Record<string, unknown> = {};

// 1. Validate the labels before spending any API credit.
const cases: EvalCase[] = JSON.parse(readFileSync(new URL('./cases.json', import.meta.url), 'utf8'));
const ruleIds = new Set(rules.rules.map((r) => r.id));
const problems: string[] = [];
if (cases.length !== 100) problems.push(`expected 100 cases, got ${cases.length}`);
if (new Set(cases.map((c) => c.id)).size !== cases.length) problems.push('duplicate case ids');
if (new Set(cases.map((c) => c.plan.trim().toLowerCase())).size !== cases.length) problems.push('duplicate plans');
for (const c of cases) {
  const all = [...c.expect.mustFlag.map((m) => m.ruleId), ...c.expect.mustNotFlag];
  for (const id of all) if (!ruleIds.has(id)) problems.push(`${c.id}: unknown rule ${id}`);
  for (const m of c.expect.mustFlag) {
    if (c.expect.mustNotFlag.includes(m.ruleId)) problems.push(`${c.id}: ${m.ruleId} in both lists`);
    if (m.itemContains && !c.plan.toLowerCase().includes(m.itemContains.toLowerCase())) problems.push(`${c.id}: itemContains "${m.itemContains}" not in plan`);
  }
  if (c.plan.length > 8000) problems.push(`${c.id}: plan over MAX_PLAN_CHARS`);
  if (c.today !== '2026-11-14') problems.push(`${c.id}: today must be 2026-11-14`);
  if (!c.why?.trim()) problems.push(`${c.id}: missing why`);
}
if (cases.find((c) => c.id === 'e01')?.plan !== SAMPLE_PLAN) problems.push('e01 plan is not SAMPLE_PLAN verbatim');
if (problems.length) { console.error('Label problems:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`labels ok: ${cases.length} cases, rules ${rules.version}`);

// 2. Load the engine. Computed specifier keeps `tsc` green while src/engine is still being written.
const enginePath = new URL('../src/engine/index.ts', import.meta.url).href;
let engine: { runCheck: (i: CheckInput) => CheckResult; vendors: VendorList };
try { engine = await import(enginePath); } catch (e) { console.error(`engine missing: ${(e as Error).message}`); process.exit(0); }
if (typeof engine.runCheck !== 'function' || !Array.isArray(engine.vendors)) { console.error('engine missing runCheck or vendors export'); process.exit(0); }

// 3. Run the cases, up to 4 at a time. Only a Claude answer is scored: fallback, cache or error → re-run that case.
const selected = only ? cases.filter((c) => only.includes(c.id)) : cases;
const HARD = new Set(['not_eligible', 'over_cap']);
const results: EvalCaseResult[] = [];
const perRule = new Map<RuleId, { tp: number; fn: number; fp: number }>();
const bump = (id: RuleId, k: 'tp' | 'fn' | 'fp') => { const r = perRule.get(id) ?? { tp: 0, fn: 0, fp: 0 }; r[k]++; perRule.set(id, r); };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const extract = async (plan: string): Promise<ExtractResponse> => {
  try {
    const r = await fetch(`${base}/api/extract`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plan }), signal: AbortSignal.timeout(90_000),
    });
    return await r.json() as ExtractResponse;
  } catch (e) {
    return { ok: false, error: { code: 'llm_failed', message: (e as Error).message } };
  }
};

const GAP_MS = 3100; // the worker allows 20 extract calls per minute per IP, so start at most one call every 3.1 s
let nextStart = 0, reruns = 0, limited = 0;
const unanswered: string[] = [];
const slot = async () => { const now = Date.now(), at = Math.max(now, nextStart); nextStart = at + GAP_MS; await sleep(at - now); };
type Ok = Extract<ExtractResponse, { ok: true }>;
async function claudeExtract(c: EvalCase): Promise<{ res: Ok; ms: number } | null> {
  for (let attempt = 0; attempt < 6; attempt++) {
    await slot();
    const t0 = Date.now(), res = await extract(c.plan), ms = Date.now() - t0;
    if (res.ok && res.provider === 'claude') return { res, ms };
    if (!res.ok && res.error?.code === 'rate_limited') { limited++; console.log(`${c.id} 429, backing off 30 s`); await sleep(30_000); continue; }
    reruns++; console.log(`${c.id} re-run: got ${res.ok ? res.provider : `error ${res.error?.code}`}`);
  }
  return null;
}

function score(c: EvalCase, res: Ok, ms: number): EvalCaseResult {
  const check = engine.runCheck({ extraction: res.extraction, answers: c.answers, today: c.today, rules, vendors: engine.vendors });
  const desc = (itemId: string | null) => res.extraction.items.find((i) => i.id === itemId)?.description.toLowerCase() ?? '';
  const hits: RuleId[] = [], misses: RuleId[] = [], falseFlags: RuleId[] = [];
  for (const m of c.expect.mustFlag as Must[]) {
    const tok = m.itemContains?.toLowerCase() ?? '';
    const hit = check.flags.some((f) => f.ruleId === m.ruleId && f.severity !== 'pass' && desc(f.itemId).includes(tok))
      || (!!m.orAsk && check.asks.some((a) => a.id.startsWith('match:') && a.id.endsWith(`:${m.ruleId}`) && desc(a.id.split(':')[1]).includes(tok)));
    (hit ? hits : misses).push(m.ruleId); bump(m.ruleId, hit ? 'tp' : 'fn');
  }
  for (const id of c.expect.mustNotFlag) {
    if (check.flags.some((f) => f.ruleId === id && HARD.has(f.severity))) { falseFlags.push(id); bump(id, 'fp'); }
  }
  const fundOk = c.expect.fund ? check.fund.fund === c.expect.fund : null;
  const eligibleOk = c.expect.eligibleCents != null ? check.money.eligibleCents === c.expect.eligibleCents : null;
  const pass = !misses.length && !falseFlags.length && fundOk !== false && eligibleOk !== false;
  dumped[c.id] = { extraction: res.extraction, flags: check.flags, asks: check.asks, money: check.money, fund: check.fund };
  console.log(`${c.id} ${pass ? 'PASS' : 'FAIL'} ${ms}ms${misses.length ? ' miss=' + misses : ''}${falseFlags.length ? ' false=' + falseFlags : ''}`
    + `${fundOk === false ? ' fund=' + check.fund.fund : ''}${eligibleOk === false ? ' eligible=' + check.money.eligibleCents : ''}`);
  return { id: c.id, title: c.title, pass, hits, misses, falseFlags, fundOk, eligibleOk, ms, provider: res.provider, model: res.model };
}

let next = 0;
const byId = new Map<string, EvalCaseResult>();
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < selected.length) {
    const c = selected[next++];
    const got = await claudeExtract(c);
    if (got) byId.set(c.id, score(c, got.res, got.ms)); else unanswered.push(c.id);
  }
}));
results.push(...selected.flatMap((c) => byId.get(c.id) ?? []));

// 4. Score and report.
const sum = (k: 'tp' | 'fn' | 'fp') => [...perRule.values()].reduce((a, r) => a + r[k], 0);
const ratio = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 1000 : 0); // JSON has no NaN
const [tp, fn, fp] = [sum('tp'), sum('fn'), sum('fp')];
const mode = <T,>(xs: T[]) => xs.sort((a, b) => xs.filter((x) => x === b).length - xs.filter((x) => x === a).length)[0];
const run: EvalRun = {
  ranAt: new Date().toISOString(),
  provider: mode(results.map((r) => r.provider)) ?? ('claude' as Provider),
  model: mode(results.map((r) => r.model)) ?? 'none',
  rulesVersion: rules.version,
  cases: results,
  perRule: rules.rules.filter((r) => perRule.has(r.id)).map((r) => ({ ruleId: r.id, ...perRule.get(r.id)! })),
  summary: { cases: results.length, passed: results.filter((r) => r.pass).length, precision: ratio(tp, tp + fp), recall: ratio(tp, tp + fn) },
};

console.table(results.map((r) => ({ id: r.id, pass: r.pass, hits: r.hits.join(' '), misses: r.misses.join(' '), falseFlags: r.falseFlags.join(' '),
  fund: r.fundOk, eligible: r.eligibleOk, ms: r.ms, provider: r.provider })));
console.table(run.perRule.filter((r) => r.fn || r.fp));
console.log(`passed ${run.summary.passed}/${run.summary.cases}  re-runs ${reruns}  429s ${limited}  precision ${run.summary.precision}  recall ${run.summary.recall}  (${run.provider} ${run.model}, ${base})`);

if (dump) writeFileSync(dump, JSON.stringify(dumped, null, 2));
if (unanswered.length) console.log(`NOT PUBLISHED: no Claude answer after 6 tries for ${unanswered.join(', ')}`);
else if (only) console.log('partial run (--only): public/eval-results.json not written');
else {
  mkdirSync(new URL('../public/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../public/eval-results.json', import.meta.url), JSON.stringify(run, null, 2) + '\n'); console.log('wrote public/eval-results.json'); }
