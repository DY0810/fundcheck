import type { RulesFile, VendorList } from '../shared/contracts';
import rulesJson from '../shared/rules.json';
import vendorsJson from '../shared/vendors.json';

export { runCheck } from './check';
export { deadlineCard } from './deadline';
export { budgetCsv, BUDGET_FILE_NAME } from './csv';
export const rules = rulesJson as RulesFile;
export const vendors = vendorsJson as VendorList;
