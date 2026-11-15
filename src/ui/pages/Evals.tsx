import { useEffect, useState } from 'react';
import type { EvalRun } from '../../shared/contracts';
import { pct } from '../lib/format';

type State = { kind: 'loading' } | { kind: 'pending' } | { kind: 'ready'; run: EvalRun };

export default function Evals() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  useEffect(() => {
    fetch('/eval-results.json', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<EvalRun>) : null))
      .then((run: EvalRun | null) => setState(run?.summary?.cases ? { kind: 'ready', run } : { kind: 'pending' }))
      .catch(() => setState({ kind: 'pending' })); // a SPA fallback serves HTML for a missing file: not JSON → pending
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 pt-4 lg:px-8 lg:pt-8">
      <div className="flex max-w-[62ch] flex-col gap-2">
        <h1 className="m-0 text-[1.5rem] leading-[1.875rem] font-semibold sm:text-xl">How accurate are the AI checks?</h1>
        <p className="m-0 text-base text-ink-2">
          We wrote test event plans by hand and wrote down the right answer for each one before running them through FundCheck.
        </p>
      </div>

      {state.kind === 'loading' && <p role="status" className="m-0 text-base text-ink-2">Loading the latest results…</p>}

      {state.kind === 'pending' && (
        <section aria-labelledby="score-h" className="panel flex max-w-[40rem] flex-col gap-2 p-4 lg:p-6">
          <h2 id="score-h" className="m-0 text-lg font-semibold">Results coming soon</h2>
          <p className="m-0 text-base text-ink-2">The test plans haven't been scored yet. Check back soon.</p>
        </section>
      )}

      {state.kind === 'ready' && (
        <section aria-labelledby="score-h" className="panel flex max-w-[40rem] flex-col gap-2 p-6 lg:p-8">
          <h2 id="score-h" className="sr-only">Result</h2>
          <p className="num m-0 text-[3.5rem] leading-none font-semibold tracking-[-0.03em] text-ink lg:text-[4.5rem]">
            {pct(state.run.summary.passed / state.run.summary.cases)}
          </p>
          <p className="num m-0 text-lg text-ink">
            {state.run.summary.passed} of {state.run.summary.cases} test plans checked correctly
          </p>
        </section>
      )}

      <p className="m-0 text-base">
        <a href="https://github.com/DY0810/fundcheck/tree/main/evals" target="_blank" rel="noreferrer">
          See every test plan and its answer on GitHub<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    </main>
  );
}
