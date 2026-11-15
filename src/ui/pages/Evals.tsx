import { useEffect, useState } from 'react';
import { CircleCheck, CircleX } from 'lucide-react';
import type { EvalCase, EvalRun } from '../../shared/contracts';
import { rule } from '../lib/rules';
import { pct } from '../lib/format';

// cases.json (S4) carries each case's "why"; optional, so a missing file is not a build error.
const caseFiles = import.meta.glob<EvalCase[]>('../../../evals/cases.json', { eager: true, import: 'default' });
const WHY = new Map(Object.values(caseFiles).flat().map((c) => [c.id, c.why]));

type State = { kind: 'loading' } | { kind: 'pending' } | { kind: 'ready'; run: EvalRun };

const ranAt = (s: string) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function Evals() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  useEffect(() => {
    fetch('/eval-results.json', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<EvalRun>) : null))
      .then((run: EvalRun | null) => setState(run?.summary && Array.isArray(run.cases) ? { kind: 'ready', run } : { kind: 'pending' }))
      .catch(() => setState({ kind: 'pending' })); // a SPA fallback serves HTML for a missing file: not JSON → pending
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 pt-4 lg:px-8 lg:pt-8">
      <div className="flex max-w-[68ch] flex-col gap-2">
        <h1 className="m-0 text-[1.5rem] leading-[1.875rem] font-semibold sm:text-xl">How accurate are the AI checks?</h1>
        <p className="m-0 text-base text-ink-2">
          We wrote event plans by hand, labelled the rules each one should and shouldn't trigger, and ran every plan through the same AI reading and rules engine the checker uses. These are the results of the latest run.
        </p>
      </div>

      {state.kind === 'loading' && <p role="status" className="m-0 text-base text-ink-2">Loading the latest run…</p>}

      {state.kind === 'pending' && (
        <section className="panel flex flex-col gap-2 p-4 lg:p-6">
          <h2 className="m-0 text-lg font-semibold">Eval run pending</h2>
          <p className="m-0 text-base text-ink-2">The first scored run hasn't been published yet. Check back soon.</p>
        </section>
      )}

      {state.kind === 'ready' && <Results run={state.run} />}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="num m-0 text-xl font-semibold tracking-[-0.01em]">{value}</dd>
    </div>
  );
}

function Results({ run }: { run: EvalRun }) {
  const s = run.summary;
  const rows = [...run.perRule].sort((a, b) => a.ruleId.localeCompare(b.ruleId, 'en', { numeric: true }));
  const ratio = (n: number, d: number) => (d ? pct(n / d) : 'Unknown');
  const missed = run.perRule.reduce((n, r) => n + r.fn, 0);
  return (
    <>
      <section aria-labelledby="sum-h" className="panel flex flex-col gap-5 p-4 lg:p-6">
        <h2 id="sum-h" className="m-0 text-lg font-semibold">Summary</h2>
        <dl className="m-0 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Cases passed" value={`${s.passed} of ${s.cases}`} />
          <Stat label="Precision" value={Number.isFinite(s.precision) ? pct(s.precision) : 'Unknown'} />
          <Stat label="Flags missed" value={String(missed)} />
          <Stat label="Recall" value={Number.isFinite(s.recall) ? pct(s.recall) : 'Unknown'} />
        </dl>
        <p className="m-0 text-sm text-ink-2 [overflow-wrap:anywhere]">
          Model {run.model} ({run.provider}) · rules version {run.rulesVersion} · run {ranAt(run.ranAt)}. Precision: of the flags raised, how many were right. Recall: of the flags that should be raised, how many were.
        </p>
      </section>

      <section aria-labelledby="rules-h" className="panel flex flex-col gap-4 p-4 lg:p-6">
        <h2 id="rules-h" className="m-0 text-lg font-semibold">By rule</h2>
        <div tabIndex={0} role="region" aria-label="Per-rule table, scrolls sideways" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <table className="w-full min-w-[600px] border-collapse text-left text-base">
            <caption className="sr-only">True positives, misses and false flags per rule</caption>
            <thead>
              <tr className="text-sm text-ink-2">
                <th scope="col" className="py-2 pr-4 font-medium">Rule</th>
                <th scope="col" className="num py-2 pr-4 text-right font-medium">Caught</th>
                <th scope="col" className="num py-2 pr-4 text-right font-medium">Missed</th>
                <th scope="col" className="num py-2 pr-4 text-right font-medium">False flags</th>
                <th scope="col" className="num py-2 pr-4 text-right font-medium">Precision</th>
                <th scope="col" className="num py-2 text-right font-medium">Recall</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ruleId} className="border-t border-line">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    <span className="font-medium">{r.ruleId}</span> <span className="text-ink-2">{rule(r.ruleId)?.title}</span>
                  </th>
                  <td className="num py-2 pr-4 text-right">{r.tp}</td>
                  <td className="num py-2 pr-4 text-right">{r.fn}</td>
                  <td className="num py-2 pr-4 text-right">{r.fp}</td>
                  <td className="num py-2 pr-4 text-right">{ratio(r.tp, r.tp + r.fp)}</td>
                  <td className={`num py-2 text-right ${r.fn ? 'font-semibold text-ne' : ''}`}>{ratio(r.tp, r.tp + r.fn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="cases-h" className="panel flex flex-col gap-2 p-4 lg:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="cases-h" className="m-0 text-lg font-semibold">By case</h2>
          <a href="https://github.com/DY0810/fundcheck/tree/main/evals" target="_blank" rel="noreferrer" className="text-sm font-medium">
            Every plan and label on GitHub<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
        <ul className="m-0 list-none p-0">
          {run.cases.map((c) => {
            const why = WHY.get(c.id);
            const misses = c.misses.length ? `Missed ${c.misses.join(', ')}.` : '';
            const falses = c.falseFlags.length ? `False flags ${c.falseFlags.join(', ')}.` : '';
            return (
              <li key={c.id} className="flex flex-col gap-1 border-t border-line py-3 first:border-t-0">
                <p className="m-0 flex items-start gap-2 text-base">
                  {c.pass ? <CircleCheck aria-hidden size={18} className="mt-0.5 shrink-0 text-pass" /> : <CircleX aria-hidden size={18} className="mt-0.5 shrink-0 text-ne" />}
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    <span className={`font-medium ${c.pass ? 'text-pass' : 'text-ne'}`}>{c.pass ? 'Pass' : 'Fail'}</span>
                    {' · '}<span className="font-medium">{c.title}</span> <span className="text-sm text-ink-2">({c.id})</span>
                  </span>
                </p>
                {why && <p className="m-0 pl-6 text-sm text-ink-2">Why it's tricky: {why}</p>}
                {(misses || falses || c.fundOk === false || c.eligibleOk === false) && (
                  <p className="m-0 pl-6 text-sm text-ink-2">
                    {[misses, falses, c.fundOk === false ? 'Wrong fund.' : '', c.eligibleOk === false ? 'Eligible amount off.' : ''].filter(Boolean).join(' ')}
                  </p>
                )}
                <p className="num m-0 pl-6 text-xs text-ink-2">{c.model} · {(c.ms / 1000).toFixed(1)} s</p>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
