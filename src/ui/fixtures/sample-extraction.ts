import type { Extraction } from '../../shared/contracts';

// Hand-written stand-in for src/fixtures/sample-extraction.json (S2) so the UI can run with no API.
// shortcut: hand-written, switch ?fixture=1 to S2's recorded JSON once it lands.
export const SAMPLE_EXTRACTION: Extraction = {
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
    summary: 'A spring dance showcase in Bovard Auditorium for about 300 people.',
  },
  items: [
    { id: 'i1', description: 'Catering from Wolfgang Puck Catering', vendor: 'Wolfgang Puck Catering', quantity: null, unitCostCents: null, totalCents: 300000, category: 'food', matches: [], evidence: 'Catering from Wolfgang Puck Catering $3,000' },
    { id: 'i2', description: 'Helium balloon arch', vendor: null, quantity: 1, unitCostCents: 25000, totalCents: 25000, category: 'decoration', matches: [{ ruleId: 'R1', confidence: 'high', reason: 'A helium balloon arch is made of balloons.' }], evidence: 'Helium balloon arch $250' },
    { id: 'i3', description: 'DJ', vendor: null, quantity: 1, unitCostCents: 60000, totalCents: 60000, category: 'talent', matches: [{ ruleId: 'R3.talent', confidence: 'high', reason: 'A DJ is paid to perform at the event.' }], evidence: 'DJ $600' },
    { id: 'i4', description: 'Bovard rental + AV crew', vendor: null, quantity: 1, unitCostCents: 480000, totalCents: 480000, category: 'venue', matches: [], evidence: 'Bovard rental + AV crew $4,800' },
    { id: 'i5', description: 'Printed programs', vendor: null, quantity: null, unitCostCents: null, totalCents: 20000, category: 'promo', matches: [], evidence: 'Printed programs $200' },
  ],
  eventMatches: [{ ruleId: 'R4', confidence: 'high', reason: 'Selling $10 tickets at the door is a ticket sale.', evidence: '$10 tickets at the door' }],
  fund: { fund: 'performing_visual_cultural', reason: 'A dance showcase is an arts event that celebrates and builds community.' },
};
