import { z } from 'zod';
import { EVENT_AI_RULES, ITEM_AI_RULES } from '../src/shared/contracts';
import type { Draft, Extraction } from '../src/shared/contracts';

// Model output schemas. They mirror Extraction and Draft in contracts.ts, except:
// items carry no `id` (the worker assigns i1…iN) and budgetJustifications is an array
// (structured outputs reject open-keyed objects), turned into a Record by toDraft().

const cents = z.number().int().nullable().describe('integer US cents, e.g. $3,000 = 300000; null if not stated');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().describe('YYYY-MM-DD, or null');
const confidence = z.enum(['high', 'low']);

/** Drops matches whose ruleId is outside the enum, so one invented ID never fails the whole result. */
const knownRules = (ids: readonly string[]) => (v: unknown) =>
  Array.isArray(v) ? v.filter((m) => ids.includes((m as { ruleId?: unknown })?.ruleId as string)) : v;

const ItemMatch = z.object({
  ruleId: z.enum(ITEM_AI_RULES),
  confidence,
  reason: z.string().describe('one short line: why this item matches the rule'),
});
const EventMatch = z.object({
  ruleId: z.enum(EVENT_AI_RULES),
  confidence,
  reason: z.string(),
  evidence: z.string().describe('verbatim span copied from the plan'),
});

export const ModelExtraction = z.object({
  facts: z.object({
    name: z.string().nullable(),
    date: isoDate,
    endDate: isoDate,
    time: z.string().nullable(),
    location: z.string().nullable(),
    onCampus: z.boolean().nullable(),
    expectedAttendance: z.number().int().nullable(),
    ticketed: z.boolean().nullable(),
    openToAll: z.boolean().nullable(),
    travel: z.boolean().nullable(),
    multiDay: z.boolean().nullable(),
    summary: z.string().nullable(),
  }),
  items: z.array(
    z.object({
      description: z.string(),
      vendor: z.string().nullable(),
      quantity: z.number().int().nullable(),
      unitCostCents: cents,
      totalCents: cents,
      category: z.enum(['food', 'venue', 'personnel', 'talent', 'decoration', 'promo', 'travel', 'lodging', 'durable', 'other']),
      matches: z.preprocess(knownRules(ITEM_AI_RULES), z.array(ItemMatch)),
      evidence: z.string().describe('verbatim span copied from the plan'),
    }),
  ),
  eventMatches: z.preprocess(knownRules(EVENT_AI_RULES), z.array(EventMatch)),
  fund: z.object({
    fund: z.enum(['philanthropy', 'professional_academic', 'social_rec_startup', 'performing_visual_cultural']),
    reason: z.string(),
  }),
});
export type ModelExtraction = z.infer<typeof ModelExtraction>;

export const ModelDraft = z.object({
  description: z.string(),
  missionAlignment: z.string(),
  foodJustification: z.string().nullable(),
  travelPurpose: z.string().nullable(),
  budgetJustifications: z.array(z.object({ itemId: z.string(), text: z.string() })),
});
export type ModelDraft = z.infer<typeof ModelDraft>;

/** JSON schemas for Workers AI, derived from the same Zod schemas. */
export const EXTRACTION_JSON_SCHEMA = z.toJSONSchema(ModelExtraction);
export const DRAFT_JSON_SCHEMA = z.toJSONSchema(ModelDraft);

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const nonNeg = (n: number | null) => (n != null && n < 0 ? null : n);

/** Post-validation for both providers: blank evidence not found in the plan, null negatives, assign item ids. */
export function toExtraction(m: ModelExtraction, plan: string): Extraction {
  const p = norm(plan);
  const ev = (s: string) => (s.trim() && p.includes(norm(s)) ? s : '');
  return {
    facts: { ...m.facts, expectedAttendance: nonNeg(m.facts.expectedAttendance) },
    items: m.items.map((it, i) => ({
      id: `i${i + 1}`,
      ...it,
      quantity: nonNeg(it.quantity),
      unitCostCents: nonNeg(it.unitCostCents),
      totalCents: nonNeg(it.totalCents),
      evidence: ev(it.evidence),
    })),
    eventMatches: m.eventMatches.map((e) => ({ ...e, evidence: ev(e.evidence) })),
    fund: m.fund,
  };
}

const Category = ModelExtraction.shape.items.element.shape.category;

/** The part of a DraftRequest the draft prompt reads. Validated at the trust boundary; unknown keys are stripped. */
export const DraftInput = z.object({
  extraction: z.object({
    facts: z.object({
      name: z.string().nullable(),
      location: z.string().nullable(),
      onCampus: z.boolean().nullable(),
      openToAll: z.boolean().nullable(),
      travel: z.boolean().nullable(),
      summary: z.string().nullable(),
    }),
    items: z.array(z.object({ id: z.string(), description: z.string(), vendor: z.string().nullable(), category: Category })).max(100),
  }),
  check: z.object({
    fund: z.object({ label: z.string() }),
    flags: z.array(z.object({ ruleId: z.string(), itemId: z.string().nullable(), severity: z.string() })).max(200),
  }),
});
export type DraftInput = z.infer<typeof DraftInput>;

/** Keeps only justifications for real item ids; food/travel text only when the plan has such lines. */
export function toDraft(m: ModelDraft, ex: DraftInput['extraction']): Draft {
  const ids = new Set(ex.items.map((i) => i.id));
  const hasFood = ex.items.some((i) => i.category === 'food');
  const hasTravel = ex.facts.travel === true || ex.items.some((i) => i.category === 'travel' || i.category === 'lodging');
  return {
    description: m.description,
    missionAlignment: m.missionAlignment,
    foodJustification: hasFood ? m.foodJustification : null,
    travelPurpose: hasTravel ? m.travelPurpose : null,
    budgetJustifications: Object.fromEntries(m.budgetJustifications.filter((b) => ids.has(b.itemId)).map((b) => [b.itemId, b.text])),
  };
}
