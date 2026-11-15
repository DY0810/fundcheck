import { useEffect, useState } from 'react';
import { CircleCheck, CircleX } from 'lucide-react';
import type { EvalCase, EvalCaseResult, EvalRun } from '../../shared/contracts';
import casesJson from '../../../evals/cases.json';
import { rulesFile } from '../lib/rules';
import { money, pct, plural } from '../lib/format';

type State = { kind: 'loading' } | { kind: 'pending' } | { kind: 'ready'; run: EvalRun };

const CASES = casesJson as unknown as EvalCase[];
const byId = new Map(CASES.map((c) => [c.id, c]));
// Case titles carry a developer prefix ("Clean: …"); the page shows the plain part.
const plainTitle = (t: string) => t.replace(/^(Clean|Ambiguous|Judgment call):\s*(.)/, (_, _p, ch: string) => ch.toUpperCase());

// The split the case file supports: a plan with expected flags has something to catch; a plan with none is either
// labelled clean, or ambiguous (the right move is a question to the officer, which never counts as a flag).
const GROUPS = [
  { key: 'catch', label: 'plans with something to catch', detail: 'An item USG does not fund, a cap that trims the request, a blackout date, or a detail USG will check.' },
  { key: 'clean', label: 'clean plans that should raise nothing', detail: 'Many include look-alikes, such as rented gear or a shop with “Balloon” in its name.' },
  { key: 'unclear', label: 'unclear plans', detail: 'The plan could be read either way, so the right move is to ask the officer, not to flag.' },
] as const;
const groupOf = (c: EvalCase) => (c.expect.mustFlag.length ? 'catch' : /^Ambiguous:/.test(c.title) ? 'unclear' : 'clean');
const COUNTS = GROUPS.map((g) => ({ ...g, n: CASES.filter((c) => groupOf(c) === g.key).length }));

// Topics: the titles of every rule at least one test plan expects to see flagged, in the rules file's order.
const tested = new Set(CASES.flatMap((c) => c.expect.mustFlag.map((m) => m.ruleId)));
const TOPICS = rulesFile.rules.filter((r) => tested.has(r.id)).map((r) => r.title);

// Example cards: one indirect phrasing, one clean plan with a decoy, one unclear plan, one with money math.
const received = (c: EvalCase) => money(c.answers.receivedThisYearCents ?? 0);
const EXAMPLES: { id: string; answer: (c: EvalCase) => string; did: (c: EvalCase) => string }[] = [
  {
    id: 'e03',
    answer: () => 'The filled, weighted Mylar letters are balloons, which USG does not fund, even though the plan never says “balloon”. The streamers are fine.',
    did: () => 'Flagged the Mylar letters as balloons and left the streamers alone.',
  },
  {
    id: 'e92',
    answer: () => 'Nothing to flag. The tablecloths come from a shop called Balloon Celebrations, but they are linens, not balloons.',
    did: () => 'Raised no flags.',
  },
  {
    id: 'e17',
    answer: () => 'Unclear. Dinner for musicians who play for free may or may not count as paying performers, so FundCheck should ask, not flag.',
    did: () => 'Raised no flags and asked whether the musicians’ dinner counts as paying a performer.',
  },
  {
    id: 'e45',
    answer: (c) => `The club has already received ${received(c)} this year, so only ${money(c.expect.eligibleCents ?? 0)} of this request fits under USG’s $8,000 yearly limit.`,
    did: (c) => `Cut the request to ${money(c.expect.eligibleCents ?? 0)} and said why.`,
  },
];

// One honest sentence per known miss; a different case that fails after a future run falls back to its title.
const MISSES: Record<string, string> = {
  e06: 'A “suggested $5 donation” collected at check-in is a ticket sale. FundCheck asked the officer about it instead of flagging it.',
  e87: 'FundCheck read the club T-shirts as goods the club keeps, so it never checked that T-shirts come from a USC Trademarks-authorized vendor.',
};

