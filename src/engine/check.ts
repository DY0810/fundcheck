import {
  FUND_LABELS,
  FUND_RULE,
  SEVERITY_ORDER,
  type Ask,
  type CheckInput,
  type CheckResult,
  type EventAiRuleId,
  type Flag,
  type RuleId,
} from '../shared/contracts';
import { deadlineCard } from './deadline';
import { buildDocs, UEPA } from './docs';
import { buildMoney, lineCents, lodgingExcess, reductions, resolve, usd } from './money';
import { checkVendors } from './vendor';

// Messages are our own plain lines. Never a quote: the UI renders USG's words from rules.json.
const EVENT_MSG: Record<EventAiRuleId, string> = {
  R4: 'Selling tickets makes the event not eligible per §5.',
  'R5.open': 'An on-campus event closed to some students is not eligible per §5.',
  'R5.residence': 'An event in a private residence is not eligible per §5.',
  R31: 'Professional Academic Research Fund events cannot charge students or limit who attends (§4).',
};
const EVENT_ASK: Record<EventAiRuleId, string> = {
  R4: 'Does the event sell tickets or charge admission?',
  'R5.open': 'Is the event limited to some students, for example members only?',
  'R5.residence': 'Is the event held in a private residence?',
  R31: 'Does the event charge students or limit who can attend?',
};
const NONE = /^\s*(n\/?a|none|no)?\s*$/i;

