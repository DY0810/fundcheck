import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Info, LoaderCircle, RotateCcw } from 'lucide-react';
import type { Answers, ApiError, Ask, EventFacts, ExtractedItem, Extraction } from '../../shared/contracts';
import { MAX_PLAN_CHARS } from '../../shared/contracts';
import { SAMPLE_PLAN } from '../../fixtures/sample-plan';
import { SAMPLE_EXTRACTION } from '../fixtures/sample-extraction';
import { rules, runCheck, vendors } from '../engine';
import * as api from '../lib/api';
import { todayIso } from '../lib/format';
import { AskRow, askValue, FactsFields, ItemsTable } from '../components/Extraction';
import { DeadlineCardView, Documents, Flags, FundCard, MoneyCard, PostEvent, Summary, Vendors } from '../components/Result';
import { DraftPanel } from '../components/DraftPanel';

type Source = { kind: 'live' | 'cached' | 'fixture'; model: string; ms: number };
const FIXTURE = new URLSearchParams(location.search).has('fixture');

export default function Check() {
  const [plan, setPlan] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [kept, setKept] = useState<Ask[]>([]); // asks the user has touched stay on screen after the engine drops them
  const readRef = useRef<HTMLHeadingElement>(null);
  const today = useMemo(() => todayIso(), []);

  const check = useMemo(
    () => (extraction ? runCheck({ extraction, answers, today, rules, vendors }) : null),
    [extraction, answers, today],
  );

  async function submit(text = plan) {
    if (!text.trim()) return setError({ code: 'empty', message: 'Paste your event plan first, or try the sample.' });
    if (text.length > MAX_PLAN_CHARS) return setError({ code: 'too_long', message: `Your plan is over ${MAX_PLAN_CHARS.toLocaleString()} characters. Trim it and try again.` });
    setBusy(true);
    setError(null);
    const res = FIXTURE
      ? ({ ok: true, extraction: SAMPLE_EXTRACTION, source: 'fixture', model: 'none', ms: 0 } as const)
      : await api.extract(text);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setExtraction(structuredClone(res.extraction));
    setSource({ kind: res.source, model: res.model, ms: res.ms });
    setAnswers({});
    setKept([]);
    requestAnimationFrame(() => readRef.current?.focus());
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
  const over = plan.length > MAX_PLAN_CHARS;

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-4 lg:gap-16 lg:px-8">
      {/* ---------- Paste ---------- */}
      <section aria-labelledby="paste-h" className="grid grid-cols-1 gap-6 pt-4 lg:grid-cols-12 lg:gap-8 lg:pt-8">
        <div className="flex flex-col gap-5 lg:col-span-8">
          <div className="flex flex-col gap-2">
            <h1 id="paste-h" className="m-0 text-[1.5rem] leading-[1.875rem] font-semibold sm:text-xl">Pre-check your USG funding application.</h1>
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
              className="field min-h-48 resize-y py-3 leading-6 lg:min-h-56"
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
          <p className="m-0 text-sm">AI reads your plan. Every dollar and date is computed by code you can read on GitHub.</p>
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
        <>
          {/* ---------- What we read ---------- */}
          <section aria-labelledby="read-h" className={`flex flex-col gap-6 animate-reveal ${busy ? 'opacity-60' : ''}`}>
            <div className="flex flex-col gap-1">
              <h2 id="read-h" ref={readRef} tabIndex={-1} className="m-0 text-xl font-semibold outline-none">What we read</h2>
              <p className="m-0 text-base text-ink-2">
                Fix anything we got wrong. The check below reruns as you type.
                {source.kind === 'live' && <span className="num"> Read by {source.model} in {(source.ms / 1000).toFixed(1)} s.</span>}
              </p>
              <a href="#result-h" className="mt-1 inline-flex min-h-10 w-fit items-center gap-1.5 text-base font-medium lg:hidden">
                <ArrowDown aria-hidden size={16} /> Jump to the pre-check
              </a>
            </div>
            {source.kind === 'cached' && (
              <p className="m-0 flex items-start gap-2 rounded-panel bg-note-bg p-4 text-base text-note">
                <Info aria-hidden size={18} className="mt-0.5 shrink-0" />
                AI service didn't respond, so this is a saved result for the sample plan. The checks below still run live.
              </p>
            )}
            {source.kind === 'fixture' && (
              <p className="m-0 rounded-panel bg-inset p-3 text-sm text-ink-2">Dev fixture (?fixture=1): no AI call was made.</p>
            )}
            <section aria-labelledby="facts-h" className="panel flex flex-col gap-4 p-4 lg:p-6">
              <h3 id="facts-h" className="m-0 text-lg font-semibold">Event</h3>
              <FactsFields facts={extraction.facts} onChange={patchFacts} />
            </section>
            <section aria-labelledby="items-h" className="panel flex flex-col gap-4 p-4 lg:p-6">
              <h3 id="items-h" className="m-0 text-lg font-semibold">Line items</h3>
              <ItemsTable items={extraction.items} onChange={patchItem} onAdd={addItem} onRemove={removeItem} />
            </section>
            {asks.length > 0 && (
              <section aria-labelledby="asks-h" className="panel flex flex-col gap-2 p-4 lg:p-6">
                <div>
                  <h3 id="asks-h" className="m-0 text-lg font-semibold">Only you know these</h3>
                  <p className="m-0 mt-1 text-base text-ink-2">Each answer reruns the check right away.</p>
                </div>
                <ul className="m-0 list-none p-0">
                  {asks.map((a) => (
                    <AskRow key={a.id} ask={a} value={askValue(a, answers, extraction.facts)} onAnswer={(v) => answer(a, v)} />
                  ))}
                </ul>
              </section>
            )}
          </section>

          {/* ---------- Pre-check ---------- */}
          <section aria-labelledby="result-h" className="flex flex-col gap-6 animate-reveal">
            <div className="flex flex-col gap-3">
              <h2 id="result-h" tabIndex={-1} className="m-0 scroll-mt-4 text-xl font-semibold outline-none">Pre-check</h2>
              <Summary check={check} />
            </div>
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
              {/* Phone: display:contents + order puts fund, flags, money, deadline in task order. */}
              <div className="contents lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:flex lg:flex-col lg:gap-6">
                <div className="order-1"><FundCard check={check} /></div>
                <div className="order-3"><MoneyCard check={check} answers={answers} /></div>
                <div className="order-4"><DeadlineCardView check={check} /></div>
              </div>
              <div className="contents lg:col-span-8 lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:gap-6">
                <div className="order-2"><Flags check={check} extraction={extraction} /></div>
                <div className="order-5"><Documents check={check} /></div>
                <div className="order-6"><Vendors check={check} answers={answers} onOverride={setVendorOverride} /></div>
                <div className="order-7"><PostEvent check={check} /></div>
              </div>
            </div>
          </section>

          <DraftPanel extraction={extraction} check={check} answers={answers} />
        </>
      )}
    </main>
  );
}