export default function Evals() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  useEffect(() => {
    fetch('/eval-results.json', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<EvalRun>) : null))
      .then((run: EvalRun | null) => setState(run?.summary?.cases ? { kind: 'ready', run } : { kind: 'pending' }))
      .catch(() => setState({ kind: 'pending' })); // a SPA fallback serves HTML for a missing file: not JSON → pending
  }, []);

  const results = state.kind === 'ready' ? new Map(state.run.cases.map((r) => [r.id, r])) : null;
  const failed: EvalCaseResult[] = state.kind === 'ready' ? state.run.cases.filter((r) => !r.pass) : [];

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 pt-4 pb-4 lg:px-8 lg:pt-8">
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

      <section aria-labelledby="how-h" className="flex max-w-[62ch] flex-col gap-4">
        <h2 id="how-h" className="m-0 text-lg font-semibold">How the test works</h2>
        <ol className="m-0 flex list-none flex-col gap-4 p-0">
          {[
            'We wrote each event plan by hand, the way an officer would type it: shorthand, emoji, pasted emails and all.',
            'Before running anything, we wrote down the right answer for each plan: what should be flagged and what should not.',
            'A plan counts as correct only when every flag is right: nothing missed, and nothing flagged that should not be.',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span aria-hidden className="num flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-tint text-sm font-semibold text-brand-press">
                {i + 1}
              </span>
              <p className="m-0 pt-0.5 text-base">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="cover-h" className="flex flex-col gap-5">
        <h2 id="cover-h" className="m-0 text-lg font-semibold">What the test plans cover</h2>
        <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-3">
          {COUNTS.map((g) => (
            <li key={g.key} className="panel flex flex-col gap-1 p-4 lg:p-5">
              <p className="m-0 text-base">
                <span className="num text-xl font-semibold">{g.n}</span> {g.label}
              </p>
              <p className="m-0 text-sm text-ink-2">{g.detail}</p>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3">
          <h3 className="m-0 text-base font-semibold">Topics the test plans check</h3>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {TOPICS.map((t) => (
              <li key={t} className="rounded-full bg-inset px-3 py-1 text-sm text-ink">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {results && (
        <section aria-labelledby="ex-h" className="flex flex-col gap-5">
          <h2 id="ex-h" className="m-0 text-lg font-semibold">A few of the plans</h2>
          <ul className="m-0 grid list-none gap-4 p-0 lg:grid-cols-2">
            {EXAMPLES.flatMap(({ id, answer, did }) => {
              const c = byId.get(id);
              const r = results.get(id);
              if (!c || !r) return [];
              return [
                <li key={id} className="panel flex flex-col gap-4 p-4 lg:p-6">
                  <h3 className="m-0 text-base font-semibold">{plainTitle(c.title)}</h3>
                  <figure className="m-0 flex flex-col gap-1.5">
                    <figcaption className="text-sm text-ink-2">The test plan, as written:</figcaption>
                    <p className="m-0 rounded-panel bg-inset px-4 py-3 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{c.plan}</p>
                  </figure>
                  <p className="m-0 text-base">
                    <span className="font-semibold">The right answer: </span>
                    {answer(c)}
                  </p>
                  <Outcome pass={r.pass} text={r.pass ? did(c) : MISSES[id] ?? 'FundCheck got this one wrong.'} />
                </li>,
              ];
            })}
          </ul>
        </section>
      )}

      {state.kind === 'ready' && (
        <section aria-labelledby="miss-h" className="flex max-w-[62ch] flex-col gap-4">
          <h2 id="miss-h" className="m-0 text-lg font-semibold">The ones it got wrong</h2>
          {failed.length === 0 ? (
            <p className="m-0 text-base text-ink-2">None in the latest run.</p>
          ) : (
            <>
              <p className="m-0 text-base text-ink-2">
                {plural(failed.length, 'test plan')} out of {state.run.summary.cases}:
              </p>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {failed.map((r) => (
                  <li key={r.id} className="panel flex flex-col gap-1 p-4">
                    <p className="m-0 text-base font-semibold">{plainTitle(byId.get(r.id)?.title ?? r.title)}</p>
                    <Outcome pass={false} text={MISSES[r.id] ?? 'FundCheck got this one wrong.'} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <div className="flex max-w-[62ch] flex-col gap-2">
        <p className="m-0 text-base text-ink-2">
          These are hand-written test plans, not real applications, so the score is a check on FundCheck, not a promise.
        </p>
        <p className="m-0 text-base">
          <a href="https://github.com/DY0810/fundcheck/tree/main/evals" target="_blank" rel="noreferrer">
            See every test plan and its answer on GitHub<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      </div>
    </main>
  );
}

function Outcome({ pass, text }: { pass: boolean; text: string }) {
  const Icon = pass ? CircleCheck : CircleX;
  return (
    <p className="m-0 flex gap-2 text-base">
      <Icon aria-hidden size={18} className={`mt-0.5 shrink-0 ${pass ? 'text-pass' : 'text-ne'}`} />
      <span>
        <span className="font-semibold">{pass ? 'What FundCheck did: ' : 'What went wrong: '}</span>
        {text}
      </span>
    </p>
  );
}
