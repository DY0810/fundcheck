/// <reference types="node" />
// Eval runner: each case → real POST /api/extract → runCheck → score against hand labels.
// Usage: npx tsx evals/run.ts [--url https://fundcheck.mayhu733.workers.dev] [--only e01,e03]
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
if (cases.length !== 18) problems.push(`expected 18 cases, got ${cases.length}`);
if (new Set(cases.map((c) => c.id)).size !== cases.length) problems.push('duplicate case ids');
for (const c of cases) {
  const all = [...c.expect.mustFlag.map((m) => m.ruleId), ...c.expect.mustNotFlag];
  for (const id of all) if (!ruleIds.has(id)) problems.push(`${c.id}: unknown rule ${id}`);
  for (const m of c.expect.mustFlag) {
    if (c.expect.mustNotFlag.includes(m.ruleId)) problems.push(`${c.id}: ${m.ruleId} in both lists`);
    if (m.itemContains && !c.plan.toLowerCase().includes(m.itemContains.toLowerCase())) problems.push(`${c.id}: itemContains "${m.itemContains}" not in plan`);
  }
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

// 3. Run each case, one at a time.
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

for (const [n, c] of selected.entries()) {
  if (n) await sleep(1000);
  let t0 = Date.now();
  let res = await extract(c.plan);
  if (!res.ok && res.error?.code === 'rate_limited') { // the shared per-IP guard, not a model failure: wait once and retry
    console.log(`${c.id} rate limited, retrying in 30 s`);
    await sleep(30_000); t0 = Date.now(); res = await extract(c.plan);
  }
  const ms = Date.now() - t0;

  if (!res.ok) {
    // A failed call is a failed case, not a skipped one. No provider served it; 'claude' is the one attempted first.
    c.expect.mustFlag.forEach((m) => bump(m.ruleId, 'fn'));
    results.push({ id: c.id, title: c.title, pass: false, hits: [], misses: c.expect.mustFlag.map((m) => m.ruleId), falseFlags: [],
      fundOk: c.expect.fund ? false : null, eligibleOk: c.expect.eligibleCents != null ? false : null, ms,
      provider: 'claude', model: `error:${res.error?.code ?? 'unknown'}` });
    console.log(`${c.id} ERROR ${res.error?.code}: ${res.error?.message}`);
    continue;
  }

  const check = engine.runCheck({ extraction: res.extraction, answers: c.answers, today: c.today, rules, vendors: engine.vendors });
  const desc = (itemId: string | null) => (res.ok && res.extraction.items.find((i) => i.id === itemId)?.description.toLowerCase()) || '';
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
  results.push({ id: c.id, title: c.title, pass, hits, misses, falseFlags, fundOk, eligibleOk, ms, provider: res.provider, model: res.model });
  dumped[c.id] = { extraction: res.extraction, flags: check.flags, asks: check.asks, money: check.money, fund: check.fund };
  console.log(`${c.id} ${pass ? 'PASS' : 'FAIL'} ${ms}ms ${res.provider}${misses.length ? ' miss=' + misses : ''}${falseFlags.length ? ' false=' + falseFlags : ''}`
    + `${fundOk === false ? ' fund=' + check.fund.fund : ''}${eligibleOk === false ? ' eligible=' + check.money.eligibleCents : ''}`);
}

// 4. Score and report.
const sum = (k: 'tp' | 'fn' | 'fp') => [...perRule.values()].reduce((a, r) => a + r[k], 0);
const ratio = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 1000 : 0); // JSON has no NaN
const [tp, fn, fp] = [sum('tp'), sum('fn'), sum('fp')];
const mode = <T,>(xs: T[]) => xs.sort((a, b) => xs.filter((x) => x === b).length - xs.filter((x) => x === a).length)[0];
const served = results.filter((r) => !r.model.startsWith('error:'));
const run: EvalRun = {
  ranAt: new Date().toISOString(),
  provider: mode(served.map((r) => r.provider)) ?? ('claude' as Provider),
  model: mode(served.map((r) => r.model)) ?? 'none',
  rulesVersion: rules.version,
  cases: results,
  perRule: rules.rules.filter((r) => perRule.has(r.id)).map((r) => ({ ruleId: r.id, ...perRule.get(r.id)! })),
  summary: { cases: results.length, passed: results.filter((r) => r.pass).length, precision: ratio(tp, tp + fp), recall: ratio(tp, tp + fn) },
};

console.table(results.map((r) => ({ id: r.id, pass: r.pass, hits: r.hits.join(' '), misses: r.misses.join(' '), falseFlags: r.falseFlags.join(' '),
  fund: r.fundOk, eligible: r.eligibleOk, ms: r.ms, provider: r.provider })));
console.table(run.perRule.filter((r) => r.fn || r.fp));
console.log(`passed ${run.summary.passed}/${run.summary.cases}  errors ${results.length - served.length}  precision ${run.summary.precision}  recall ${run.summary.recall}  (${run.provider} ${run.model}, ${base})`);

if (dump) writeFileSync(dump, JSON.stringify(dumped, null, 2));
if (only) console.log('partial run (--only): public/eval-results.json not written');
else {
  mkdirSync(new URL('../public/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../public/eval-results.json', import.meta.url), JSON.stringify(run, null, 2) + '\n'); console.log('wrote public/eval-results.json'); }
