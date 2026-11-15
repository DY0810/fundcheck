import { useState, type ReactNode, type Ref } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleCheck, ExternalLink } from 'lucide-react';
import type { Answers, Draft, Extraction, Fix, Resolution } from '../../shared/contracts';
import { money, plural } from '../lib/format';
import { CsvButton, DraftPanel } from './DraftPanel';
import { docsMeta, flagTitle, headline, PostEvent } from './Result';
import { Fold, Rows, SEV, useWide } from './bits';

export type Step = 1 | 2 | 3;
export type Choice = 'apply' | 'keep';
const STEPS = ['Check', 'Fix', 'Hand off'] as const;
// USG's own funding page (a source in rules.json). Filing itself is on EngageSC, behind a USC sign-in.
const USG_FUNDING = 'https://usg.usc.edu/branches/funding/';

export function StepNav({ step, onGo, noFixes }: { step: Step; onGo: (s: Step) => void; noFixes: boolean }) {
  return (
    <nav aria-label="Steps">
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0 text-sm">
        {STEPS.map((label, i) => {
          const n = (i + 1) as Step;
          const mark = (
            <span className={`num flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${n === step ? 'bg-ink text-white' : n < step ? 'bg-brand-tint text-brand-press' : 'bg-inset text-ink-2'}`}>
              {n < step ? <Check aria-hidden size={14} strokeWidth={2.5} /> : n}
            </span>
          );
          return (
            <li key={label} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden className="h-px w-4 bg-control sm:w-8" />}
              {n < step && !(n === 2 && noFixes) ? (
                <button type="button" className="flex min-h-target cursor-pointer items-center gap-2 border-0 bg-transparent p-0 font-medium text-brand underline-offset-2 hover:underline" onClick={() => onGo(n)}>
                  {mark}{label}<span className="sr-only"> (done, go back)</span>
                </button>
              ) : (
                <span aria-current={n === step ? 'step' : undefined} className={`flex min-h-target items-center gap-2 ${n === step ? 'font-semibold text-ink' : 'text-ink-2'}`}>
                  {mark}{label}{n === 2 && noFixes && <span className="sr-only"> (nothing to fix)</span>}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const Back = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
  <button type="button" className="btn btn-ghost -ml-2 self-start" onClick={onClick}>
    <ArrowLeft aria-hidden size={16} /> {children}
  </button>
);

// ---------- Step 2: review fixes ----------

export function FixReview({ fixes, choices, onChoose, onApproveAll, requestCents, totalCents, headingRef, onBack, onContinue }: {
  fixes: Fix[]; choices: Record<string, Choice>; onChoose: (id: string, c: Choice) => void; onApproveAll: () => void;
  requestCents: number; totalCents: number; headingRef: Ref<HTMLHeadingElement>; onBack: () => void; onContinue: () => void;
}) {
  const auto = fixes.filter((f) => f.auto);
  const manual = fixes.filter((f) => !f.auto);
  const allAuto = auto.length > 0 && auto.every((f) => choices[f.id] === 'apply');
  const rows = (list: Fix[]) => list.map((f) => (
    <fieldset key={f.id} className="m-0 flex min-w-0 flex-col gap-3 border-0 px-card py-4 sm:flex-row sm:items-center sm:justify-between lg:px-card-lg">
      <legend className="sr-only">{f.label}</legend>
      <p className="m-0 min-w-0 text-base text-ink [overflow-wrap:anywhere]" aria-hidden>{f.label}</p>
      <div className="flex shrink-0 rounded-ctl bg-inset p-1" role="presentation">
        {(['apply', 'keep'] as const).map((c) => (
          <label key={c} className="flex min-h-target cursor-pointer items-center rounded-[calc(var(--radius-ctl)-2px)] px-3 text-sm font-medium text-ink has-checked:bg-panel has-checked:font-semibold has-checked:shadow-[inset_0_0_0_2px_var(--color-ink)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink">
            <input type="radio" name={`fix-${f.id}`} className="sr-only" checked={choices[f.id] === c} onChange={() => onChoose(f.id, c)} />
            {choices[f.id] === c && <Check aria-hidden size={16} strokeWidth={2.5} className="mr-1.5 shrink-0" />}
            {choices[f.id] === c ? (c === 'apply' ? 'Applied' : 'Kept for the board') : c === 'apply' ? 'Apply' : 'Keep and ask the board'}
          </label>
        ))}
      </div>
    </fieldset>
  ));
  const bar = (
    <div className="flex flex-col gap-4 rounded-panel bg-brand-tint p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5" aria-live="polite" aria-atomic="true">
        <p className="m-0 text-sm text-ink">You'll request</p>
        <p className="num m-0 flex flex-wrap items-baseline gap-x-2">
          <span className="text-xl font-semibold tracking-[-0.02em] text-ink lg:text-2xl">{money(requestCents)}</span>
          <span className="text-base text-ink">of {money(totalCents)} planned</span>
        </p>
      </div>
      <button type="button" className="btn btn-primary" onClick={onContinue}>Continue <ArrowRight aria-hidden size={18} /></button>
    </div>
  );
  return (
    <div className="flex flex-col gap-6 lg:gap-group">
      <section aria-labelledby="fixes-h" className="panel flex animate-reveal flex-col gap-4 p-card lg:p-card-lg">
        <h2 id="fixes-h" ref={headingRef} tabIndex={-1} className="m-0 text-xl font-semibold outline-none">Review fixes</h2>
        {bar}
      </section>

      {auto.length > 0 && (
        <section aria-label="Fixes" className="panel flex animate-reveal flex-col divide-y divide-line [animation-delay:80ms]">
          <div className="flex flex-col gap-3 px-card py-4 sm:flex-row sm:items-center sm:justify-between lg:px-card-lg">
            <p className="m-0 text-base font-semibold text-ink">{auto.length === 1 ? '1 change that follows' : `${auto.length} changes that follow`} USG's rules</p>
            <button type="button" className="btn btn-secondary" onClick={onApproveAll} disabled={allAuto}>
              {allAuto ? `All ${auto.length} applied` : `Approve all ${auto.length}`}
            </button>
          </div>
          {rows(auto)}
        </section>
      )}
      {manual.length > 0 && (
        <section aria-labelledby="manual-h" className="panel flex animate-reveal flex-col divide-y divide-line [animation-delay:140ms]">
          <p id="manual-h" className="m-0 px-card py-4 text-base font-semibold text-ink lg:px-card-lg">Changes to the event</p>
          {rows(manual)}
        </section>
      )}
      <Back onClick={onBack}>Back to what we found</Back>
    </div>
  );
}

// ---------- Step 3: hand off ----------

export function Handoff({ resolution, original, answers, paperwork, documents, headingRef, onBack, backLabel }: {
  resolution: Resolution; original: Extraction; answers: Answers; paperwork: ReactNode; documents: ReactNode; headingRef: Ref<HTMLHeadingElement>; onBack: () => void; backLabel: string;
}) {
  const r = resolution;
  const [draft, setDraft] = useState<Draft | null>(null);
  const ai = draft ? 'drafted' : 'to draft';
  const wide = useWide();
  const item = (id: string | null) => (id ? r.extraction.items.find((i) => i.id === id) ?? original.items.find((i) => i.id === id) : null);
  const status = (
    <>
        <h2 id="handoff-h" ref={headingRef} tabIndex={-1} className="m-0 text-xl font-semibold outline-none">Hand off to USG</h2>
        {r.open.length === 0 ? (
          <p className="m-0 flex items-center gap-2 text-base font-medium text-ink">
            <CircleCheck aria-hidden size={18} className="shrink-0 text-pass" /> Nothing left to flag
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="m-0 text-base font-medium text-ink">{plural(r.open.length, 'item')} left for the board</p>
            <ul className="m-0 flex max-w-main list-none flex-col gap-1 p-0">
              {r.open.map((f) => {
                const S = SEV[f.severity];
                return (
                  <li key={f.id} className="flex items-start gap-2 text-base [overflow-wrap:anywhere]">
                    <S.Icon aria-hidden size={18} className={`mt-0.5 shrink-0 ${S.fg}`} />
                    <span>{flagTitle(f, item(f.itemId)).replace(/\.$/, '')} <span className={`text-sm ${S.fg}`}>· {S.label}</span></span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
    </>
  );
  const packet = (
    <>
        <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-3 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_1.2fr] sm:gap-x-6">
          <div className="flex flex-col gap-0.5">
            <dt className="text-sm text-ink-2">Amount to request</dt>
            <dd className="num m-0 text-xl font-semibold text-ink">{money(r.requestCents)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-sm text-ink-2">Deadline (estimate)</dt>
            <dd className="num m-0 text-base font-semibold text-ink">{headline(r.check.deadline)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-sm text-ink-2">Fund</dt>
            <dd className="m-0 text-base font-semibold text-ink">{r.check.fund.label}</dd>
          </div>
        </dl>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <a className="btn btn-primary no-underline" href={USG_FUNDING} target="_blank" rel="noreferrer">
            Open USG's funding page <ExternalLink aria-hidden size={16} /><span className="sr-only"> (opens in a new tab)</span>
          </a>
          <CsvButton extraction={r.extraction} draft={draft} />
        </div>
    </>
  );
  const bring = (
      <Rows label="What to bring">
        <Fold flat open={wide} title="Form answers" id="draft-h" meta={`ready to copy, description ${ai}`}>
          <DraftPanel extraction={r.extraction} check={r.check} answers={answers} requestCents={r.requestCents} draft={draft} setDraft={setDraft} />
        </Fold>
        <Fold flat open={wide} title="Documents" id="docs-h" meta={docsMeta(r.check)}>
          {documents}
          {paperwork}
        </Fold>
        <Fold flat title="After the event" meta="What to send USG once it's over">
          <PostEvent check={r.check} />
        </Fold>
      </Rows>
  );
  const back = <Back onClick={onBack}>{backLabel}</Back>;
  // Every section is a full-width row: the packet, then what to bring.
  return (
    <div className="flex flex-col gap-6 lg:gap-group">
      <section aria-labelledby="handoff-h" className="panel flex animate-reveal flex-col gap-4 p-card lg:p-card-lg">
        {status}
        {packet}
      </section>
      {bring}
      {back}
    </div>
  );
}
