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
    <main className="mx-auto flex w-full max-w-page flex-col gap-8 px-4 pt-4 lg:px-8 lg:pt-8">
      {state.kind === 'loading' && <p role="status" className="m-0 text-base text-ink-2">Loading the latest results…</p>}

      {state.kind === 'pending' && (
        <section aria-labelledby="score-h" className="panel flex max-w-main flex-col gap-2 p-card lg:p-card-lg">
          <h1 id="score-h" className="m-0 text-lg font-semibold">Results coming soon</h1>
          <p className="m-0 text-base text-ink-2">The test plans haven't been scored yet. Check back soon.</p>
        </section>
      )}

      {state.kind === 'ready' && (
        <section aria-labelledby="score-h" className="panel flex max-w-main flex-col gap-2 p-6 lg:p-8">
          <h1 id="score-h" className="num m-0 text-[2.5rem] leading-none font-semibold tracking-[-0.03em] text-ink sm:text-[3.5rem] lg:text-[4.5rem]">
            {pct(state.run.summary.passed / state.run.summary.cases)} Accuracy
          </h1>
          <p className="num m-0 text-lg text-ink-2">
            {state.run.summary.passed} of {state.run.summary.cases} test plans checked correctly
          </p>
        </section>
      )}
    </main>
  );
}