export function runCheck({ extraction: x, answers, today, rules, vendors }: CheckInput): CheckResult {
  const fund = x.fund.fund;
  const f = x.facts;
  const title = (id: RuleId) => rules.rules.find((r) => r.id === id)?.title ?? id;
  const money = buildMoney(x, answers);
  const { ok, r6, r11, att } = reductions(x, answers);
  const vendorChecks = checkVendors(ok, vendors, answers.vendorOnList);
  const travel = f.travel === true || x.items.some((i) => i.category === 'travel' || i.category === 'lodging');
  const deadline = deadlineCard({
    event: f.date,
    end: f.endDate,
    today,
    travel,
    newVendor: vendorChecks.some((v) => v.status === 'not_found_verify'),
    payment: answers.paymentDueDate,
  });

  const flags: Flag[] = [];
  const asks: Ask[] = [];
  const flag = (g: Omit<Flag, 'id'>) => {
    const id = `${g.ruleId}:${g.itemId ?? 'event'}`;
    if (!flags.some((h) => h.id === id)) flags.push({ id, ...g });
  };
  const ask = (a: Ask) => {
    if (!asks.some((b) => b.id === a.id)) asks.push(a);
  };

  if (f.date == null) ask({ id: 'facts.date', question: 'What is the event date?', ruleId: 'R25', kind: 'date' });
  if (f.expectedAttendance == null) ask({ id: 'facts.expectedAttendance', question: 'How many people do you expect?', ruleId: 'R11', kind: 'number' });
  if (f.ticketed == null) ask({ id: 'facts.ticketed', question: 'Will you sell tickets or charge admission?', ruleId: 'R4', kind: 'yesno' });
  if (f.openToAll == null) ask({ id: 'facts.openToAll', question: 'Is the event open to all USC students?', ruleId: 'R5.open', kind: 'yesno' });

  // Event-level AI matches: R4, R5.*, R31
  for (const m of resolve('event', x.eventMatches, answers)) {
    if (m.ruleId === 'R31' && fund !== 'professional_academic') continue;
    if (m.confidence === 'low') ask({ id: `match:event:${m.ruleId}`, question: EVENT_ASK[m.ruleId], ruleId: m.ruleId, kind: 'yesno' });
    else flag({ ruleId: m.ruleId, severity: 'not_eligible', badge: 'ai_judged', itemId: null, message: EVENT_MSG[m.ruleId], aiReason: m.reason, evidence: m.evidence });
  }
  // A fact the user answered still counts when the model made no match for that rule
  const matched = (id: RuleId) => x.eventMatches.some((m) => m.ruleId === id);
  if (f.ticketed === true && !matched('R4')) flag({ ruleId: 'R4', severity: 'not_eligible', badge: 'rule_math', itemId: null, message: EVENT_MSG.R4 });
  if (f.openToAll === false && f.onCampus !== false && !matched('R5.open'))
    flag({ ruleId: 'R5.open', severity: 'not_eligible', badge: 'rule_math', itemId: null, message: EVENT_MSG['R5.open'] });

  // Item-level AI matches: R1, R3.*, R20
  for (const i of x.items) {
    for (const m of resolve(i.id, i.matches, answers)) {
      if (m.ruleId === 'R20' && fund !== 'performing_visual_cultural') continue;
      if (m.confidence === 'low') {
        const question = m.ruleId === 'R20'
          ? `Is "${i.description}" production, staging or decoration that is not a rental from a PO vendor?`
          : `Does "${i.description}" fall under "${title(m.ruleId)}"?`;
        ask({ id: `match:${i.id}:${m.ruleId}`, question, ruleId: m.ruleId, kind: 'yesno' });
      } else if (m.ruleId === 'R20') {
        flag({ ruleId: 'R20', severity: 'confirm', badge: 'ai_judged', itemId: i.id, aiReason: m.reason, evidence: i.evidence,
          message: `Confirm ${i.description} is a rental from a PO vendor: the Performing Arts fund pays for production and decoration only that way (§4).` });
      } else {
        flag({ ruleId: m.ruleId, severity: 'not_eligible', badge: 'ai_judged', itemId: i.id, amountCents: lineCents(i), aiReason: m.reason, evidence: i.evidence,
          message: `${i.description} (${usd(lineCents(i))}) is not eligible per §5.` });
      }
    }
  }

  // Rule math
  if (r6 > 0) flag({ ruleId: 'R6', severity: 'over_cap', badge: 'rule_math', itemId: null, amountCents: r6,
    message: `Venue and personnel come to ${usd(money.venuePersonnelCents)}, ${usd(r6)} over the $4,000 cap (§3).` });
  if (money.totalCents > 400000) flag({ ruleId: 'R7', severity: 'review_note', badge: 'rule_math', itemId: null,
    message: `The plan totals ${usd(money.totalCents)}, over $4,000, so it is reviewed case-by-case (§3).` });
  if (f.multiDay === true || (f.date && f.endDate && f.endDate > f.date))
    flag({ ruleId: 'R8', severity: 'review_note', badge: 'rule_math', itemId: null, message: 'Multi-day events are reviewed case-by-case (§3).' });

  const left = money.yearlyRemainingCents;
  if (left === null) ask({ id: 'receivedThisYearCents', question: 'How much has your org already received from USG Funding this year?', ruleId: 'R9', kind: 'money' });
  else if (money.eligibleCents > left) flag({ ruleId: 'R9', severity: 'over_cap', badge: 'rule_math', itemId: null, amountCents: money.eligibleCents - left,
    message: `The request (${usd(money.eligibleCents)}) is ${usd(money.eligibleCents - left)} more than the ${usd(left)} left of your $8,000 for the year (§3).` });

  const funded = answers.eventsFundedThisSemester;
  if (funded == null) ask({ id: 'eventsFundedThisSemester', question: 'How many of your events has USG funded this semester?', ruleId: 'R10', kind: 'number' });
  else if (funded >= 4) flag({ ruleId: 'R10', severity: 'over_cap', badge: 'rule_math', itemId: null,
    message: `Your org already has ${funded} funded events this semester; the limit is 4 (funding page FAQ).` });

  if (ok.some((i) => i.category === 'food') && att) {
    const pp = usd(money.foodPerPersonCents ?? 0);
    if (r11 > 0) flag({ ruleId: 'R11', severity: 'review_note', badge: 'rule_math', itemId: null, amountCents: r11,
      message: `Food is ${pp} per person, over $35; the ${usd(r11)} above that is left out of the estimate (§5).` });
    else flag({ ruleId: 'R11', severity: 'pass', badge: 'rule_math', itemId: null, message: `Food is ${pp} per person, within $35 (§5).` });
  }

  for (const i of ok) {
    if (fund === 'social_rec_startup' && /t-?shirts?|\btees?\b/i.test(i.description))
      flag({ ruleId: 'R19', severity: 'confirm', badge: 'rule_math', itemId: i.id, evidence: i.evidence,
        message: `Confirm the vendor for ${i.description} is authorized by USC Trademarks (§4).` });
    const excess = lodgingExcess(i);
    if (excess > 0) {
      const perNight = i.unitCostCents ?? Math.round(lineCents(i) / (i.quantity || 1));
      flag({ ruleId: 'R21', severity: 'review_note', badge: 'rule_math', itemId: i.id, amountCents: excess, evidence: i.evidence,
        message: `${i.description} is ${usd(perNight)} per night, over $400; ${usd(excess)} is left out of the estimate. Lodging is reviewed case-by-case (§5).` });
    }
  }
  for (const v of vendorChecks)
    if (v.status === 'not_found_verify')
      flag({ ruleId: 'R18', severity: 'confirm', badge: 'rule_math', itemId: v.itemId, message: `${v.vendor}: not found on the list, verify with the Funding Department.` });

  if (deadline.blackout) flag({ ruleId: 'R24', severity: 'not_eligible', badge: 'rule_math', itemId: null,
    message: "Event date falls in USG's no-funding window (per the application form)." });

  if (answers.paymentDueDate == null) ask({ id: 'paymentDueDate', question: 'When is the first payment to a vendor due? (optional)', ruleId: 'R25', kind: 'date' });
  if (fund === 'social_rec_startup' && answers.startupEligible == null)
    ask({ id: 'startupEligible', question: 'Did your org first register with Campus Activities within the last two semesters?', ruleId: 'R30', kind: 'yesno' });

  const uepa = answers.uepaNumber?.trim();
  if (!uepa) ask({ id: 'uepaNumber', question: 'What is your UEPA number?', ruleId: 'R16', kind: 'text' });
  else if (!UEPA.test(uepa)) flag({ ruleId: 'R16', severity: 'confirm', badge: 'rule_math', itemId: null,
    message: 'Check the UEPA number: the form expects an A followed by 5 or 6 digits, like A12345.' });
  if (answers.modulesCompleted == null) ask({ id: 'modulesCompleted', question: 'Has your org completed the USG Funding Department modules?', ruleId: 'R32', kind: 'yesno' });

  const other = answers.otherFundingSources;
  if (other == null) ask({ id: 'otherFundingSources', question: 'Is any other University source funding this event? Type N/A if none.', ruleId: 'R33', kind: 'text' });
  else if (!NONE.test(other)) flag({ ruleId: 'R33', severity: 'review_note', badge: 'rule_math', itemId: null,
    message: 'Other University funding can be a reason for denial (§6).' });

  const order = (g: Flag) => x.items.findIndex((i) => i.id === g.itemId); // event-level flags (-1) lead
  flags.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || order(a) - order(b));

  return {
    rulesVersion: rules.version,
    fund: { fund, label: FUND_LABELS[fund], ruleId: FUND_RULE[fund], aiReason: x.fund.reason },
    flags,
    money,
    documents: buildDocs({ items: ok, onCampus: f.onCampus, travel, answers }),
    vendors: vendorChecks,
    deadline,
    asks,
    postEventRuleId: 'R28',
  };
}
