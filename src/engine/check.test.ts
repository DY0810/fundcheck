import { describe, expect, it } from 'vitest';
import type { Answers, CheckResult, Extraction, ExtractedItem, FundId } from '../shared/contracts';
import { SEVERITY_ORDER } from '../shared/contracts';
import { budgetCsv, BUDGET_FILE_NAME, deadlineCard, rules, runCheck, vendors } from './index';
import { HAND_EXTRACTION, SAMPLES } from './sample.fixture';

const today = '2026-11-14';
const run = (extraction: Extraction, answers: Answers = {}) => runCheck({ extraction, answers, today, rules, vendors });
const ids = (r: CheckResult) => r.flags.map((f) => f.ruleId);
const askIds = (r: CheckResult) => r.asks.map((a) => a.id);
const item = (p: Partial<ExtractedItem>): ExtractedItem => ({
  id: 'i9', description: 'Thing', vendor: null, quantity: null, unitCostCents: null, totalCents: 10000, category: 'other', matches: [], evidence: '', ...p,
});
const plan = (p: { items?: ExtractedItem[]; facts?: Partial<Extraction['facts']>; fund?: FundId; eventMatches?: Extraction['eventMatches'] } = {}): Extraction => ({
  facts: { ...HAND_EXTRACTION.facts, ticketed: false, openToAll: true, ...p.facts },
  items: p.items ?? [],
  eventMatches: p.eventMatches ?? [],
  fund: { fund: p.fund ?? 'performing_visual_cultural', reason: 'r' },
});

describe('runCheck on the sample plan', () => {
  it.each(SAMPLES)('%s extraction gives every golden number', (_, x) => {
    const r = run(x);
    expect(r.money).toMatchObject({ totalCents: 885000, ineligibleCents: 85000, venuePersonnelCents: 480000, capReductionCents: 80000, eligibleCents: 720000, foodPerPersonCents: 1000 });
    expect(ids(r)).toEqual(expect.arrayContaining(['R4', 'R1', 'R3.talent', 'R6', 'R7']));
    expect(r.fund).toMatchObject({ fund: 'performing_visual_cultural', label: 'Performing, Visual Arts, & Cultural Fund', ruleId: 'R29.performing' });
    expect(r.deadline).toMatchObject({ status: 'safe', headline: '2027-02-03', latest: '2027-02-24', weeks: 6, blackout: false });
    expect(r.vendors.find((v) => v.vendor.startsWith('Wolfgang'))).toMatchObject({ status: 'found', matchedName: 'Wolfgang Puck Catering' });
    expect(r.rulesVersion).toBe(rules.version);
    expect(r.postEventRuleId).toBe('R28');
  });

  it('builds the flags, asks and documents the golden path shows', () => {
    const r = run(HAND_EXTRACTION);
    expect(r.flags.map((f) => [f.id, f.severity, f.badge])).toEqual([
      ['R4:event', 'not_eligible', 'ai_judged'],
      ['R1:i2', 'not_eligible', 'ai_judged'],
      ['R3.talent:i3', 'not_eligible', 'ai_judged'],
      ['R6:event', 'over_cap', 'rule_math'],
      ['R7:event', 'review_note', 'rule_math'],
      ['R11:event', 'pass', 'rule_math'],
    ]);
    expect(r.flags[1]).toMatchObject({ message: 'Helium balloon arch ($250) is not eligible per §5.', amountCents: 25000, aiReason: expect.any(String), evidence: 'Helium balloon arch $250' });
    expect(r.flags[3]).toMatchObject({ amountCents: 80000 });
    expect(askIds(r)).toEqual(['facts.openToAll', 'receivedThisYearCents', 'eventsFundedThisSemester', 'paymentDueDate', 'uepaNumber', 'modulesCompleted', 'otherFundingSources']);
    expect(r.documents.map((d) => d.id)).toEqual([
      'R15', 'R16', 'R17', 'R17:Wolfgang Puck Catering', 'R17:Bovard rental + AV crew', 'R17:Printed programs',
      'R12:health', 'R12:insurance', 'R14', 'R13', 'R32',
    ]);
    expect(r.documents[3].fileName).toBe('RSO_Lastname_Firstname_WolfgangPuckCatering_Quote.pdf');
  });

  it('never puts a USG quote in a message', () => {
    const kitchenSink = plan({
      fund: 'social_rec_startup',
      facts: { multiDay: true, ticketed: true, openToAll: false },
      eventMatches: [{ ruleId: 'R5.residence', confidence: 'high', reason: '', evidence: '' }],
      items: [
        item({ id: 'a', description: 'Team t-shirts', category: 'promo' }),
        item({ id: 'b', description: 'Hotel', category: 'lodging', quantity: 2, unitCostCents: 50000 }),
        item({ id: 'c', description: 'Tacos', vendor: 'Unknown Taco Stand', category: 'food', totalCents: 2000000 }),
        item({ id: 'd', description: 'Wine', category: 'food', matches: [{ ruleId: 'R3.alcohol', confidence: 'high', reason: '' }] }),
      ],
    });
    const r = run(kitchenSink, { uepaNumber: 'B1', otherFundingSources: 'Dornsife grant', receivedThisYearCents: 790000, eventsFundedThisSemester: 4 });
    expect(new Set(ids(r))).toEqual(new Set(['R4', 'R5.open', 'R5.residence', 'R3.alcohol', 'R8', 'R9', 'R10', 'R11', 'R19', 'R21', 'R18', 'R16', 'R33', 'R7']));
    for (const fl of [...r.flags, ...run(HAND_EXTRACTION).flags]) {
      for (const q of rules.rules.find((x) => x.id === fl.ruleId)!.quotes) if (q.length >= 12) expect(fl.message).not.toContain(q);
    }
    const sev = r.flags.map((fl) => SEVERITY_ORDER.indexOf(fl.severity));
    expect(sev).toEqual([...sev].sort((a, b) => a - b));
  });
});

