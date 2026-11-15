import { useState, useSyncExternalStore, type ReactNode, type Ref } from 'react';
import { Ban, Calculator, Check, ChevronDown, CircleCheck, CircleHelp, Copy, Gauge, MessageSquareText, ScanText, type LucideIcon } from 'lucide-react';
import type { Badge, RuleId, Severity } from '../../shared/contracts';
import { rule } from '../lib/rules';

// The two-column desktop layout starts at Tailwind's lg (1024 px); used where a column change needs different markup.
const WIDE = '(min-width: 64rem)';
const onWide = (cb: () => void) => { const m = matchMedia(WIDE); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); };
export const useWide = () => useSyncExternalStore(onWide, () => matchMedia(WIDE).matches);

export const SEV: Record<Severity, { label: string; Icon: LucideIcon; fg: string; bg: string; top: string }> = {
  not_eligible: { label: 'Not eligible', Icon: Ban, fg: 'text-ne', bg: 'bg-ne-bg', top: 'border-t-ne' },
  over_cap: { label: 'Over cap', Icon: Gauge, fg: 'text-cap', bg: 'bg-cap-bg', top: 'border-t-cap' },
  review_note: { label: 'Review note', Icon: MessageSquareText, fg: 'text-note', bg: 'bg-note-bg', top: 'border-t-note' },
  confirm: { label: 'Confirm', Icon: CircleHelp, fg: 'text-confirm', bg: 'bg-confirm-bg', top: 'border-t-confirm' },
  pass: { label: 'Passed', Icon: CircleCheck, fg: 'text-pass', bg: 'bg-pass-bg', top: 'border-t-pass' },
};

export function SevChip({ severity, children }: { severity: Severity; children?: string }) {
  const s = SEV[severity];
  return (
    <span className={`inline-flex min-h-7 max-w-full items-start gap-1.5 rounded-[0.875rem] px-2.5 py-1 text-sm leading-5 font-medium ${s.fg} ${s.bg}`}>
      <s.Icon aria-hidden size={14} strokeWidth={2} className="mt-[3px] shrink-0" />
      <span className="min-w-0">{children ?? s.label}</span>
    </span>
  );
}

export function BadgeTag({ badge }: { badge: Badge }) {
  const math = badge === 'rule_math';
  const Icon = math ? Calculator : ScanText;
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-inset px-2 text-xs font-medium text-ink-2">
      <Icon aria-hidden size={12} strokeWidth={2} />
      {math ? 'Rule math' : 'AI-judged'}
    </span>
  );
}

/** USG's words. Only rules.json quotes ever render here. */
export function UsgQuote({ id, intro }: { id: RuleId; intro?: string }) {
  const r = rule(id);
  if (!r) return null;
  return (
    <figure className="m-0 flex flex-col gap-1.5">
      <figcaption className="text-sm text-ink-2">
        {intro ?? (r.sourceUrl ? (
          <>
            <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="text-ink">{r.source}<span className="sr-only"> (opens in a new tab)</span></a> says:
          </>
        ) : `${r.source} says:`)}
      </figcaption>
      <blockquote cite={r.sourceUrl || undefined} className="m-0 flex flex-col gap-2 rounded-panel bg-inset px-4 py-3 font-serif text-base text-ink">
        {r.quotes.map((q) => (
          <p key={q} className="m-0 max-w-[68ch]">“{q}”</p>
        ))}
      </blockquote>
      {r.note && <p className="m-0 text-sm text-ink-2">Our note: {r.note}</p>}
    </figure>
  );
}

export function AiText({ label = 'AI reasoning', children }: { label?: string; children: ReactNode }) {
  return (
    <p className="m-0 text-sm text-ink-2">
      <span className="font-medium text-ink">{label}:</span> {children}
    </p>
  );
}

export function CopyButton({ text, what }: { text: string; what: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secondary shrink-0 px-3 text-sm"
      aria-label={done ? `Copied ${what}` : `Copy ${what}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked: the text stays visible and selectable */
        }
      }}
    >
      {done ? <Check aria-hidden size={16} /> : <Copy aria-hidden size={16} />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

export function Panel({ title, id, children, className = '', aside }: { title: string; id?: string; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <section aria-labelledby={id} className={`panel flex flex-col gap-4 p-card lg:p-card-lg ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={id} className="m-0 text-lg font-semibold">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** A one-line row that expands: its title and key fact when closed. `flat` rows sit inside a <Rows> panel. */
export function Fold({ title, meta, open, id, detailsRef, flat, children }: { title: ReactNode; meta?: ReactNode; open?: boolean; id?: string; detailsRef?: Ref<HTMLDetailsElement>; flat?: boolean; children: ReactNode }) {
  return (
    <details ref={detailsRef} open={open} className={`group scroll-mt-4 ${flat ? '' : 'panel'}`}>
      <summary className="flex min-h-target cursor-pointer list-none items-center justify-between gap-3 rounded-panel px-card py-3 lg:px-card-lg [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 text-base [overflow-wrap:anywhere]">
          <span id={id} className="font-semibold text-ink">{title}</span>
          {meta && <span className="num text-ink-2"> · {meta}</span>}
        </span>
        <ChevronDown aria-hidden size={20} className="shrink-0 text-ink-2 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-4 px-card pb-card lg:px-card-lg lg:pb-card-lg">{children}</div>
    </details>
  );
}

/** One panel holding a list of one-line rows. */
export const Rows = ({ label, children }: { label: string; children: ReactNode }) => (
  <section aria-label={label} className="panel flex flex-col divide-y divide-line">{children}</section>
);
