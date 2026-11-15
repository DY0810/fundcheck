import { describe, expect, it } from 'vitest';
import type { Answers, CheckInput, EvalCase, Extraction, ExtractedItem } from '../shared/contracts';
import cases from '../../evals/cases.json';
import recorded from './eval-extractions.fixture.json';
import { applyFixes, proposeFixes, rules, runCheck, vendors } from './index';
import { HAND_EXTRACTION, SAMPLES } from './sample.fixture';

const today = '2026-11-14';
const inputOf = (extraction: Extraction, answers: Answers = {}): CheckInput => ({ extraction, answers, today, rules, vendors });
const setup = (extraction: Extraction, answers: Answers = {}) => {
  const input = inputOf(extraction, answers);
  return { input, check: runCheck(input) };
};
const hard = (sev: string) => sev === 'not_eligible' || sev === 'over_cap';
const autoIds = (input: CheckInput) => proposeFixes(input, runCheck(input)).filter((f) => f.auto).map((f) => f.id);

// The 100 eval plans as the live model extracted them (S4 run, claude-opus-5-5), with each case's own answers and date
const EVALS: [string, CheckInput][] = (cases as EvalCase[]).map((c) => [
  c.id,
  { extraction: (recorded as unknown as Record<string, Extraction>)[c.id], answers: c.answers, today: c.today, rules, vendors },
]);

describe('proposeFixes', () => {
  it('offers one fix per clearable flag on the sample plan, in flag order', () => {
    const { input, check } = setup(HAND_EXTRACTION);
    expect(proposeFixes(input, check)).toEqual([
      { id: 'R4:event', ruleId: 'R4', kind: 'change_event', itemId: null, savesCents: 0, auto: false, label: "Don't sell tickets: make the event free" },
      { id: 'R1:i2', ruleId: 'R1', kind: 'remove_line', itemId: 'i2', savesCents: 25000, auto: true, label: 'Remove Helium balloon arch ($250) from the request' },
      { id: 'R3.talent:i3', ruleId: 'R3.talent', kind: 'remove_line', itemId: 'i3', savesCents: 60000, auto: true, label: 'Remove DJ ($600) from the request' },
      { id: 'R6:event', ruleId: 'R6', kind: 'reduce_request', itemId: null, savesCents: 80000, auto: true, label: 'Request the $4,000 cap for venue and personnel ($800 less)' },
    ]);
  });

  it('gives no fix for R5, R24, R31 or confirms, and one removal for a line with two §5 matches', () => {
    const items: ExtractedItem[] = [{ ...HAND_EXTRACTION.items[1], matches: [
      { ruleId: 'R1', confidence: 'high', reason: '' }, { ruleId: 'R3.gifts', confidence: 'high', reason: '' }] }];
    const x: Extraction = { ...HAND_EXTRACTION, facts: { ...HAND_EXTRACTION.facts, date: '2027-02-15', ticketed: false, openToAll: false }, items,
      eventMatches: [{ ruleId: 'R5.residence', confidence: 'high', reason: '', evidence: '' }] };
    const { input, check } = setup(x, { uepaNumber: 'bad' });
    expect(check.flags.map((f) => f.ruleId)).toEqual(expect.arrayContaining(['R5.open', 'R5.residence', 'R24', 'R1', 'R3.gifts', 'R16']));
    expect(proposeFixes(input, check).map((f) => f.id)).toEqual(['R1:i2']);
    expect(applyFixes(input, check, ['R1:i2']).requestCents).toBe(0);
  });

  it('turns R11 and R21 reductions into reduce_request fixes', () => {
    const food = { ...HAND_EXTRACTION.items[0], totalCents: 1200000 };
    const hotel: ExtractedItem = { ...HAND_EXTRACTION.items[4], id: 'h', description: 'Hotel', category: 'lodging', quantity: 3, unitCostCents: 45000, totalCents: null };
    const { input, check } = setup({ ...HAND_EXTRACTION, facts: { ...HAND_EXTRACTION.facts, ticketed: false }, items: [food, hotel], eventMatches: [] });
    expect(proposeFixes(input, check).map((f) => [f.id, f.savesCents, f.label])).toEqual([
      ['R11:event', 150000, 'Request food at $35 per person ($1,500 less)'],
      ['R21:h', 15000, 'Request Hotel at $400 per night ($150 less)'],
    ]);
  });
});

