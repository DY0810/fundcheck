// shortcut: crude stand-in for S1's src/engine so the UI can be built before it lands.
// Delete this file and point src/ui/engine.ts at '../engine' as soon as src/engine/index.ts exists.
import type {
  Ask, CheckInput, CheckResult, DeadlineCard, DocItem, Extraction, Flag, Money, VendorCheck, VendorList,
} from '../shared/contracts';
import { FUND_LABELS, FUND_RULE, SEVERITY_ORDER } from '../shared/contracts';
import rulesJson from '../shared/rules.json';
import type { RulesFile } from '../shared/contracts';

export const rules = rulesJson as RulesFile;
export const vendors: VendorList = [{ name: 'Wolfgang Puck Catering', cuisine: 'American', active: true }];
export const BUDGET_FILE_NAME = 'RSO_Lastname_Firstname_BudgetProposal.csv';

const amt = (i: Extraction['items'][number]) => i.totalCents ?? (i.quantity ?? 1) * (i.unitCostCents ?? 0);
const usd = (c: number) => `$${(c / 100).toLocaleString('en-US')}`;

export function runCheck({ extraction: x, answers: a, rules: r }: CheckInput): CheckResult {
  const flags: Flag[] = [];
  const asks: Ask[] = [];
  const effective = (key: string, conf: 'high' | 'low', ruleId: Ask['ruleId'], q: string) => {
    const ans = a.matchAnswers?.[key];
    if (conf === 'high') return ans !== false;
    if (ans === undefined) asks.push({ id: `match:${key}`, question: q, ruleId, kind: 'yesno' });
    return ans === true;
  };
  let ineligible = 0;
  for (const it of x.items) {
    for (const m of it.matches) {
      if (!effective(`${it.id}:${m.ruleId}`, m.confidence, m.ruleId, `Is "${it.description}" a ${m.ruleId} item?`)) continue;
      if (m.ruleId === 'R20') {
        flags.push({ id: `R20:${it.id}`, ruleId: 'R20', severity: 'confirm', badge: 'ai_judged', itemId: it.id, message: `Confirm "${it.description}" is a rental or from a PO vendor.`, aiReason: m.reason, evidence: it.evidence });
        continue;
      }
      ineligible += amt(it);
      flags.push({ id: `${m.ruleId}:${it.id}`, ruleId: m.ruleId, severity: 'not_eligible', badge: 'ai_judged', itemId: it.id, message: `${it.description} (${usd(amt(it))}) is not eligible per §5.`, amountCents: amt(it), aiReason: m.reason, evidence: it.evidence });
    }
  }
  for (const m of x.eventMatches) {
    if (!effective(`event:${m.ruleId}`, m.confidence, m.ruleId, `Does this apply: ${m.ruleId}?`)) continue;
    flags.push({ id: `${m.ruleId}:event`, ruleId: m.ruleId, severity: 'not_eligible', badge: 'ai_judged', itemId: null, message: 'The event includes ticket sales, which are not eligible per §5.', aiReason: m.reason, evidence: m.evidence });
  }
  const total = x.items.reduce((s, i) => s + amt(i), 0);
  const vp = x.items.filter((i) => i.category === 'venue' || i.category === 'personnel').reduce((s, i) => s + amt(i), 0);
  const food = x.items.filter((i) => i.category === 'food').reduce((s, i) => s + amt(i), 0);
  const att = x.facts.expectedAttendance;
  const r6 = Math.max(0, vp - 400000);
  const r11 = att ? Math.max(0, food - 3500 * att) : 0;
  if (r6) flags.push({ id: 'R6:event', ruleId: 'R6', severity: 'over_cap', badge: 'rule_math', itemId: null, message: `Venue and personnel total ${usd(vp)}, ${usd(r6)} over the $4,000 cap.`, amountCents: r6 });
  if (total > 400000) flags.push({ id: 'R7:event', ruleId: 'R7', severity: 'review_note', badge: 'rule_math', itemId: null, message: `The plan totals ${usd(total)}, so it is reviewed case by case.` });
  if (food && att) flags.push({ id: 'R11:event', ruleId: 'R11', severity: r11 ? 'review_note' : 'pass', badge: 'rule_math', itemId: null, message: `Food is ${usd(Math.round(food / att))} per person (limit $35).` });
  const eligible = total - ineligible - r6 - r11;
  const received = a.receivedThisYearCents;
  if (received == null) asks.push({ id: 'receivedThisYearCents', question: 'How much has your org received from USG this year?', ruleId: 'R9', kind: 'money' });
  else if (eligible > 800000 - received) flags.push({ id: 'R9:event', ruleId: 'R9', severity: 'over_cap', badge: 'rule_math', itemId: null, message: `This request would take your org past the $8,000 yearly cap.`, amountCents: eligible - (800000 - received) });
  if (a.eventsFundedThisSemester == null) asks.push({ id: 'eventsFundedThisSemester', question: 'How many events has USG funded for your org this semester?', ruleId: 'R10', kind: 'number' });
  if (a.paymentDueDate == null) asks.push({ id: 'paymentDueDate', question: 'When is the first payment due to a vendor?', ruleId: 'R25', kind: 'date' });
  if (a.otherFundingSources == null) asks.push({ id: 'otherFundingSources', question: 'Other funding sources for this event? Enter N/A if none.', ruleId: 'R33', kind: 'text' });
  else if (!/^n\/?a$/i.test(a.otherFundingSources.trim())) flags.push({ id: 'R33:event', ruleId: 'R33', severity: 'review_note', badge: 'rule_math', itemId: null, message: 'Other University funding can be a reason for denial (§6).' });
  if (a.uepaNumber == null) asks.push({ id: 'uepaNumber', question: 'What is your UEPA number?', ruleId: 'R16', kind: 'text' });
  else if (!/^A\d{5,6}$/.test(a.uepaNumber)) flags.push({ id: 'R16:event', ruleId: 'R16', severity: 'confirm', badge: 'rule_math', itemId: null, message: 'A UEPA number starts with an A and has 5 or 6 digits.' });
  if (x.facts.openToAll == null) asks.push({ id: 'facts.openToAll', question: 'Is the event open to all USC students?', ruleId: 'R5.open', kind: 'yesno' });
  if (x.facts.date == null) asks.push({ id: 'facts.date', question: 'What is the event date?', ruleId: 'R25', kind: 'date' });
  if (att == null) asks.push({ id: 'facts.expectedAttendance', question: 'How many people do you expect?', ruleId: 'R11', kind: 'number' });

  const vendorChecks: VendorCheck[] = x.items.filter((i) => i.vendor).map((i) => {
    const on = i.category !== 'food' ? null : a.vendorOnList?.[i.id] ?? vendors.some((v) => v.name.toLowerCase() === i.vendor!.toLowerCase());
    return { itemId: i.id, vendor: i.vendor!, status: on == null ? 'not_applicable' : on ? 'found' : 'not_found_verify', matchedName: on ? i.vendor! : undefined };
  });
  for (const v of vendorChecks) if (v.status === 'not_found_verify') flags.push({ id: `R18:${v.itemId}`, ruleId: 'R18', severity: 'confirm', badge: 'rule_math', itemId: v.itemId, message: `${v.vendor} is not found on the USG Vendor List, verify.` });

  const docs: DocItem[] = [];
  if (x.facts.onCampus) docs.push({ id: 'R15', ruleId: 'R15', label: 'ESR for the on-campus event', status: 'needed' });
  docs.push({ id: 'R16', ruleId: 'R16', label: 'UEPA number', status: a.uepaNumber == null ? 'needed' : /^A\d{5,6}$/.test(a.uepaNumber) ? 'done' : 'invalid' });
  docs.push({ id: 'budget', ruleId: 'R17', label: 'Budget proposal spreadsheet', fileName: 'RSO_Lastname_Firstname_BudgetProposal.xlsx', status: 'needed' });
  for (const v of new Set(x.items.map((i) => i.vendor).filter(Boolean) as string[])) docs.push({ id: `R17:${v}`, ruleId: 'R17', label: `Quote from ${v}`, fileName: `RSO_Lastname_Firstname_${v.replace(/\s+/g, '')}_Quote.pdf`, status: 'needed' });
  if (food) {
    docs.push({ id: 'R12:permit', ruleId: 'R12', label: 'Health Permit from the food vendor', status: 'needed' });
    docs.push({ id: 'R12:coi', ruleId: 'R12', label: 'Certificate of Insurance from the food vendor', status: 'needed' });
    docs.push({ id: 'R14', ruleId: 'R14', label: 'Hospitality food and beverage form', status: 'needed' });
    docs.push({ id: 'R13', ruleId: 'R13', label: 'Food justification', status: 'needed' });
  }
  docs.push({ id: 'R32', ruleId: 'R32', label: 'USG Funding Department modules', status: a.modulesCompleted ? 'done' : 'needed' });

  const d = x.facts.date;
  const blackout = !!d && ((d >= '2026-12-05' && d <= '2027-01-12') || d > '2027-05-01');
  const deadline: DeadlineCard = d === '2027-04-09' && !blackout
    ? { status: 'safe', headline: '2027-02-03', latest: '2027-02-24', weeks: 6, anchors: [{ kind: 'event', date: d, weeks: 6 }], blackout, ruleIds: ['R23', 'R24', 'R25', 'R26'] }
    : { status: blackout ? 'blackout' : d ? 'next_open' : 'unknown_date', headline: d ? '2026-11-18' : null, latest: d ? '2026-12-02' : null, weeks: 6, anchors: d ? [{ kind: 'event', date: d, weeks: 6 }] : [], blackout, ruleIds: ['R23', 'R24', 'R25', 'R26'] };
  if (blackout) flags.push({ id: 'R24:event', ruleId: 'R24', severity: 'not_eligible', badge: 'rule_math', itemId: null, message: "Event date falls in USG's no-funding window (per the application form)." });

  const money: Money = { totalCents: total, ineligibleCents: ineligible, venuePersonnelCents: vp, capReductionCents: r6 + r11, eligibleCents: eligible, foodCents: food, foodPerPersonCents: att ? Math.round(food / att) : null, yearlyCapCents: 800000, yearlyRemainingCents: received == null ? null : 800000 - received };
  const order = (f: Flag) => SEVERITY_ORDER.indexOf(f.severity);
  return {
    rulesVersion: r.version,
    fund: { fund: x.fund.fund, label: FUND_LABELS[x.fund.fund], ruleId: FUND_RULE[x.fund.fund], aiReason: x.fund.reason },
    flags: flags.sort((p, q) => order(p) - order(q)),
    money, documents: docs, vendors: vendorChecks, deadline, asks, postEventRuleId: 'R28',
  };
}

export function budgetCsv(x: Extraction, justifications: Record<string, string> = {}): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const d = (c: number | null) => (c == null ? '' : (c / 100).toFixed(2));
  const rows = x.items.map((i) => [i.description, i.vendor ?? '', justifications[i.id] ?? i.description, '', i.quantity == null ? '' : String(i.quantity), d(i.unitCostCents), d(amt(i))]);
  return [['Item', 'Vendor Name', 'Justification', 'Vendor Website', 'Quantity', 'Single Cost', 'Combined Cost'], ...rows].map((r) => r.map(q).join(',')).join('\n');
}
