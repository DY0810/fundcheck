import type { ReactNode, Ref } from 'react';
import { ChevronDown, Circle, CircleAlert, CircleCheck, CircleHelp } from 'lucide-react';
import type { Answers, CheckResult, DeadlineCard, Extraction, Flag, Severity } from '../../shared/contracts';
import { SEVERITY_ORDER } from '../../shared/contracts';
import { date, money, pct, plural } from '../lib/format';
import { rule } from '../lib/rules';
import { AiText, BadgeTag, CopyButton, Fold, Panel, RuleRef, SEV, SevChip, UsgQuote } from './bits';

// ---------- Summary ----------

const countLabel = (s: Severity, n: number) =>
  s === 'review_note' ? plural(n, 'review note') : s === 'confirm' ? `${n} to confirm` : `${n} ${SEV[s].label.toLowerCase()}`;

export function Summary({ check }: { check: CheckResult }) {
  const counts = SEVERITY_ORDER.filter((s) => s !== 'pass').map((s) => [s, check.flags.filter((f) => f.severity === s).length] as const).filter(([, n]) => n);
  const line = counts.length ? counts.map(([s, n]) => countLabel(s, n)).join(', ') : 'No flags';
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {counts.length ? counts.map(([s, n]) => <SevChip key={s} severity={s}>{countLabel(s, n)}</SevChip>) : <SevChip severity="pass">No flags</SevChip>}
      </div>
      {/* One short line, so edits don't re-announce the whole report. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Pre-check updated: {line}. Eligible request {money(check.money.eligibleCents)}.
      </p>
    </div>
  );
}

// ---------- Verdict ----------

const Estimate = () => <span className="rounded-full bg-gold px-2 py-px text-xs font-semibold text-ink">Estimate</span>;

/** The answer, first: counts, eligible request, deadline and fund. Everything else is detail below. */
export function Verdict({ check, note, headingRef, nav }: { check: CheckResult; note?: ReactNode; headingRef: Ref<HTMLHeadingElement>; nav: ReactNode }) {
  const m = check.money;
  const r9 = check.flags.find((f) => f.ruleId === 'R9');
  return (
    <div className="panel flex flex-col gap-4 border-t-4 border-t-cardinal p-4 lg:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="result-h" ref={headingRef} tabIndex={-1} className="m-0 text-xl font-semibold outline-none">Pre-check</h2>
        {note}
      </div>
      <Summary check={check} />
      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-[1.1fr_1fr_1fr] sm:gap-x-6">
        <div className="col-span-2 flex flex-col gap-0.5 sm:col-span-1">
          <dt className="text-sm text-ink-2">Eligible request</dt>
          <dd className="num m-0 flex flex-wrap items-baseline gap-x-2">
            <span className="text-2xl font-semibold tracking-[-0.02em] text-ink">{money(Math.max(0, m.eligibleCents))}</span>
            <span className="text-base text-ink-2">of {money(m.totalCents)} planned</span>
          </dd>
          {r9 && m.yearlyRemainingCents != null && (
            <dd className="num m-0 text-sm text-cap">Capped at the {money(m.yearlyRemainingCents)} your org has left of its $8,000 for the year</dd>
          )}
          {m.yearlyRemainingCents == null && m.eligibleCents > m.yearlyCapCents && (
            <dd className="num m-0 text-sm text-cap">More than the $8,000 USG funds per org each year</dd>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="flex items-center gap-2 text-sm text-ink-2">Deadline <Estimate /></dt>
          <dd className="num m-0 text-base font-semibold text-ink">{headline(check.deadline)}</dd>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-sm text-ink-2">Fund</dt>
          <dd className="m-0 text-base font-semibold text-ink">{check.fund.label}</dd>
        </div>
      </dl>
      {nav}
    </div>
  );
}

// ---------- Flags ----------

function FlagCard({ flag, extraction }: { flag: Flag; extraction: Extraction }) {
  const r = rule(flag.ruleId);
  const s = SEV[flag.severity];
  const item = flag.itemId ? extraction.items.find((i) => i.id === flag.itemId) : null;
  const evidence = flag.evidence ?? item?.evidence;
  return (
    <li className="flex flex-col gap-3 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <p className="m-0 flex min-w-0 items-start gap-2 text-base font-medium text-ink">
          <s.Icon aria-hidden size={18} strokeWidth={2} className={`mt-0.5 shrink-0 ${s.fg}`} />
          <span className="min-w-0 [overflow-wrap:anywhere]">{flag.message}</span>
        </p>
        <BadgeTag badge={flag.badge} />
      </div>
      {evidence && (
        <p className="m-0 text-sm text-ink-2 [overflow-wrap:anywhere]">
          In your plan: <span className="text-ink">“{evidence}”</span>
        </p>
      )}
      <UsgQuote id={flag.ruleId} />
      {flag.aiReason && <AiText>{flag.aiReason}</AiText>}
      <p className="m-0 flex flex-wrap gap-x-2 gap-y-1">
        <RuleRef id={flag.ruleId} />
        {r?.discretionNote && <span className="text-xs text-ink-2">· The board may make an exception (R2, quoted below)</span>}
      </p>
    </li>
  );
}

function groupLabel(sev: Severity, flags: Flag[]) {
  if (sev !== 'not_eligible') return SEV[sev].label;
  return flags.every((f) => rule(f.ruleId)?.source.includes('§5')) ? 'Not eligible per §5' : 'Not eligible';
}

export function Flags({ check, extraction }: { check: CheckResult; extraction: Extraction }) {
  const groups = SEVERITY_ORDER.map((s) => [s, check.flags.filter((f) => f.severity === s)] as const).filter(([, f]) => f.length);
  if (!groups.length) {
    return (
      <Panel title="Flags" id="flags-h">
        <p className="m-0 text-base text-ink-2">Nothing in this plan matched a rule we check. Answer the questions to finish the check.</p>
      </Panel>
    );
  }
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {groups.map(([sev, flags]) => sev === 'pass' ? (
        <Fold key={sev} title={`Passed (${flags.length})`} id={`g-${sev}`}>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {flags.map((f) => <FlagCard key={f.id} flag={f} extraction={extraction} />)}
          </ul>
        </Fold>
      ) : (
        <section key={sev} aria-labelledby={`g-${sev}`} className="panel flex flex-col gap-4 p-4 lg:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id={`g-${sev}`} className={`m-0 flex items-center gap-2 text-lg font-semibold ${SEV[sev].fg}`}>
              {(() => { const I = SEV[sev].Icon; return <I aria-hidden size={20} strokeWidth={2} />; })()}
              {groupLabel(sev, flags)}
              <span className="num text-base font-medium text-ink-2">({flags.length})</span>
            </h3>
          </div>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {flags.map((f) => <FlagCard key={f.id} flag={f} extraction={extraction} />)}
          </ul>
          {/* R2 applies to every discretion rule; quoted once per group, after the flags so the first quote stays on screen. */}
          {flags.some((f) => rule(f.ruleId)?.discretionNote) && (
            <div className="border-t border-line pt-4">
              <UsgQuote id="R2" intro={`Exception at the board's discretion. ${rule('R2')?.source ?? 'The Guidelines'} says:`} />
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

// ---------- Fund ----------

export function FundCard({ check }: { check: CheckResult }) {
  return (
    <Fold title="Why this fund" id="fund-h" meta={check.fund.label}>
      <UsgQuote id={check.fund.ruleId} />
      <AiText>{check.fund.aiReason}</AiText>
    </Fold>
  );
}

// ---------- Money ----------

function Row({ label, value, strong, minus }: { label: string; value: number | null; strong?: boolean; minus?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-2 ${strong ? 'border-t border-ink font-semibold' : ''}`}>
      <dt className="text-base">{label}</dt>
      <dd className="num m-0 text-base">{minus && value ? `−${money(value)}` : money(value)}</dd>
    </div>
  );
}

export function MoneyCard({ check, answers }: { check: CheckResult; answers: Answers }) {
  const m = check.money;
  const received = answers.receivedThisYearCents ?? null;
  const used = (received ?? 0) + Math.max(0, m.eligibleCents);
  const share = used / m.yearlyCapCents;
  const r9 = check.flags.find((f) => f.ruleId === 'R9');
  return (
    <Panel title="Money" id="money-h">
      <div>
        <p className="m-0 text-sm text-ink-2">Eligible request</p>
        <p className="num m-0 text-2xl font-semibold tracking-[-0.02em] text-ink">{money(m.eligibleCents)}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-3 overflow-hidden rounded-full border border-control bg-inset" aria-hidden>
          <div className="flex h-full">
            {received ? <div className="h-full bg-ink-2" style={{ width: `${Math.min(100, (received / m.yearlyCapCents) * 100)}%` }} /> : null}
            <div className="h-full bg-gold" style={{ width: `${Math.min(100, (Math.max(0, m.eligibleCents) / m.yearlyCapCents) * 100)}%` }} />
          </div>
        </div>
        <p className="num m-0 text-sm text-ink-2">
          {share > 1 ? `${money(used - m.yearlyCapCents)} over` : `${pct(share)} of`} the $8,000 yearly cap
          {received == null ? ', if your org has received nothing yet this year' : `, counting ${money(received)} already received`}
        </p>
      </div>
      <dl className="m-0">
        <Row label="Plan total" value={m.totalCents} />
        <Row label="Not eligible" value={m.ineligibleCents} minus />
        <Row label="Over-cap reductions" value={m.capReductionCents} minus />
        {r9?.amountCents ? <Row label="Yearly cap" value={r9.amountCents} minus /> : null}
        <Row label="Eligible request" value={m.eligibleCents} strong />
      </dl>
      <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm text-ink-2">
        <dt>Venue and personnel</dt>
        <dd className="num m-0 text-right">{money(m.venuePersonnelCents)} of $4,000 cap</dd>
        <dt>Food per person</dt>
        <dd className="num m-0 text-right">{m.foodCents ? (m.foodPerPersonCents == null ? 'Unknown' : `${money(m.foodPerPersonCents)} of $35 limit`) : 'No food lines'}</dd>
        <dt>Left this year</dt>
        <dd className="num m-0 text-right">{money(m.yearlyRemainingCents)}</dd>
      </dl>
    </Panel>
  );
}

// ---------- Deadline ----------

function headline(d: DeadlineCard): string {
  switch (d.status) {
    case 'safe': return `Submit by ${date(d.headline)}`;
    case 'next_open': return `Submit next Wednesday, ${date(d.headline)}`;
    case 'past': return 'Past under every reading we found. Confirm with the Funding Department (usgfunds@usc.edu).';
    case 'blackout': return "The event date falls in USG's no-funding window.";
    default: return 'Add the event date to estimate a deadline.';
  }
}

export function DeadlineCardView({ check }: { check: CheckResult }) {
  const d = check.deadline;
  const r25 = rule('R25');
  const anchor = d.anchors[0];
  return (
    <Panel title="Deadline" id="deadline-h" aside={<span className="rounded-full bg-gold px-2.5 py-0.5 text-sm font-semibold text-ink">Estimate</span>}>
      <div className="flex flex-col gap-1">
        <p className="num m-0 text-lg font-semibold text-ink">{headline(d)}</p>
        {d.latest && d.status !== 'blackout' && <p className="num m-0 text-sm text-ink-2">Latest date under the event-date wording: {date(d.latest)}</p>}
        {anchor && <p className="num m-0 text-sm text-ink-2">Counted {d.weeks} academic weeks back from the {anchor.kind === 'event' ? 'event' : 'first payment'} on {date(anchor.date)}.</p>}
      </div>
      {d.status !== 'unknown_date' && <p className="m-0 flex items-center gap-2 text-base">
        {d.blackout ? <CircleAlert aria-hidden size={18} className="text-ne" /> : <CircleCheck aria-hidden size={18} className="text-pass" />}
        Blackout dates: {d.blackout ? 'the event is in a no-funding window' : 'clear'}
      </p>}
      <UsgQuote id="R26" />
      <p className="m-0 text-sm text-ink-2">
        Estimate. USG documents word this rule differently, so we show the earliest date. Confirm on USG's Funding Application Deadlines sheet or with usgfunds@usc.edu.
      </p>
      {r25?.alsoSee?.length ? (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-cardinal [&::-webkit-details-marker]:hidden">
            <ChevronDown aria-hidden size={16} className="transition-transform duration-200 group-open:rotate-180" />
            Sources word this differently
          </summary>
          <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
            {r25.alsoSee.map((s) => (
              <li key={s.source + s.quote} className="flex flex-col gap-1">
                <span className="text-sm text-ink-2">{s.source} says:</span>
                <blockquote className="m-0 rounded-panel bg-inset px-4 py-3 font-serif text-base">“{s.quote}”</blockquote>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Panel>
  );
}

// ---------- Documents ----------

const DOC_STATUS = {
  needed: { label: 'Needed', Icon: Circle, cls: 'text-ink-2' },
  done: { label: 'Done', Icon: CircleCheck, cls: 'text-pass' },
  invalid: { label: 'Check the format', Icon: CircleAlert, cls: 'text-ne' },
} as const;

export function Documents({ check, children }: { check: CheckResult; children?: ReactNode }) {
  return (
    <Panel title="Documents checklist" id="docs-h" className="scroll-mt-4">
      {check.documents.length === 0 ? (
        <p className="m-0 text-base text-ink-2">No documents found for this plan yet.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {check.documents.map((d) => {
            const s = DOC_STATUS[d.status];
            return (
              <li key={d.id} className="flex items-start justify-between gap-3 border-t border-line py-3 first:border-t-0 first:pt-0">
                <div className="flex min-w-0 items-start gap-2">
                  <s.Icon aria-hidden size={18} className={`mt-0.5 shrink-0 ${s.cls}`} />
                  <div className="min-w-0">
                    <p className="m-0 text-base text-ink">
                      {d.label} <span className={`text-sm font-medium ${s.cls}`}>· {s.label}</span>
                    </p>
                    {d.fileName && <p className="m-0 text-sm text-ink-2 [overflow-wrap:anywhere]">Name it {d.fileName}</p>}
                    <p className="m-0 text-xs text-ink-2">{d.ruleId}{rule(d.ruleId) ? ` · ${rule(d.ruleId)!.title}` : ''}</p>
                  </div>
                </div>
                {d.fileName && <CopyButton text={d.fileName} what={`file name ${d.fileName}`} />}
              </li>
            );
          })}
        </ul>
      )}
      {children}
    </Panel>
  );
}

// ---------- Vendors ----------

export function Vendors({ check, answers, onOverride }: { check: CheckResult; answers: Answers; onOverride: (itemId: string, on: boolean) => void }) {
  const food = check.vendors.filter((v) => v.status !== 'not_applicable');
  const unsure = food.filter((v) => v.status !== 'found').length;
  const meta = food.length === 0 ? 'No vendors named' : unsure ? `${unsure} not found on the list, verify` : `${food.length} found on the USG Vendor List`;
  return (
    <Fold title="Vendors" id="vendors-h" meta={meta} open={unsure > 0}>
      {food.length === 0 ? (
        <p className="m-0 text-base text-ink-2">No vendors named in your plan. FundCheck checks each named vendor against the USG Vendor List.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {food.map((v) => {
            const found = v.status === 'found';
            const overridden = answers.vendorOnList?.[v.itemId] === true;
            return (
              <li key={v.itemId} className="flex flex-col gap-2 border-t border-line py-3 first:border-t-0 first:pt-0">
                <p className="m-0 flex items-start gap-2 text-base [overflow-wrap:anywhere]">
                  {found ? <CircleCheck aria-hidden size={18} className="mt-0.5 shrink-0 text-pass" /> : <CircleHelp aria-hidden size={18} className="mt-0.5 shrink-0 text-confirm" />}
                  <span>
                    <span className="font-medium">{v.vendor}</span>
                    {' · '}
                    {found ? (overridden ? 'You confirmed it is on the USG Vendor List' : 'Found on USG Vendor List') : 'Not found on the list, verify'}
                  </span>
                </p>
                {(!found || overridden) && (
                  <label className="flex min-h-10 cursor-pointer items-center gap-2 pl-6 text-sm">
                    <input type="checkbox" className="size-4 accent-cardinal" checked={overridden} onChange={(e) => onOverride(v.itemId, e.target.checked)} />
                    I checked: this vendor is on the USG Vendor List
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <UsgQuote id="R18" />
    </Fold>
  );
}

// ---------- After the event ----------

export function PostEvent({ check }: { check: CheckResult }) {
  return (
    <Fold title="After the event" id="post-h" meta="What to send USG once the event is over">
      <UsgQuote id={check.postEventRuleId} />
    </Fold>
  );
}
