import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarClock, Info, LoaderCircle, RotateCcw } from 'lucide-react';
import type { Answers, ApiError, Ask, EventFacts, ExtractedItem, Extraction, ExtractResponse } from '../../shared/contracts';
import { MAX_PLAN_CHARS } from '../../shared/contracts';
import { SAMPLE_PLAN } from '../../fixtures/sample-plan';
import { SAMPLE_EXTRACTION } from '../fixtures/sample-extraction';
import { nextWindow, rules, runCheck, vendors } from '../engine';
import * as api from '../lib/api';
import { date, money, plural, todayIso } from '../lib/format';
import { AskRow, askValue, FactsFields, ItemsTable } from '../components/Extraction';
import { DeadlineCardView, Documents, Flags, FundCard, MoneyCard, PostEvent, Verdict, Vendors } from '../components/Result';
import { DraftPanel } from '../components/DraftPanel';
import { Fold, UsgQuote } from '../components/bits';

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
  const verdictRef = useRef<HTMLHeadingElement>(null);
  const fixRef = useRef<HTMLDetailsElement>(null);
  const today = useMemo(() => todayIso(), []);
  const nextWin = useMemo(() => nextWindow(today), [today]);

  const check = useMemo(
    () => (extraction ? runCheck({ extraction, answers, today, rules, vendors }) : null),
    [extraction, answers, today],
  );

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
    if (fixRef.current) fixRef.current.open = false;
    toVerdict.current = true;
  }

  // The verdict is the answer: once a new extraction renders, put it at the top of the screen and move focus there.
  const toVerdict = useRef(false);
  useEffect(() => {
    const h = verdictRef.current;
    if (!toVerdict.current || !h) return;
    toVerdict.current = false;
    h.closest('section')?.scrollIntoView({ block: 'start' });
    h.focus({ preventScroll: true });
  }, [extraction]);

  function openFix() {
    const d = fixRef.current;
    if (!d) return;
    d.open = true;
    d.scrollIntoView({ block: 'start' });
    d.querySelector('summary')?.focus({ preventScroll: true });
  }

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
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-4 lg:gap-16 lg:px-8">
      {/* ---------- Paste ---------- */}
      <section aria-labelledby="paste-h" className="grid grid-cols-1 gap-6 pt-4 lg:grid-cols-12 lg:gap-8 lg:pt-8">
        <div className="flex flex-col gap-5 lg:col-span-8">
          <div className="flex flex-col gap-2">
            <h1 id="paste-h" className="m-0 text-[1.75rem] leading-[2.125rem] font-semibold tracking-[-0.02em] lg:text-[2.5rem] lg:leading-[2.875rem]">Pre-check your USG funding application.</h1>
            <p className="m-0 max-w-[62ch] text-base text-ink-2">
              Paste your event plan. FundCheck reads it, checks it against the USG Funding Department's rules, and shows what isn't eligible, what's over a cap and which documents you need.
            </p>
          </div>
          {nextWin && (
            <div className="flex flex-col gap-2 rounded-panel border border-line bg-panel px-4 py-3">
              <p className="num m-0 flex items-start gap-2 text-base text-ink">
                <CalendarClock aria-hidden size={18} className="mt-0.5 shrink-0 text-brand" />
                <span>
                  <span className="font-semibold">Next application window: </span>
                  {nextWin === today ? 'today, ' : ''}{date(nextWin)}, 8:00 AM to 11:59 PM
                </span>
              </p>
              <details className="group pl-[26px]">
                <summary className="cursor-pointer text-sm font-medium text-brand [&::-webkit-details-marker]:hidden">
                  Our estimate. See USG's wording
                </summary>
                <div className="mt-2 flex flex-col gap-2">
                  <UsgQuote id="R23" />
                  <p className="m-0 text-sm text-ink-2">FundCheck skips Wednesdays that fall in USC's academic breaks and holidays. Confirm on USG's Funding Application Deadlines sheet.</p>
                </div>
              </details>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="plan" className="label">Your event plan</label>
              <span className={`num text-sm ${over ? 'font-semibold text-ne' : 'text-ink-2'}`} aria-live={over ? 'polite' : 'off'}>
                {plan.length.toLocaleString()} / {MAX_PLAN_CHARS.toLocaleString()} characters
              </span>
            </div>
            <textarea
              id="plan"
              className="field min-h-40 resize-y py-3 leading-6 lg:min-h-56"
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
            <div role="alert" className="flex flex-col gap-3 rounded-panel bg-ne-bg p-4 text-ne sm:flex-row sm:items-center sm:justify-between">
              <p className="m-0 text-base">{error.message}</p>
              {error.code !== 'empty' && error.code !== 'too_long' && (
                <button type="button" className="btn btn-secondary shrink-0" onClick={() => submit()}>
                  <RotateCcw aria-hidden size={16} /> Try again
                </button>
              )}
            </div>
          )}
        </div>
        <aside aria-label="What FundCheck checks" className="flex flex-col gap-3 text-base text-ink-2 lg:col-span-4 lg:pt-[4.5rem]">
          <p className="m-0 font-medium text-ink">What it checks</p>
          <ul className="m-0 flex list-disc flex-col gap-2 pl-5 marker:text-control">
            <li>Items USG's rules don't fund, quoted from the Guidelines</li>
            <li>The $4,000 venue cap, $35 food limit and $8,000 yearly cap</li>
            <li>Which fund to apply to, and a deadline estimate</li>
            <li>The documents to attach, with the exact file names</li>
          </ul>
          <p className="m-0 text-sm">
            AI reads your plan. Every dollar and date is computed by code you can{' '}
            <a href="https://github.com/DY0810/fundcheck" target="_blank" rel="noreferrer">read on GitHub<span className="sr-only"> (opens in a new tab)</span></a>.
          </p>
        </aside>
      </section>

      {/* ---------- Loading ---------- */}
      {busy && !extraction && (
        <section aria-label="Reading your plan" className="flex flex-col gap-4">
          <p role="status" className="m-0 text-base font-medium text-ink">Reading your plan…</p>
          <div className="panel flex flex-col gap-3 p-4 lg:p-6" aria-hidden>
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

      {extraction && check && source && (
        <div className={`flex flex-col gap-4 lg:gap-6 ${busy ? 'opacity-60' : ''}`}>
          {/* ---------- Verdict, then flags ---------- */}
          <section aria-labelledby="result-h" className="flex scroll-mt-4 flex-col gap-4 lg:gap-6">
            <Verdict
              check={check}
              headingRef={verdictRef}
              note={
                <p className="m-0 text-sm text-ink-2">
                  {source.kind === 'live' && source.provider === 'workers-ai' && 'Read by our backup AI service. Double-check what we read.'}
                  {source.kind === 'fixture' && 'Sample loaded without an AI call.'}
                  {source.kind === 'cached' && "AI didn't respond: a saved reading of the sample. Checks run live."}
                </p>
              }
              nav={
                <nav aria-label="Pre-check sections" className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 text-sm font-medium">
                  {impact.length > 0 && <a href="#asks-h">{open ? `${plural(open, 'answer')} could change this` : 'Your answers'}</a>}
                  <a href="#docs-h">Documents</a>
                  <a href="#draft-h">Form answers and budget CSV</a>
                  <button type="button" className="cursor-pointer border-0 bg-transparent p-0 font-medium text-brand underline underline-offset-2" onClick={openFix}>
                    Fix what we read ({plural(extraction.items.length, 'line')})
                  </button>
                </nav>
              }
            />
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
              <div className="flex flex-col gap-4 lg:col-span-8 lg:gap-6">
                <Flags check={check} extraction={extraction} />
              </div>
              <div className="flex animate-reveal flex-col gap-4 [animation-delay:160ms] lg:col-span-4 lg:gap-6">
                {impact.length > 0 && (
                  <section aria-labelledby="asks-h" className="panel flex scroll-mt-4 flex-col gap-1 p-4 lg:p-5">
                    <h3 id="asks-h" className="m-0 text-lg font-semibold">{open ? `${plural(open, 'answer')} could change this` : 'Your answers'}</h3>
                    <p className="m-0 text-sm text-ink-2">Each answer reruns the pre-check right away.</p>
                    {askRows(impact)}
                  </section>
                )}
                <MoneyCard check={check} answers={answers} />
                <DeadlineCardView check={check} />
                <FundCard check={check} />
              </div>
            </div>
          </section>

          {/* ---------- What we read, folded ---------- */}
          <Fold
            detailsRef={fixRef}
            title="Fix what we read"
            id="read-h"
            meta={<span className="num">{extraction.facts.name ?? 'Unnamed event'} · {plural(extraction.items.length, 'line')} · {money(check.money.totalCents)}</span>}
          >
            <p className="m-0 text-base text-ink-2">Fix anything we got wrong. The pre-check above reruns as you type.</p>
            <section aria-labelledby="facts-h" className="flex flex-col gap-4">
              <h3 id="facts-h" className="m-0 text-base font-semibold">Event</h3>
              <FactsFields facts={extraction.facts} onChange={patchFacts} />
            </section>
            <section aria-labelledby="items-h" className="flex flex-col gap-4 border-t border-line pt-4">
              <h3 id="items-h" className="m-0 text-base font-semibold">Line items</h3>
              <ItemsTable items={extraction.items} onChange={patchItem} onAdd={addItem} onRemove={removeItem} />
            </section>
          </Fold>

          <Documents check={check}>
            {paperwork.length > 0 && (
              <div className="flex flex-col gap-1 border-t border-line pt-4">
                <p className="m-0 text-base font-medium text-ink">For the form</p>
                {askRows(paperwork)}
              </div>
            )}
          </Documents>
          <DraftPanel extraction={extraction} check={check} answers={answers} />
          <Vendors check={check} answers={answers} onOverride={setVendorOverride} />
          <PostEvent check={check} />
        </div>
      )}
    </main>
  );
}