describe('runCheck rules', () => {
  it('turns a low-confidence match into an ask, then follows the answer', () => {
    const x = plan({ items: [item({ id: 'i1', description: "Performers' meals", category: 'food', matches: [{ ruleId: 'R3.talent', confidence: 'low', reason: '' }] })] });
    expect(ids(run(x))).not.toContain('R3.talent');
    expect(run(x).asks.find((a) => a.id === 'match:i1:R3.talent')).toMatchObject({ kind: 'yesno', ruleId: 'R3.talent' });
    expect(ids(run(x, { matchAnswers: { 'i1:R3.talent': true } }))).toContain('R3.talent');
    const no = run(x, { matchAnswers: { 'i1:R3.talent': false } });
    expect(ids(no)).not.toContain('R3.talent');
    expect(askIds(no)).not.toContain('match:i1:R3.talent');
  });

  it('asks R20 positively: Yes (a PO-vendor rental) clears it, No raises the confirm', () => {
    const r20 = [item({ id: 'i4', description: 'Bovard rental + AV crew', category: 'venue', matches: [{ ruleId: 'R20', confidence: 'low', reason: '' }] })];
    const x = plan({ items: r20 });
    expect(run(x).asks.find((a) => a.id === 'match:i4:R20')?.question).toBe('Is "Bovard rental + AV crew" rented from a USC PO vendor?');
    const yes = run(x, { matchAnswers: { 'i4:R20': true } });
    expect(ids(yes)).not.toContain('R20');
    expect(askIds(yes)).not.toContain('match:i4:R20');
    expect(run(x, { matchAnswers: { 'i4:R20': false } }).flags.find((fl) => fl.ruleId === 'R20')).toMatchObject({ severity: 'confirm' });
  });

  it('words every match question as a plain yes/no, with no double negative', () => {
    const itemRules = ['R1', 'R3.reimbursement', 'R3.charity', 'R3.alcohol', 'R3.gifts', 'R3.durable', 'R3.raw_food', 'R3.restaurant', 'R3.rideshare',
      'R3.deposit', 'R3.p2p', 'R3.talent', 'R3.subscription', 'R3.international', 'R3.jewelry', 'R20'] as const;
    const items = itemRules.map((ruleId, n) => item({ id: `q${n}`, description: 'Thing', matches: [{ ruleId, confidence: 'low', reason: '' }] }));
    const eventMatches = (['R4', 'R5.open', 'R5.residence', 'R31'] as const).map((ruleId) => ({ ruleId, confidence: 'low' as const, reason: '', evidence: '' }));
    const qs = [...run(plan({ items })).asks, ...run(plan({ eventMatches, fund: 'professional_academic' })).asks].filter((a) => a.id.startsWith('match:'));
    expect(qs).toHaveLength(itemRules.length + 4);
    for (const a of qs) {
      expect(a.question, a.id).toMatch(/^(Is|Does|Will) .+\?$/);
      expect(a.question, a.id).not.toMatch(/\bnot\b|n't/);
    }
  });

  it('applies R31 only to the professional fund and R20 only to the performing fund', () => {
    const r31 = { eventMatches: [{ ruleId: 'R31' as const, confidence: 'high' as const, reason: '', evidence: '' }] };
    expect(ids(run(plan({ ...r31, fund: 'professional_academic' })))).toContain('R31');
    expect(ids(run(plan({ ...r31, fund: 'social_rec_startup' })))).not.toContain('R31');
    const items = [item({ description: 'Paper lanterns', category: 'decoration', matches: [{ ruleId: 'R20', confidence: 'high', reason: '' }] })];
    expect(run(plan({ items })).flags.find((fl) => fl.ruleId === 'R20')).toMatchObject({ severity: 'confirm', badge: 'ai_judged' });
    expect(ids(run(plan({ items, fund: 'philanthropy' })))).not.toContain('R20');
    expect(run(plan({ items })).money.ineligibleCents).toBe(0);
  });

  it('R9: over the yearly cap once the received amount is known', () => {
    const capped = run(HAND_EXTRACTION, { receivedThisYearCents: 700000 });
    expect(capped.money.eligibleCents).toBe(100000);
    expect(capped.flags.find((fl) => fl.ruleId === 'R9')).toMatchObject({
      severity: 'over_cap',
      amountCents: 620000,
      message: 'The request ($7,200) is $6,200 more than the $1,000 left of your $8,000 for the year, so the estimate is capped at $1,000 (§3).',
    });
    expect(ids(run(HAND_EXTRACTION, { receivedThisYearCents: 0 }))).not.toContain('R9');
  });

  it('R10: over the cap at 4 funded events', () => {
    expect(ids(run(HAND_EXTRACTION, { eventsFundedThisSemester: 4 }))).toContain('R10');
    expect(ids(run(HAND_EXTRACTION, { eventsFundedThisSemester: 3 }))).not.toContain('R10');
  });

  it('R11: review note with the reduction, and an ask with no attendance', () => {
    const food = [item({ category: 'food', totalCents: 1200000 })];
    expect(run(plan({ items: food, facts: { expectedAttendance: 300 } })).flags.find((fl) => fl.ruleId === 'R11')).toMatchObject({ severity: 'review_note', amountCents: 150000 });
    const r = run(plan({ items: food, facts: { expectedAttendance: null } }));
    expect(ids(r)).not.toContain('R11');
    expect(askIds(r)).toContain('facts.expectedAttendance');
  });

  it('R18: an unlisted food vendor is "not found, verify" and moves the deadline to 8 weeks', () => {
    const items = [item({ id: 'f', description: 'Tacos', vendor: 'Unknown Taco Stand', category: 'food' })];
    const r = run(plan({ items }));
    expect(r.flags.find((fl) => fl.ruleId === 'R18')?.message).toContain('not found on the list, verify');
    expect(r.deadline.weeks).toBe(8);
    const told = run(plan({ items }), { vendorOnList: { f: true } });
    expect(ids(told)).not.toContain('R18');
    expect(told.deadline.weeks).toBe(6);
  });

  it('checks non-food vendors against the Other Vendors tab too', () => {
    const found = run(plan({ items: [item({ id: 'l', description: 'Stage lighting rental', vendor: 'Kinetic Lighting', category: 'venue' })] }));
    expect(found.vendors).toEqual([{ itemId: 'l', vendor: 'Kinetic Lighting', status: 'found', matchedName: 'Kinetic Lighting, Inc.' }]);
    expect(found.deadline.weeks).toBe(6);
    expect(ids(found)).not.toContain('R18');

    const missing = run(plan({ items: [item({ id: 'p', description: 'Flyers', vendor: 'Kinko Copies', category: 'promo' })] }));
    expect(missing.vendors[0].status).toBe('not_found_verify');
    expect(missing.deadline.weeks).toBe(8);
    expect(missing.flags.find((fl) => fl.ruleId === 'R18')?.message).toBe('Kinko Copies: not found on the list, verify with the Funding Department.');

    expect(run(plan({ items: [item({ id: 'n', vendor: null })] })).vendors).toEqual([{ itemId: 'n', vendor: '', status: 'not_applicable' }]);
  });

  it('a listed vendor never makes an item eligible', () => {
    const items = [
      item({ id: 'b', description: 'Balloon arch', vendor: 'Balloon Wonderland', category: 'decoration', totalCents: 25000, matches: [{ ruleId: 'R1', confidence: 'high', reason: '' }] }),
      item({ id: 'd', description: 'DJ set', vendor: 'Sound Decision Entertainment', category: 'talent', totalCents: 60000, matches: [{ ruleId: 'R3.talent', confidence: 'high', reason: '' }] }),
    ];
    const r = run(plan({ items }));
    expect(r.vendors.map((v) => v.status)).toEqual(['found', 'found']);
    expect(r.flags.filter((fl) => fl.severity === 'not_eligible').map((fl) => [fl.id, fl.message])).toEqual([
      ['R1:b', 'Balloon arch ($250) is not eligible per §5.'],
      ['R3.talent:d', 'DJ set ($600) is not eligible per §5.'],
    ]);
    expect(r.money).toMatchObject({ ineligibleCents: 85000, eligibleCents: 0 });
  });

  it('R21 and travel: lodging over $400 a night is a review note, with 9 weeks and the R22 reminder', () => {
    const r = run(plan({ items: [item({ description: 'Hotel', category: 'lodging', quantity: 3, unitCostCents: 45000 })] }));
    expect(r.flags.find((fl) => fl.ruleId === 'R21')).toMatchObject({ severity: 'review_note', badge: 'rule_math', amountCents: 15000 });
    expect(r.deadline.weeks).toBe(9);
    expect(r.documents.map((d) => d.id)).toContain('R22');
  });

  it('R24: a blackout date is not eligible', () => {
    const r = run(plan({ facts: { date: '2026-12-10' } }));
    expect(r.flags.find((fl) => fl.ruleId === 'R24')).toMatchObject({ severity: 'not_eligible', message: "Event date falls in USG's no-funding window (per the application form)." });
    expect(r.deadline.status).toBe('blackout');
  });

  it('R16, R32, R33, R30 and R19 follow the answers', () => {
    expect(run(plan(), { uepaNumber: 'A12345' }).documents.find((d) => d.id === 'R16')?.status).toBe('done');
    const bad = run(plan(), { uepaNumber: '12345' });
    expect(ids(bad)).toContain('R16');
    expect(bad.documents.find((d) => d.id === 'R16')?.status).toBe('invalid');
    expect(run(plan(), { modulesCompleted: true }).documents.find((d) => d.id === 'R32')?.status).toBe('done');
    expect(ids(run(plan(), { otherFundingSources: 'N/A' }))).not.toContain('R33');
    expect(ids(run(plan(), { otherFundingSources: 'Dornsife grant' }))).toContain('R33');
    expect(askIds(run(plan({ fund: 'social_rec_startup' })))).toContain('startupEligible');
    expect(askIds(run(plan()))).not.toContain('startupEligible');
    const shirts = [item({ description: 'Club tees', category: 'promo' }), item({ id: 'j', description: 'Committee lunch', category: 'food' })];
    expect(run(plan({ items: shirts, fund: 'social_rec_startup' })).flags.filter((fl) => fl.ruleId === 'R19').map((fl) => fl.itemId)).toEqual(['i9']);
  });

  it('asks for unknown facts and does not mutate its input', () => {
    const x = plan({ facts: { date: null, expectedAttendance: null, ticketed: null, openToAll: null } });
    const before = JSON.stringify(x);
    const r = run(x, {});
    expect(askIds(r).slice(0, 4)).toEqual(['facts.date', 'facts.expectedAttendance', 'facts.ticketed', 'facts.openToAll']);
    expect(r.deadline.status).toBe('unknown_date');
    expect(JSON.stringify(x)).toBe(before);
  });

  it('dedupes a repeated model match', () => {
    const m = { ruleId: 'R1' as const, confidence: 'high' as const, reason: '' };
    expect(run(plan({ items: [item({ matches: [m, m] })] })).flags.filter((fl) => fl.ruleId === 'R1')).toHaveLength(1);
  });

  it('re-exports the CSV and deadline helpers', () => {
    expect(BUDGET_FILE_NAME).toMatch(/\.csv$/);
    expect(budgetCsv([], {})).toMatch(/^"Item"/);
    expect(deadlineCard({ event: '2027-04-09', today, travel: false, newVendor: false }).headline).toBe('2027-02-03');
  });
});
