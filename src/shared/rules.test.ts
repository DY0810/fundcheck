import { describe, expect, it } from 'vitest';
import { EVENT_AI_RULES, ITEM_AI_RULES, type RuleId, type RulesFile } from './contracts';
import rulesJson from './rules.json';

const rules = rulesJson as RulesFile;

// Non-AI IDs exist only as a type, so list them here; the Record below fails to compile if the union changes.
const OTHER: Record<Exclude<RuleId, (typeof ITEM_AI_RULES)[number] | (typeof EVENT_AI_RULES)[number]>, true> = {
  R2: true, R3a: true, R6: true, R7: true, R8: true, R9: true, R10: true, R11: true, R12: true, R13: true,
  R14: true, R15: true, R16: true, R17: true, R18: true, R19: true, R21: true, R22: true, R23: true, R24: true,
  R25: true, R26: true, R27: true, R28: true, 'R29.performing': true, 'R29.philanthropy': true,
  'R29.professional': true, 'R29.social': true, R30: true, R32: true, R33: true,
};
const ALL_IDS: RuleId[] = [...ITEM_AI_RULES, ...EVENT_AI_RULES, ...(Object.keys(OTHER) as RuleId[])];

describe('rules.json', () => {
  it('has exactly one entry per RuleId', () => {
    for (const id of ALL_IDS) expect(rules.rules.filter((r) => r.id === id), id).toHaveLength(1);
    expect(rules.rules).toHaveLength(ALL_IDS.length);
  });

  it('has no duplicate IDs', () => {
    expect(new Set(rules.rules.map((r) => r.id)).size).toBe(rules.rules.length);
  });

  it('gives every entry at least one non-empty quote', () => {
    for (const r of rules.rules) {
      expect(r.quotes.length, r.id).toBeGreaterThan(0);
      for (const q of r.quotes) expect(q.trim(), r.id).not.toBe('');
    }
  });
});
