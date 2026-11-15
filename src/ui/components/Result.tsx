import { Fragment, useState, type ReactNode, type Ref } from 'react';
import { ChevronDown, Circle, CircleAlert, CircleCheck, CircleHelp } from 'lucide-react';
import type { Answers, Cents, CheckResult, DeadlineCard, ExtractedItem, Extraction, Flag, RuleId, Severity } from '../../shared/contracts';
import { SEVERITY_ORDER } from '../../shared/contracts';
import { date, money, pct, plural } from '../lib/format';
import { rule } from '../lib/rules';
import { AiText, BadgeTag, CopyButton, Fold, Panel, SEV, SevChip, UsgQuote } from './bits';

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

const Estimate = () => <span className="rounded-full bg-brand-tint px-2 py-px text-xs font-semibold text-ink">Estimate</span>;

/** The answer, first: one count line and the eligible request, then the step's one action. */
export function Verdict({ check, note, headingRef, action }: { check: CheckResult; note?: ReactNode; headingRef: Ref<HTMLHeadingElement>; action: ReactNode }) {
  const m = check.money;
  const r9 = check.flags.find((f) => f.ruleId === 'R9');
  // Worst severity present; no flags at all (nothing read yet) stays neutral rather than a green all-clear.
  const worst = SEVERITY_ORDER.find((s) => check.flags.some((f) => f.severity === s));
  return (
    <div className={`panel flex animate-reveal flex-col gap-4 border-t-4 p-card lg:p-card-lg ${worst ? SEV[worst].top : 'border-t-line'}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="result-h" ref={headingRef} tabIndex={-1} className="m-0 text-xl font-semibold outline-none">What we found</h2>
        {note}
      </div>
      <Summary check={check} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <p className="m-0 text-sm text-ink-2">Eligible request</p>
          <p className="num m-0 flex flex-wrap items-baseline gap-x-2">
            <span className="text-xl font-semibold tracking-[-0.02em] text-ink lg:text-2xl">{money(Math.max(0, m.eligibleCents))}</span>
            <span className="text-base text-ink-2">of {money(m.totalCents)} planned</span>
          </p>
          {r9 && m.yearlyRemainingCents != null && (
            <p className="num m-0 text-sm text-cap">Capped at the {money(m.yearlyRemainingCents)} your org has left of its $8,000 for the year</p>
          )}
          {m.yearlyRemainingCents == null && m.eligibleCents > m.yearlyCapCents && (
            <p className="num m-0 text-sm text-cap">More than the $8,000 USG funds per org each year</p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}

// ---------- Flags ----------

// Event-level flags under "Not eligible per §5" get a plain label; the group heading already says why.
const EVENT_LABEL: Partial<Record<RuleId, string>> = { R4: 'Ticket sales', 'R5.open': 'Not open to all students', 'R5.residence': 'Held in a private residence' };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function flagTitle(flag: Flag, item: ExtractedItem | null | undefined): string {
  if (flag.severity === 'not_eligible') {
    if (item) return flag.amountCents != null ? `${item.description} (${money(flag.amountCents)})` : item.description;
    return EVENT_LABEL[flag.ruleId] ?? flag.message;
  }
  // The quote's attribution names the section, so drop the engine's trailing "(§3)".
  return flag.message.replace(/ \((§\d+|funding page FAQ)\)\.$/, '.');
}

function FlagCard({ flag, extraction }: { flag: Flag; extraction: Extraction }) {
  const s = SEV[flag.severity];
  const item = flag.itemId ? extraction.items.find((i) => i.id === flag.itemId) : null;
  const title = flagTitle(flag, item);
  const evidence = flag.evidence ?? item?.evidence;
  // "In your plan" only when the words from the plan say more than the title does.
  const showEvidence = !!evidence && !!norm(evidence) && !norm(title).includes(norm(evidence));
  return (
    <li className="flex flex-col gap-3 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <p className="m-0 flex min-w-0 items-start gap-2 text-base font-medium text-ink">
          <s.Icon aria-hidden size={18} strokeWidth={2} className={`mt-0.5 shrink-0 ${s.fg}`} />
          <span className="min-w-0 [overflow-wrap:anywhere]">{title}</span>
        </p>
        <BadgeTag badge={flag.badge} />
      </div>
      {showEvidence && (
        <p className="m-0 text-sm text-ink-2 [overflow-wrap:anywhere]">
          In your plan: <span className="text-ink">“{evidence}”</span>
        </p>
      )}
      <UsgQuote id={flag.ruleId} />
    </li>
  );
}

function groupLabel(sev: Severity, flags: Flag[]) {
  if (sev !== 'not_eligible') return SEV[sev].label;
  return flags.every((f) => rule(f.ruleId)?.source.includes('§5')) ? 'Not eligible per §5' : 'Not eligible';
}

// Groups open by default; review notes and passed checks are one-line rows.
const FOLDED: Severity[] = ['review_note', 'pass'];
const SHOW = 3;

function Group({ sev, flags, extraction, i }: { sev: Severity; flags: Flag[]; extraction: Extraction; i: number }) {
  const [all, setAll] = useState(false);
  const [r2, setR2] = useState(false);
  const S = SEV[sev];
  const head = <span className={`inline-flex items-center gap-2 ${S.fg}`}><S.Icon aria-hidden size={20} strokeWidth={2} />{groupLabel(sev, flags)} <span className="num font-medium text-ink-2">({flags.length})</span></span>;
  const list = (fs: Flag[]) => (
    <ul className="m-0 flex list-none flex-col gap-4 p-0">
      {fs.map((f) => <FlagCard key={f.id} flag={f} extraction={extraction} />)}
    </ul>
  );
  if (FOLDED.includes(sev)) {
    const first = flagTitle(flags[0], flags[0].itemId ? extraction.items.find((x) => x.id === flags[0].itemId) : null).replace(/\.$/, '');
    return <Fold title={head} id={`g-${sev}`} meta={sev === 'pass' ? undefined : flags.length > 1 ? `${first} and ${flags.length - 1} more` : first}>{list(flags)}</Fold>;
  }
  const discretion = flags.some((f) => rule(f.ruleId)?.discretionNote);
  return (
    // Verdict first, then each group: 80 ms, then 60 ms apart.
    <section aria-labelledby={`g-${sev}`} className="panel flex animate-reveal flex-col gap-4 p-card lg:p-card-lg" style={{ animationDelay: `${80 + i * 60}ms` }}>
      <div className="flex flex-wrap items-center gap-x-4">
        <h3 id={`g-${sev}`} className="m-0 text-lg font-semibold">{head}</h3>
        {discretion && (
          // Stays visible: it keeps a flag from reading as final. Opens USG's own words on exceptions.
          <button type="button" aria-expanded={r2} aria-controls={`r2-${sev}`} className="inline-flex min-h-target cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-sm text-ink underline underline-offset-3" onClick={() => setR2(!r2)}>
            The board may make an exception
            <ChevronDown aria-hidden size={16} className={`transition-transform duration-200 ${r2 ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {discretion && <div id={`r2-${sev}`} hidden={!r2}><UsgQuote id="R2" /></div>}
      {list(all ? flags : flags.slice(0, SHOW))}
      {flags.length > SHOW && (
        <button type="button" className="btn btn-ghost -ml-2 self-start" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show ${flags.length - SHOW} more`}
        </button>
      )}
    </section>
  );
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
  return <>{groups.map(([sev, flags], i) => <Group key={sev} sev={sev} flags={flags} extraction={extraction} i={i} />)}</>;
}

// ---------- Fund ----------

export function FundBody({ check }: { check: CheckResult }) {
  return (
    <>
      <UsgQuote id={check.fund.ruleId} />
      <AiText>{check.fund.aiReason}</AiText>
    </>
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

/** The closed row's key fact: what comes off the plan. */
export function moneyMeta(m: CheckResult['money'], yearly: Cents) {
  const off = [
    m.ineligibleCents && `−${money(m.ineligibleCents)} not eligible`,
    m.capReductionCents && `−${money(m.capReductionCents)} over a cap`,
    yearly && `−${money(yearly)} yearly cap`,
  ].filter(Boolean);
  return off.length ? off.join(', ') : 'Nothing taken off';
}

export function MoneyBody({ check, answers }: { check: CheckResult; answers: Answers }) {
  const m = check.money;
  const received = answers.receivedThisYearCents ?? null;
  const used = (received ?? 0) + Math.max(0, m.eligibleCents);
  const share = used / m.yearlyCapCents;
  const r9 = check.flags.find((f) => f.ruleId === 'R9');
  // A limit that has its own flag card is said there, not again here.
  const flagged = (id: RuleId) => check.flags.some((f) => f.ruleId === id);
  const limits = [
    !flagged('R6') && ['Venue and personnel', `${money(m.venuePersonnelCents)} of $4,000 cap`],
    !flagged('R11') && ['Food per person', m.foodCents ? (m.foodPerPersonCents == null ? 'Unknown' : `${money(m.foodPerPersonCents)} of $35 limit`) : 'No food lines'],
    // Unknown until answered; the bar's caption already says so.
    !flagged('R9') && m.yearlyRemainingCents != null && ['Left this year', money(m.yearlyRemainingCents)],
  ].filter((x): x is string[] => Array.isArray(x));
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <div className="h-3 overflow-hidden rounded-full border border-control bg-inset" aria-hidden>
          <div className="flex h-full">
            {received ? <div className="h-full bg-control" style={{ width: `${Math.min(100, (received / m.yearlyCapCents) * 100)}%` }} /> : null}
            <div className="h-full bg-ink" style={{ width: `${Math.min(100, (Math.max(0, m.eligibleCents) / m.yearlyCapCents) * 100)}%` }} />
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
      {limits.length > 0 && (
        <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm text-ink-2">
          {limits.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd className="num m-0 text-right">{v}</dd></Fragment>)}
        </dl>
      )}
    </>
  );
}

// ---------- Deadline ----------

export function headline(d: DeadlineCard): string {
  switch (d.status) {
    case 'safe': return `Submit by ${date(d.headline)}`;
    case 'next_open': return `Submit next Wednesday, ${date(d.headline)}`;
    case 'past': return 'Past under every reading we found.';
    case 'blackout': return "The event date falls in USG's no-funding window.";
    default: return 'Add the event date to estimate a deadline.';
  }
}

export function DeadlineBody({ check }: { check: CheckResult }) {
  const d = check.deadline;
  const r25 = rule('R25');
  const anchor = d.anchors[0];
  return (
    <>
      <div className="flex flex-col gap-1">
        {d.latest && d.status !== 'blackout' && <p className="num m-0 text-sm text-ink-2">Latest date under the event-date wording: {date(d.latest)}</p>}
        {anchor && <p className="num m-0 text-sm text-ink-2">Counted {d.weeks} academic weeks back from the {anchor.kind === 'event' ? 'event' : 'first payment'} on {date(anchor.date)}.</p>}
      </div>
      {/* A blackout is already the headline (and its own flag), so only "clear" is said here. */}
      {d.status !== 'unknown_date' && !d.blackout && <p className="m-0 flex items-center gap-2 text-base">
        <CircleCheck aria-hidden size={18} className="text-pass" />
        Blackout dates: clear
      </p>}
      <UsgQuote id="R26" />
      <p className="m-0 text-sm text-ink-2">
        USG documents word this rule differently, so we show the earliest date. Confirm on USG's Funding Application Deadlines sheet or with usgfunds@usc.edu.
      </p>
      {r25?.alsoSee?.length ? (
        // Shown in full: this already sits inside a row, and rows hold no further disclosures.
        <div className="flex flex-col gap-3">
          <p className="m-0 text-sm font-medium text-ink">The other wordings</p>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {r25.alsoSee.map((s) => (
              <li key={s.source + s.quote} className="flex flex-col gap-1">
                <span className="text-sm text-ink-2">{s.source} says:</span>
                <blockquote className="m-0 rounded-panel bg-inset px-4 py-3 font-serif text-base">“{s.quote}”</blockquote>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

// ---------- Documents ----------

const DOC_STATUS = {
  needed: { label: 'Needed', Icon: Circle, cls: 'text-ink-2' },
  done: { label: 'Done', Icon: CircleCheck, cls: 'text-pass' },
  invalid: { label: 'Check the format', Icon: CircleAlert, cls: 'text-ne' },
} as const;

export const docsMeta = (check: CheckResult) => {
  const n = check.documents.filter((d) => d.status !== 'done').length;
  return check.documents.length === 0 ? 'None found yet' : n ? `${n} needed` : 'All done';
};

export function Documents({ check, children }: { check: CheckResult; children?: ReactNode }) {
  return (
    <>
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
                  </div>
                </div>
                {d.fileName && <CopyButton text={d.fileName} what={`file name ${d.fileName}`} />}
              </li>
            );
          })}
        </ul>
      )}
      {children}
    </>
  );
}

// ---------- Vendors ----------

export function vendorsMeta(check: CheckResult) {
  const named = check.vendors.filter((v) => v.status !== 'not_applicable');
  const unsure = named.filter((v) => v.status !== 'found').length;
  return named.length === 0 ? 'No vendors named' : unsure ? `${unsure} not found on the list, verify` : `${named.length} found on the USG Vendor List`;
}

export function Vendors({ check, answers, onOverride }: { check: CheckResult; answers: Answers; onOverride: (itemId: string, on: boolean) => void }) {
  const food = check.vendors.filter((v) => v.status !== 'not_applicable');
  return (
    <>
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
                  <label className="flex min-h-target cursor-pointer items-center gap-2 pl-6 text-sm">
                    <input type="checkbox" className="size-4 accent-brand" checked={overridden} onChange={(e) => onOverride(v.itemId, e.target.checked)} />
                    I checked: this vendor is on the USG Vendor List
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <UsgQuote id="R18" />
    </>
  );
}

// ---------- After the event ----------

export const PostEvent = ({ check }: { check: CheckResult }) => <UsgQuote id={check.postEventRuleId} />;
