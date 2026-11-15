import rulesJson from '../../shared/rules.json';
import type { Rule, RuleId, RulesFile } from '../../shared/contracts';

export const rulesFile = rulesJson as RulesFile;
const byId = new Map(rulesFile.rules.map((r) => [r.id, r]));

/** The only source of text the UI may present as USG's words. */
export const rule = (id: RuleId): Rule | undefined => byId.get(id);
