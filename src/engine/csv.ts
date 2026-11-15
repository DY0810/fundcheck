import type { ExtractedItem, VendorList } from '../shared/contracts';
import vendorsJson from '../shared/vendors.json';
import { lineCents } from './money';
import { matchVendor } from './vendor';

const vendors = vendorsJson as VendorList;

export const BUDGET_FILE_NAME = 'RSO_Lastname_Firstname_BudgetProposal.csv';
const HEADER = ['Item', 'Vendor Name', 'Justification', 'Vendor Website', 'Quantity', 'Single Cost', 'Combined Cost'];

const dollars = (c: number) => (c / 100).toFixed(2);
// Every field is quoted. A leading = + - @ would run as a spreadsheet formula, so it gets a ' in front.
const field = (v: string) => `"${v.replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`;

const website = (i: ExtractedItem) => {
  const name = i.vendor && i.category === 'food' ? matchVendor(i.vendor, vendors).matchedName : undefined;
  return vendors.find((v) => v.name === name)?.website ?? '';
};

/** The USG budget template columns, one row per line item. */
export function budgetCsv(items: ExtractedItem[], justifications: Record<string, string>): string {
  const rows = items.map((i) => {
    const qty = i.quantity ?? 1;
    const total = lineCents(i);
    const single = i.unitCostCents ?? Math.round(total / (qty || 1));
    return [i.description, i.vendor ?? '', justifications[i.id] ?? '', website(i), String(qty), dollars(single), dollars(total)];
  });
  return [HEADER, ...rows].map((r) => r.map(field).join(',')).join('\n') + '\n';
}
