import type { Answers, DocItem, ExtractedItem } from '../shared/contracts';
import { BUDGET_FILE_NAME } from './csv';

export const UEPA = /^A\d{5,6}$/;

/** `items` are the lines that stay in the request (ineligible lines need no quote). R27 and R28 are copy, not documents. */
export function buildDocs(a: { items: ExtractedItem[]; onCampus: boolean | null; travel: boolean; answers: Answers }): DocItem[] {
  const { items, answers } = a;
  const uepa = answers.uepaNumber?.trim();
  const docs: DocItem[] = [];
  if (a.onCampus !== false) docs.push({ id: 'R15', ruleId: 'R15', label: 'ESR for the on-campus event', status: 'needed' });
  docs.push({ id: 'R16', ruleId: 'R16', label: 'UEPA number (an A and 5 or 6 digits)', status: !uepa ? 'needed' : UEPA.test(uepa) ? 'done' : 'invalid' });
  docs.push({ id: 'R17', ruleId: 'R17', label: 'Full budget proposal (download the budget CSV)', fileName: BUDGET_FILE_NAME, status: 'needed' });

  // R17: one quote per distinct vendor; a line with no vendor gets its own
  const seen = new Set<string>();
  for (const i of items) {
    const name = i.vendor?.trim() || i.description.trim();
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    docs.push({
      id: `R17:${name}`,
      ruleId: 'R17',
      label: i.vendor?.trim() ? `Quote from ${name}` : `Quote for ${name} (name the vendor)`,
      fileName: `RSO_Lastname_Firstname_${name.replace(/[^A-Za-z0-9]+/g, '')}_Quote.pdf`,
      status: 'needed',
    });
  }

  if (items.some((i) => i.category === 'food')) {
    docs.push(
      { id: 'R12:health', ruleId: 'R12', label: 'Health Permit from the food vendor', status: 'needed' },
      { id: 'R12:insurance', ruleId: 'R12', label: 'Certificate of Insurance from the food vendor', status: 'needed' },
      { id: 'R14', ruleId: 'R14', label: 'Food and beverage form from Hospitality', status: 'needed' },
      { id: 'R13', ruleId: 'R13', label: 'Food justification: why the event needs food', status: 'needed' },
    );
  }
  // Reminder only: FundCheck never collects traveller details
  if (a.travel) docs.push({ id: 'R22', ruleId: 'R22', label: 'Traveller details, entered on the USG form itself', status: 'needed' });
  docs.push({ id: 'R32', ruleId: 'R32', label: 'USG Funding Department modules', status: answers.modulesCompleted === true ? 'done' : 'needed' });
  return docs;
}
