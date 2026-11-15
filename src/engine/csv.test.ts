import { describe, expect, it } from 'vitest';
import { budgetCsv, BUDGET_FILE_NAME } from './csv';
import { HAND_EXTRACTION } from './sample.fixture';

describe('budgetCsv', () => {
  it('writes the USG template header and quotes every field', () => {
    const [header, first] = budgetCsv(HAND_EXTRACTION.items, { i1: 'Dinner for 300 performers and guests' }).split('\n');
    expect(header).toBe('"Item","Vendor Name","Justification","Vendor Website","Quantity","Single Cost","Combined Cost"');
    expect(first).toBe('"Catering from Wolfgang Puck Catering","Wolfgang Puck Catering","Dinner for 300 performers and guests","","1","3000.00","3000.00"');
    expect(BUDGET_FILE_NAME).toBe('RSO_Lastname_Firstname_BudgetProposal.csv');
  });

  it('escapes a comma and a quote, and computes single cost from the total', () => {
    const item = { ...HAND_EXTRACTION.items[4], id: 'x', description: 'Programs, 12" x 18"', vendor: 'Ready Reproductions, Inc.', quantity: 3, totalCents: 1000 };
    expect(budgetCsv([item], {}).split('\n')[1]).toBe('"Programs, 12"" x 18""","Ready Reproductions, Inc.","","","3","3.33","10.00"');
  });

  it('neutralises spreadsheet formulas in pasted text', () => {
    const item = { ...HAND_EXTRACTION.items[4], description: '=HYPERLINK("http://x")' };
    expect(budgetCsv([item], {}).split('\n')[1]).toMatch(/^"'=HYPERLINK\(""http:\/\/x""\)"/);
  });

  it('fills the website from the vendor list', () => {
    const item = { ...HAND_EXTRACTION.items[0], vendor: 'Bella Pita' };
    expect(budgetCsv([item], {})).toContain('"https://bellapita.com"');
  });
});
