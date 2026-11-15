import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarClock, Info, LoaderCircle, RotateCcw } from 'lucide-react';
import type { Answers, ApiError, Ask, CheckInput, EventFacts, ExtractedItem, Extraction, ExtractResponse } from '../../shared/contracts';
import { MAX_PLAN_CHARS } from '../../shared/contracts';
import { SAMPLE_PLAN } from '../../fixtures/sample-plan';
import { SAMPLE_EXTRACTION } from '../fixtures/sample-extraction';
import { applyFixes, nextWindow, proposeFixes, rules, runCheck, vendors } from '../engine';
import * as api from '../lib/api';
import { date, money, plural, todayIso } from '../lib/format';
import { AskRow, askValue, FactsFields, ItemsTable } from '../components/Extraction';
import { DeadlineBody, docsMeta, Documents, Flags, FundBody, headline, MoneyBody, moneyMeta, Verdict, Vendors, vendorsMeta } from '../components/Result';
import { type Choice, FixReview, Handoff, type Step, StepNav } from '../components/Steps';
import { Fold, Rows, UsgQuote } from '../components/bits';

type Source = { kind: 'live' | 'cached' | 'fixture'; provider: Extract<ExtractResponse, { ok: true }>['provider'] };
// ?fixture=1 skips the API with the sample; dev builds also accept worst | empty | 40 (break-ui data).
const FIXTURE_KEY = new URLSearchParams(location.search).get('fixture');
const loadWorst = () => import('../fixtures/worst-case');
const FIXTURES: Record<string, () => Promise<Extraction>> = import.meta.env.DEV
  ? { worst: () => loadWorst().then((m) => m.WORST), empty: () => loadWorst().then((m) => m.EMPTY), 40: () => loadWorst().then((m) => m.FORTY) }
  : {};
// Questions that only fill in the form; they never change the verdict, so they sit with the documents.
const PAPERWORK = new Set(['uepaNumber', 'modulesCompleted', 'otherFundingSources']);