describe('applyFixes', () => {
  it.each(SAMPLES)('%s sample: every auto fix gives $7,200 with only R4 open; R4 too empties open', (_, x) => {
    const { input, check } = setup(x);
    const all = applyFixes(input, check, autoIds(input));
    expect(all.requestCents).toBe(720000);
    expect(all.open.map((f) => f.id)).toEqual(['R4:event']);
    expect(all.extraction.items.map((i) => i.id)).toEqual(['i1', 'i4', 'i5']);
    const withR4 = applyFixes(input, check, [...autoIds(input), 'R4:event']);
    expect(withR4.open).toEqual([]);
    expect(withR4.extraction.facts.ticketed).toBe(false);
    expect(withR4.extraction.eventMatches.map((m) => m.ruleId)).not.toContain('R4');
    expect(withR4.check.flags.map((f) => f.ruleId)).not.toContain('R4');
    expect(withR4.requestCents).toBe(720000);
  });

  it('with nothing approved, requests the full total (capped by the yearly remainder) and leaves every hard flag open', () => {
    const { input, check } = setup(HAND_EXTRACTION);
    const none = applyFixes(input, check, []);
    expect(none.requestCents).toBe(885000);
    expect(none.open).toEqual(check.flags.filter((f) => hard(f.severity)));
    expect(none.extraction).toEqual(HAND_EXTRACTION);
    const capped = setup(HAND_EXTRACTION, { receivedThisYearCents: 700000 });
    expect(applyFixes(capped.input, capped.check, []).requestCents).toBe(100000);
    expect(applyFixes(capped.input, capped.check, []).open.map((f) => f.ruleId)).toContain('R9');
  });

  it('keeps a line the user did not remove: it stays in the request and its flag stays open', () => {
    const { input, check } = setup(HAND_EXTRACTION);
    const r = applyFixes(input, check, ['R1:i2', 'R6:event']);
    expect(r.requestCents).toBe(885000 - 25000 - 80000);
    expect(r.open.map((f) => f.id)).toEqual(['R4:event', 'R3.talent:i3']);
    expect(r.check.flags.map((f) => f.id)).toContain('R6:event'); // lines unchanged; the cap is cleared in open only
  });

  it('ignores unknown and repeated ids', () => {
    const { input, check } = setup(HAND_EXTRACTION);
    const r = applyFixes(input, check, ['R1:i2', 'R1:i2', 'nope', 'R16:event']);
    expect(r.approved).toEqual(['R1:i2']);
    expect(r.requestCents).toBe(885000 - 25000);
  });

  it('never mutates its input', () => {
    const { input, check } = setup(HAND_EXTRACTION);
    const before = structuredClone({ input, check });
    applyFixes(input, check, [...autoIds(input), 'R4:event']);
    expect({ input, check }).toEqual(before);
  });

  it.each(EVALS)('%s (recorded): approving every auto fix requests exactly eligibleCents; savings stay true', (_, input) => {
    const check = runCheck(input);
    const before = structuredClone(input.extraction);
    const all = applyFixes(input, check, autoIds(input));
    expect(all.requestCents).toBe(check.money.eligibleCents);
    expect(all.fixes).toEqual(proposeFixes(input, check)); // no fix changes another's savings
    expect(all.open.every((f) => f.itemId === null)).toBe(true); // every flagged line was removable
    const none = applyFixes(input, check, []);
    const left = check.money.yearlyRemainingCents;
    expect(none.requestCents).toBe(left === null ? check.money.totalCents : Math.min(check.money.totalCents, left));
    expect(none.open).toEqual(check.flags.filter((f) => hard(f.severity)));
    expect(input.extraction).toEqual(before);
  });
});
