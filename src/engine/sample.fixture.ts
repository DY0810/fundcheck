import type { Extraction } from '../shared/contracts';

// Hand-built extraction of SAMPLE_PLAN (src/fixtures/sample-plan.ts), matching the S0 probe output.
export const HAND_EXTRACTION: Extraction = {
  facts: {
    name: 'Spring Dance Showcase',
    date: '2027-04-09',
    endDate: null,
    time: '7pm',
    location: 'Bovard Auditorium',
    onCampus: true,
    expectedAttendance: 300,
    ticketed: true,
    openToAll: null,
    travel: false,
    multiDay: false,
    summary: 'A spring dance showcase in Bovard Auditorium.',
  },
  items: [
    { id: 'i1', description: 'Catering from Wolfgang Puck Catering', vendor: 'Wolfgang Puck Catering', quantity: null, unitCostCents: null, totalCents: 300000, category: 'food', matches: [], evidence: 'Catering from Wolfgang Puck Catering $3,000' },
    { id: 'i2', description: 'Helium balloon arch', vendor: null, quantity: null, unitCostCents: null, totalCents: 25000, category: 'decoration', matches: [{ ruleId: 'R1', confidence: 'high', reason: 'A helium balloon arch is made of balloons.' }], evidence: 'Helium balloon arch $250' },
    { id: 'i3', description: 'DJ', vendor: null, quantity: null, unitCostCents: null, totalCents: 60000, category: 'talent', matches: [{ ruleId: 'R3.talent', confidence: 'high', reason: 'A DJ is a paid performer.' }], evidence: 'DJ $600' },
    { id: 'i4', description: 'Bovard rental + AV crew', vendor: null, quantity: null, unitCostCents: null, totalCents: 480000, category: 'venue', matches: [], evidence: 'Bovard rental + AV crew $4,800' },
    { id: 'i5', description: 'Printed programs', vendor: null, quantity: null, unitCostCents: null, totalCents: 20000, category: 'promo', matches: [], evidence: 'Printed programs $200' },
  ],
  eventMatches: [{ ruleId: 'R4', confidence: 'high', reason: 'The event sells $10 tickets.', evidence: '$10 tickets at the door' }],
  fund: { fund: 'performing_visual_cultural', reason: 'A dance showcase is an arts event.' },
};

// S2 records src/fixtures/sample-extraction.json from the live model; tests run on it too once it exists.
const recorded = Object.values(import.meta.glob('../fixtures/sample-extraction.json', { eager: true, import: 'default' }));
export const SAMPLES: [string, Extraction][] = [
  ['hand-built', HAND_EXTRACTION],
  ...recorded.map((x): [string, Extraction] => ['recorded', x as Extraction]),
];
