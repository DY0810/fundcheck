import type { Answers, Cents, ExtractedItem, Extraction, Money } from '../shared/contracts';

export const lineCents = (i: ExtractedItem): Cents => i.totalCents ?? (i.quantity ?? 1) * (i.unitCostCents ?? 0);

/** "$4,800" or "$12.50". */
export const usd = (c: Cents) =>
  '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 });

/** Applies answers.matchAnswers: a low match answered true counts as high; answered false, it is dropped. */
export function resolve<M extends { ruleId: string; confidence: 'high' | 'low' }>(key: string, ms: M[], answers: Answers): M[] {
  return ms.flatMap((m) => {
    if (m.confidence === 'high') return [m];
    const a = answers.matchAnswers?.[`${key}:${m.ruleId}`];
    return a === undefined ? [m] : a ? [{ ...m, confidence: 'high' as const }] : [];
  });
}

/** R1 and R3.* lines with a high-confidence (or confirmed) match. R20 is confirm-only and never subtracted. */
export const isIneligible = (i: ExtractedItem, answers: Answers) =>
  resolve(i.id, i.matches, answers).some((m) => m.confidence === 'high' && (m.ruleId === 'R1' || m.ruleId.startsWith('R3.')));

/** R21: cents over $400 per night, times nights. */
export function lodgingExcess(i: ExtractedItem): Cents {
  if (i.category !== 'lodging') return 0;
  const nights = i.quantity ?? 1;
  return Math.max(0, i.unitCostCents != null ? (i.unitCostCents - 40000) * nights : lineCents(i) - 40000 * nights);
}

const sum = (items: ExtractedItem[]) => items.reduce((s, i) => s + lineCents(i), 0);

/** The lines that stay in the request, and the R6 / R11 / R21 reductions on them. */
export function reductions(x: Extraction, answers: Answers) {
  const ok = x.items.filter((i) => !isIneligible(i, answers)); // cap bases exclude removed lines, so nothing is subtracted twice
  const venuePersonnel = sum(ok.filter((i) => i.category === 'venue' || i.category === 'personnel'));
  const food = sum(ok.filter((i) => i.category === 'food'));
  const att = x.facts.expectedAttendance && x.facts.expectedAttendance > 0 ? x.facts.expectedAttendance : null;
  return {
    ok,
    venuePersonnel,
    food,
    att,
    r6: x.facts.onCampus === false ? 0 : Math.max(0, venuePersonnel - 400000), // the quote says "on-campus venue rentals"
    r11: att ? Math.max(0, food - 3500 * att) : 0,
    r21: ok.reduce((s, i) => s + lodgingExcess(i), 0),
  };
}

export function buildMoney(x: Extraction, answers: Answers): Money {
  const { ok, venuePersonnel, food, att, r6, r11, r21 } = reductions(x, answers);
  const totalCents = sum(x.items);
  const ineligibleCents = totalCents - sum(ok);
  const capReductionCents = r6 + r11 + r21;
  const received = answers.receivedThisYearCents;
  return {
    totalCents,
    ineligibleCents,
    venuePersonnelCents: venuePersonnel,
    capReductionCents,
    eligibleCents: totalCents - ineligibleCents - capReductionCents,
    foodCents: food,
    foodPerPersonCents: att ? Math.round(food / att) : null,
    yearlyCapCents: 800000,
    yearlyRemainingCents: received == null ? null : Math.max(0, 800000 - received),
  };
}