export default function Check() {
  const [plan, setPlan] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [kept, setKept] = useState<Ask[]>([]); // asks the user has touched stay on screen after the engine drops them
  const [step, setStep] = useState<Step>(1);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLElement>(null);
  const today = useMemo(() => todayIso(), []);
  const nextWin = useMemo(() => nextWindow(today), [today]);

  const input = useMemo<CheckInput | null>(() => (extraction ? { extraction, answers, today, rules, vendors } : null), [extraction, answers, today]);
  const check = useMemo(() => (input ? runCheck(input) : null), [input]);
  // Fixes are only offered: nothing is applied until the officer picks "Apply" (or "Approve all").
  const fixes = useMemo(() => (input && check ? proposeFixes(input, check) : []), [input, check]);
  const approved = fixes.filter((f) => choices[f.id] === 'apply').map((f) => f.id);
  const approvedKey = approved.join('|');
  const resolution = useMemo(
    () => (input && check ? applyFixes(input, check, approvedKey ? approvedKey.split('|') : []) : null),
    [input, check, approvedKey],
  );
  // An edit or an answer re-runs the check; choices for fixes that no longer exist are dropped.
  const fixKey = fixes.map((f) => f.id).join('|');
  useEffect(() => {
    setChoices((c) => {
      const live = Object.fromEntries(Object.entries(c).filter(([id]) => fixKey.split('|').includes(id)));
      return Object.keys(live).length === Object.keys(c).length ? c : live;
    });
  }, [fixKey]);

  async function submit(text = plan) {
    if (!text.trim()) return setError({ code: 'empty', message: 'Paste your event plan first, or try the sample.' });
    if (text.length > MAX_PLAN_CHARS) return setError({ code: 'too_long', message: `Your plan is over ${MAX_PLAN_CHARS.toLocaleString()} characters. Trim it and try again.` });
    setBusy(true);
    setError(null);
    const res = FIXTURE_KEY != null
      ? ({ ok: true, extraction: await (FIXTURES[FIXTURE_KEY]?.() ?? SAMPLE_EXTRACTION), source: 'fixture', provider: 'cache' } as const)
      : await api.extract(text);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setExtraction(structuredClone(res.extraction));
    setSource({ kind: res.source, provider: res.provider });
    setAnswers({});
    setKept([]);
    setChoices({});
    setStep(1);
    toStep.current = true;
  }

  // A new result or a new step: put the step at the top of the screen and move focus to its heading.
  const toStep = useRef(false);
  useEffect(() => {
    if (!toStep.current || !headingRef.current) return;
    toStep.current = false;
    window.scrollTo(0, 0); // the step indicator sits above the step, so show the page from the top
    headingRef.current.focus({ preventScroll: true });
  }, [extraction, step]);
  const go = (s: Step) => { toStep.current = true; setStep(s); };

  // "Edit the plan" opens the editor on step 1; "Check another plan" brings the paste box back with the text kept.
  const planRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLDetailsElement>(null);
  const [editReq, setEditReq] = useState(0);
  useEffect(() => {
    const d = editRef.current;
    if (!editReq || !d) return;
    d.open = true;
    d.scrollIntoView({ block: 'start' });
    d.querySelector('summary')?.focus({ preventScroll: true });
  }, [editReq]);
  const editPlan = () => { setStep(1); setEditReq((n) => n + 1); };
  const toPaste = useRef(false);
  useEffect(() => {
    if (extraction || !toPaste.current) return;
    toPaste.current = false;
    window.scrollTo(0, 0);
    planRef.current?.focus();
  }, [extraction]);
  const newPlan = () => { toPaste.current = true; setExtraction(null); setSource(null); setChoices({}); setStep(1); };

  // On a phone the skeleton renders below "What it checks"; bring it on screen so the wait shows progress.
  useEffect(() => {
    if (busy && !extraction) loadingRef.current?.scrollIntoView({ block: 'nearest' });
  }, [busy, extraction]);

  const patchItem = (id: string, patch: Partial<ExtractedItem>) =>
    setExtraction((x) => x && { ...x, items: x.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const patchFacts = (patch: Partial<EventFacts>) => setExtraction((x) => x && { ...x, facts: { ...x.facts, ...patch } });
  const addItem = () =>
    setExtraction((x) => {
      if (!x) return x;
      const n = Math.max(0, ...x.items.map((i) => Number(i.id.slice(1)) || 0)) + 1;
      return { ...x, items: [...x.items, { id: `i${n}`, description: '', vendor: null, quantity: null, unitCostCents: null, totalCents: null, category: 'other', matches: [], evidence: '' }] };
    });
  const removeItem = (id: string) => setExtraction((x) => x && { ...x, items: x.items.filter((i) => i.id !== id) });

  function answer(ask: Ask, v: unknown) {
    setKept((k) => (k.some((a) => a.id === ask.id) ? k : [...k, ask]));
    if (ask.id.startsWith('match:')) {
      setAnswers((a) => ({ ...a, matchAnswers: { ...a.matchAnswers, [ask.id.slice(6)]: v as boolean } }));
    } else if (ask.id.startsWith('facts.')) {
      patchFacts({ [ask.id.slice(6)]: v } as Partial<EventFacts>);
    } else {
      setAnswers((a) => ({ ...a, [ask.id]: v }));
    }
  }
  const setVendorOverride = (itemId: string, on: boolean) =>
    setAnswers((a) => {
      const next = { ...a.vendorOnList };
      if (on) next[itemId] = true;
      else delete next[itemId];
      return { ...a, vendorOnList: next };
    });

  const asks = check ? [...kept.filter((k) => !check.asks.some((a) => a.id === k.id)), ...check.asks] : [];
  const impact = asks.filter((a) => !PAPERWORK.has(a.id));
  const paperwork = asks.filter((a) => PAPERWORK.has(a.id));
  const open = check ? check.asks.filter((a) => !PAPERWORK.has(a.id)).length : 0;
  const over = plan.length > MAX_PLAN_CHARS;
  const askRows = (list: Ask[]) => (
    <ul className="m-0 list-none p-0 @container">
      {list.map((a) => <AskRow key={a.id} ask={a} value={askValue(a, answers, extraction!.facts)} onAnswer={(v) => answer(a, v)} />)}
    </ul>
  );

  return (
    <main className="mx-auto flex w-full max-w-page flex-col gap-12 px-4 lg:gap-16 lg:px-8">
      {/* ---------- Paste: the whole screen until a result exists, then one row ---------- */}
      {!extraction ? (
        <section aria-labelledby="paste-h" className="flex max-w-main flex-col gap-6 pt-4 lg:pt-10">
          <div className="flex flex-col gap-3">
            <h1 id="paste-h" className="m-0 text-xl font-semibold tracking-[-0.02em] lg:text-2xl">Pre-check your USG funding application.</h1>
            <p className="m-0 max-w-[62ch] text-base text-ink-2">
              Paste your event plan. FundCheck reads it, checks it against the USG Funding Department's rules, and shows what isn't eligible, what's over a cap and which documents you need.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="plan" className="label">Your event plan</label>
              <span className={`num text-sm ${over ? 'font-semibold text-ne' : 'text-ink-2'}`} aria-live={over ? 'polite' : 'off'}>
                {plan.length.toLocaleString()} / {MAX_PLAN_CHARS.toLocaleString()} characters
              </span>
            </div>
            <textarea
              id="plan"
              ref={planRef}
              className="field min-h-36 resize-y py-3 leading-6 lg:min-h-52"
              value={plan}
              aria-describedby="privacy"
              aria-invalid={over || undefined}
              placeholder={'Event name, date, place and expected attendance, then each expense with its vendor and cost.\nExample: "Catering from Trojan Grounds $1,200"'}
              onChange={(e) => setPlan(e.target.value)}
            />
            <p id="privacy" className="m-0 flex items-center gap-1.5 text-sm text-ink-2">
              <Info aria-hidden size={14} className="shrink-0" />
              Nothing you paste is stored. Don't paste traveller details.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button type="button" className="btn btn-primary" onClick={() => submit()} disabled={busy || over} aria-busy={busy}>
              {busy ? <LoaderCircle aria-hidden size={18} className="animate-spin" /> : null}
              Check my plan
              {!busy && <ArrowRight aria-hidden size={18} />}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => { setPlan(SAMPLE_PLAN); submit(SAMPLE_PLAN); }}
            >
              Try the Bovard dance showcase sample
            </button>
          </div>
          {error && (
            <div role="alert" className="flex flex-col gap-3 rounded-panel border border-control bg-panel p-4 text-ink sm:flex-row sm:items-center sm:justify-between">
              <p className="m-0 text-base">{error.message}</p>
              {error.code !== 'empty' && error.code !== 'too_long' && (
                <button type="button" className="btn btn-secondary shrink-0" onClick={() => submit()}>
                  <RotateCcw aria-hidden size={16} /> Try again
                </button>
              )}
            </div>
          )}
          {nextWin && (
            <div className="flex flex-col gap-1">
              <p className="num m-0 flex items-start gap-2 text-base text-ink">
                <CalendarClock aria-hidden size={18} className="mt-0.5 shrink-0 text-ink-2" />
                <span>
                  <span className="font-semibold">Next application window: </span>
                  {nextWin === today ? 'today, ' : ''}{date(nextWin)}, 8:00 AM to 11:59 PM
                </span>
              </p>
              <details className="group pl-[26px]">
                <summary className="inline-flex min-h-target cursor-pointer items-center text-sm font-medium text-brand underline underline-offset-3 [&::-webkit-details-marker]:hidden">
                  Our estimate. See USG's wording
                </summary>
                <div className="mt-1 flex flex-col gap-2">
                  <UsgQuote id="R23" />
                  <p className="m-0 text-sm text-ink-2">FundCheck skips Wednesdays that fall in USC's academic breaks and holidays. Confirm on USG's Funding Application Deadlines sheet.</p>
                </div>
              </details>
            </div>
          )}
          <Fold title="What it checks">
            <ul className="m-0 flex list-disc flex-col gap-2 pl-5 text-base text-ink-2 marker:text-control">
              <li>Items USG's rules don't fund, quoted from the Guidelines</li>
              <li>The $4,000 venue cap, $35 food limit and $8,000 yearly cap</li>
              <li>Which fund to apply to, and a deadline estimate</li>
              <li>The documents to attach, with the exact file names</li>
            </ul>
            <p className="m-0 text-sm text-ink-2">
              AI reads your plan. Every dollar and date is computed by code you can{' '}
              <a href="https://github.com/DY0810/fundcheck" target="_blank" rel="noreferrer">read on GitHub<span className="sr-only"> (opens in a new tab)</span></a>.
            </p>
          </Fold>
        </section>
      ) : (
        <div className="flex max-w-main flex-col gap-1 pt-2 lg:pt-4">
          <h1 className="sr-only">Pre-check of {extraction.facts.name ?? 'your event plan'}</h1>
          <div className="flex flex-wrap items-center justify-between gap-x-4">
            <p className="m-0 hidden min-w-0 truncate text-sm font-medium text-ink sm:block">{extraction.facts.name ?? 'Your event plan'}</p>
            <div className="-mr-2 ml-auto flex items-center">
              <button type="button" className="btn btn-ghost text-sm" onClick={editPlan}>Edit the plan</button>
              <button type="button" className="btn btn-ghost text-sm" onClick={newPlan}>Check another plan</button>
            </div>
          </div>
          <StepNav step={step} onGo={go} noFixes={!fixes.length} />
        </div>
      )}

      {/* ---------- Loading ---------- */}
      {busy && !extraction && (
        <section ref={loadingRef} aria-label="Reading your plan" className="flex flex-col gap-4">
          <p role="status" className="m-0 text-base font-medium text-ink">Reading your plan…</p>
          <div className="panel flex flex-col gap-3 p-card lg:p-card-lg" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-10 flex-[3] animate-pulse-soft rounded-ctl bg-inset" />
                <div className="hidden h-10 flex-[2] animate-pulse-soft rounded-ctl bg-inset sm:block" />
                <div className="h-10 flex-1 animate-pulse-soft rounded-ctl bg-inset" />
              </div>
            ))}
          </div>
        </section>
      )}
      {busy && extraction && <p role="status" className="sr-only">Reading your plan…</p>}

      {extraction && check && source && resolution && (
        <div ref={resultRef} className={`-mt-8 flex max-w-main scroll-mt-4 flex-col gap-6 lg:-mt-12 lg:gap-group ${busy ? 'opacity-60' : ''}`}>

          {step === 1 && (
            <>
              <section aria-labelledby="result-h" className="flex flex-col gap-6 lg:gap-group">
                <Verdict
                  check={check}
                  headingRef={headingRef}
                  note={
                    <p className="m-0 text-sm text-ink-2">
                      {source.kind === 'live' && source.provider === 'workers-ai' && 'Read by our backup AI service. Double-check what we read.'}
                      {source.kind === 'fixture' && 'Sample loaded without an AI call.'}
                      {source.kind === 'cached' && "AI didn't respond: a saved reading of the sample. Checks run live."}
                    </p>
                  }
                  action={
                    <button type="button" className="btn btn-primary shrink-0" onClick={() => go(fixes.length ? 2 : 3)}>
                      {fixes.length ? 'Review fixes' : 'Continue'} <ArrowRight aria-hidden size={18} />
                    </button>
                  }
                />
                <Flags check={check} extraction={extraction} />
              </section>
              <Rows label="Details">
                {impact.length > 0 && (
                  <Fold flat title="Questions" id="asks-h" meta={open ? `${open} could change this` : 'All answered'}>
                    <p className="m-0 text-sm text-ink-2">Each answer reruns the pre-check right away.</p>
                    {askRows(impact)}
                  </Fold>
                )}
                <Fold flat title="Money" meta={moneyMeta(check.money, check.flags.find((f) => f.ruleId === 'R9')?.amountCents ?? 0)}>
                  <MoneyBody check={check} answers={answers} />
                </Fold>
                <Fold flat title="Deadline" meta={headline(check.deadline).replace(/\.$/, '') + (check.deadline.status === 'safe' || check.deadline.status === 'next_open' ? ' (estimate)' : '')}>
                  <DeadlineBody check={check} />
                </Fold>
                <Fold flat title="Fund" meta={check.fund.label}>
                  <FundBody check={check} />
                </Fold>
                <Fold flat title="Documents" meta={docsMeta(check)}>
                  <Documents check={check} />
                </Fold>
                <Fold flat title="Vendors" meta={vendorsMeta(check)}>
                  <Vendors check={check} answers={answers} onOverride={setVendorOverride} />
                </Fold>
                <Fold flat title="Edit the plan" id="read-h" detailsRef={editRef} meta={`${plural(extraction.items.length, 'line')}, ${money(check.money.totalCents)}`}>
                  <p className="m-0 text-base text-ink-2">Fix anything we got wrong. The pre-check reruns as you type.</p>
                  <section aria-labelledby="facts-h" className="flex flex-col gap-4">
                    <h3 id="facts-h" className="m-0 text-base font-semibold">Event</h3>
                    <FactsFields facts={extraction.facts} onChange={patchFacts} />
                  </section>
                  <section aria-labelledby="items-h" className="flex flex-col gap-4 border-t border-line pt-4">
                    <h3 id="items-h" className="m-0 text-base font-semibold">Line items</h3>
                    <ItemsTable items={extraction.items} onChange={patchItem} onAdd={addItem} onRemove={removeItem} />
                  </section>
                </Fold>
              </Rows>
            </>
          )}

          {step === 2 && (
            <FixReview
              fixes={fixes}
              choices={choices}
              onChoose={(id, c) => setChoices((x) => ({ ...x, [id]: c }))}
              onApproveAll={() => setChoices((x) => ({ ...x, ...Object.fromEntries(fixes.filter((f) => f.auto).map((f) => [f.id, 'apply' as const])) }))}
              requestCents={resolution.requestCents}
              totalCents={check.money.totalCents}
              headingRef={headingRef}
              onBack={() => go(1)}
              onContinue={() => go(3)}
            />
          )}

          {step === 3 && (
            <Handoff
              resolution={resolution}
              original={extraction}
              answers={answers}
              unanswered={open}
              headingRef={headingRef}
              onBack={() => go(fixes.length ? 2 : 1)}
              backLabel={fixes.length ? 'Back to the fixes' : 'Back to what we found'}
              documents={<Documents check={resolution.check} />}
              paperwork={paperwork.length > 0 && (
                <div className="flex flex-col gap-1 border-t border-line pt-4">
                  <p className="m-0 text-base font-medium text-ink">For the form</p>
                  {askRows(paperwork)}
                </div>
              )}
            />
          )}
        </div>
      )}
    </main>
  );
}
