import { describe, expect, it } from 'vitest';
import type { Extraction, ExtractedItem } from '../shared/contracts';
import { buildMoney } from './money';
import { HAND_EXTRACTION, SAMPLES } from './sample.fixture';

const withItems = (items: Partial<ExtractedItem>[], facts: Partial<Extraction['facts']> = {}): Extraction => ({
  ...HAND_EXTRACTION,
  facts: { ...HAND_EXTRACTION.facts, ...facts },
  items: items.map((p, n) => ({ id: `i${n + 1}`, description: 'x', vendor: null, quantity: null, unitCostCents: null, totalCents: null, category: 'other', matches: [], evidence: '', ...p })),
});

describe('buildMoney', () => {
  it.each(SAMPLES)('golden numbers on the %s sample extraction', (_, x) => {
    expect(buildMoney(x, {})).toMatchObject({
      totalCents: 885000,
      ineligibleCents: 85000,
      venuePersonnelCents: 480000,
      capReductionCents: 80000,
      eligibleCents: 720000,
      foodCents: 300000,
      foodPerPersonCents: 1000,
      yearlyCapCents: 800000,
      yearlyRemainingCents: null,
    });
  });

  it('subtracts an ineligible line once, even if it is also personnel or has two matches', () => {
    const items = HAND_EXTRACTION.items.map((i) =>
      i.id === 'i3' ? { ...i, category: 'personnel' as const, matches: [...i.matches, { ruleId: 'R3.gifts' as const, confidence: 'high' as const, reason: '' }] } : i,
    );
    expect(buildMoney({ ...HAND_EXTRACTION, items }, {})).toMatchObject({ ineligibleCents: 85000, venuePersonnelCents: 480000, eligibleCents: 720000 });
  });

  it('uses totalCents, else quantity × unit cost', () => {
    expect(buildMoney(withItems([{ quantity: 3, unitCostCents: 1000 }, { unitCostCents: 500 }, { totalCents: 700, quantity: 9, unitCostCents: 9 }]), {}).totalCents).toBe(4200);
  });

  it('R11: removes food over $35 per person, and only when attendance is known', () => {
    const x = withItems([{ category: 'food', totalCents: 1200000 }], { expectedAttendance: 300 });
    expect(buildMoney(x, {})).toMatchObject({ foodPerPersonCents: 4000, capReductionCents: 150000, eligibleCents: 1050000 });
    const unknown = withItems([{ category: 'food', totalCents: 1200000 }], { expectedAttendance: null });
    expect(buildMoney(unknown, {})).toMatchObject({ foodPerPersonCents: null, capReductionCents: 0 });
  });

  it('R21: removes the lodging excess over $400 per night × nights', () => {
    expect(buildMoney(withItems([{ category: 'lodging', quantity: 3, unitCostCents: 45000 }]), {}).capReductionCents).toBe(15000);
    expect(buildMoney(withItems([{ category: 'lodging', quantity: 2, totalCents: 90000 }]), {}).capReductionCents).toBe(10000);
    expect(buildMoney(withItems([{ category: 'lodging', quantity: 2, unitCostCents: 40000 }]), {}).capReductionCents).toBe(0);
  });

  it('R6 applies to on-campus venues only (the quote says "on-campus venue rentals")', () => {
    expect(buildMoney(withItems([{ category: 'venue', totalCents: 500000 }], { onCampus: false }), {}).capReductionCents).toBe(0);
    expect(buildMoney(withItems([{ category: 'venue', totalCents: 500000 }], { onCampus: null }), {}).capReductionCents).toBe(100000);
  });

  it('counts a low-confidence match only once answered true', () => {
    const x = withItems([{ totalCents: 5000, matches: [{ ruleId: 'R3.gifts', confidence: 'low', reason: '' }] }]);
    expect(buildMoney(x, {}).ineligibleCents).toBe(0);
    expect(buildMoney(x, { matchAnswers: { 'i1:R3.gifts': true } }).ineligibleCents).toBe(5000);
    expect(buildMoney(x, { matchAnswers: { 'i1:R3.gifts': false } }).ineligibleCents).toBe(0);
  });

  it('never subtracts R20 (confirm only)', () => {
    expect(buildMoney(withItems([{ totalCents: 5000, matches: [{ ruleId: 'R20', confidence: 'high', reason: '' }] }]), {}).ineligibleCents).toBe(0);
  });

  it('computes what is left of the $8,000 yearly cap', () => {
    expect(buildMoney(HAND_EXTRACTION, { receivedThisYearCents: 700000 })).toMatchObject({ yearlyRemainingCents: 100000, eligibleCents: 100000, capReductionCents: 80000 });
    expect(buildMoney(HAND_EXTRACTION, { receivedThisYearCents: 0 }).eligibleCents).toBe(720000);
    expect(buildMoney(HAND_EXTRACTION, { receivedThisYearCents: 900000 }).eligibleCents).toBe(0);
    expect(buildMoney(HAND_EXTRACTION, {}).eligibleCents).toBe(720000);
  });
});
