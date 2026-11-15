import type { ExtractedItem, Extraction } from '../../shared/contracts';
import { SAMPLE_EXTRACTION } from './sample-extraction';

// Dev-only break-ui data (?fixture=worst | empty | 40). Plausible worst cases, never shipped as a feature.
const nullFacts: Extraction['facts'] = {
  name: null, date: null, endDate: null, time: null, location: null, onCampus: null,
  expectedAttendance: null, ticketed: null, openToAll: null, travel: null, multiDay: null, summary: null,
};

const item = (n: number, p: Partial<ExtractedItem>): ExtractedItem => ({
  id: `i${n}`, description: '', vendor: null, quantity: null, unitCostCents: null, totalCents: null,
  category: 'other', matches: [], evidence: '', ...p,
});

export const WORST: Extraction = {
  facts: {
    ...nullFacts,
    name: 'Annual Intercultural Spring Showcase and Community Celebration of Southeast Asian Performing Arts 2027',
    location: 'Ronald Tutor Campus Center Grand Ballroom, Rooms 450 A through D, 3607 Trousdale Parkway',
    endDate: '2027-04-11',
    multiDay: true,
  },
  items: [
    item(1, { description: 'Catering for 1,200 guests with vegetarian, vegan, halal, kosher and gluten-free options plus late-night snacks', vendor: "Bartholomew Fitzgerald's Northwind Industries Holdings Catering & Event Services LLC", totalCents: 1234567, category: 'food', evidence: 'catering ... $12,345.67' }),
    item(2, { description: 'Uber rides for performers between the hotel and the venue', category: 'travel', matches: [{ ruleId: 'R3.rideshare', confidence: 'low', reason: 'Rides may be rideshare, which is not funded.' }], evidence: 'Uber rides for performers' }),
    item(3, { description: 'LED balloon wall with performer meals', vendor: 'Jo', quantity: 2, unitCostCents: 89999, totalCents: null, category: 'decoration', matches: [{ ruleId: 'R1', confidence: 'high', reason: 'A balloon wall is made of balloons.' }, { ruleId: 'R3.raw_food', confidence: 'low', reason: 'Performer meals may need preparation.' }, { ruleId: 'R3.durable', confidence: 'low', reason: 'LED fixtures can be reused.' }], evidence: 'LED balloon wall with performer meals 2 x $899.99' }),
    item(4, { description: 'Programs', quantity: 300, unitCostCents: 67, totalCents: null, category: 'promo', evidence: '300 programs at 67¢' }),
    item(5, { description: '', category: 'other' }),
    item(6, { description: 'Café tacos 🌮 truck — Đặc biệt combo', vendor: 'Tacos 1986', totalCents: 0, category: 'food', evidence: 'Café tacos truck' }),
  ],
  eventMatches: [{ ruleId: 'R5.residence', confidence: 'low', reason: 'The afterparty may be at a member’s apartment.', evidence: 'afterparty at our place' }],
  fund: { fund: 'social_rec_startup', reason: 'A multi-day cultural celebration that fosters community among students from many backgrounds across campus and beyond.' },
};

export const EMPTY: Extraction = { facts: nullFacts, items: [], eventMatches: [], fund: SAMPLE_EXTRACTION.fund };

export const FORTY: Extraction = {
  ...SAMPLE_EXTRACTION,
  items: Array.from({ length: 40 }, (_, k) =>
    item(k + 1, { description: `Supply line ${k + 1}`, vendor: k % 3 ? null : `Vendor ${k + 1}`, totalCents: (k + 1) * 1250, category: k % 4 ? 'promo' : 'food' })),
};
