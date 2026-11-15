// src/shared/contracts.ts — FROZEN after Wave 0. Only HQ changes this file.
// Money: integer cents. Dates: "YYYY-MM-DD", UTC-only math. `today` is injected.

export type Cents = number;
export type IsoDate = string;

// ---------- Rules (src/shared/rules.json) ----------
export type RuleType = 'D' | 'M' | 'H'; // D = code, M = model judges match, H = model categorises + code does math

export const ITEM_AI_RULES = [
  'R1',                                   // Balloons
  'R3.reimbursement', 'R3.charity', 'R3.alcohol', 'R3.gifts', 'R3.durable',
  'R3.raw_food', 'R3.restaurant', 'R3.rideshare', 'R3.deposit', 'R3.p2p',
  'R3.talent', 'R3.subscription', 'R3.international', 'R3.jewelry',
  'R20',                                  // Performing Arts: decoration must be rental / PO vendor
] as const;
export const EVENT_AI_RULES = ['R4', 'R5.open', 'R5.residence', 'R31'] as const;
export type ItemAiRuleId = (typeof ITEM_AI_RULES)[number];
export type EventAiRuleId = (typeof EVENT_AI_RULES)[number];

export type RuleId =
  | ItemAiRuleId | EventAiRuleId
  | 'R2' | 'R3a' | 'R6' | 'R7' | 'R8' | 'R9' | 'R10' | 'R11' | 'R12' | 'R13' | 'R14' | 'R15'
  | 'R16' | 'R17' | 'R18' | 'R19' | 'R21' | 'R22' | 'R23' | 'R24' | 'R25' | 'R26' | 'R27'
  | 'R28' | 'R29.performing' | 'R29.philanthropy' | 'R29.professional' | 'R29.social'
  | 'R30' | 'R32' | 'R33';

export interface SourceQuote { source: string; quote: string } // used for "Sources word this differently"

export interface Rule {
  id: RuleId;
  title: string;            // short plain-English title, ours: "Balloons", "$4,000 venue and personnel cap"
  quotes: string[];         // 1+ verbatim quotes from the source. The UI renders ONLY these as USG's words.
  source: string;           // e.g. "USG Funding Department Guidelines §5"
  sourceUrl: string;
  sourceDate: string;       // e.g. "2026-10-21"
  type: RuleType;
  discretionNote: boolean;  // true for R1, R3.*, R4, R5.*: UI also shows R2's quote
  note?: string;            // OUR clarification, rendered visibly as ours, e.g. "Not in the Guidelines; from the funding page FAQ"
  alsoSee?: SourceQuote[];  // conflicting wordings (R25 deadline, R27 fix window), shown behind an expander
}
export interface RulesFile { version: string; rules: Rule[] } // version e.g. "guidelines-2026-10-21.1"

// ---------- Funds ----------
export type FundId = 'philanthropy' | 'professional_academic' | 'social_rec_startup' | 'performing_visual_cultural';
export const FUND_LABELS: Record<FundId, string> = { // exact labels on the 2026-27 form
  philanthropy: 'Philanthropy Fund',
  professional_academic: 'Professional Academic Research Fund',
  social_rec_startup: 'Social, Recreational, and Startup Fund',
  performing_visual_cultural: 'Performing, Visual Arts, & Cultural Fund',
};
export const FUND_RULE: Record<FundId, RuleId> = {
  philanthropy: 'R29.philanthropy',
  professional_academic: 'R29.professional',
  social_rec_startup: 'R29.social',
  performing_visual_cultural: 'R29.performing',
};

// ---------- Extraction: what /api/extract returns (model output, validated by Zod in worker/schema.ts) ----------
export type ItemCategory =
  | 'food' | 'venue' | 'personnel' | 'talent' | 'decoration' | 'promo'
  | 'travel' | 'lodging' | 'durable' | 'other';

export interface ItemRuleMatch {
  ruleId: ItemAiRuleId;     // the model may only use this enum; the worker drops anything else
  confidence: 'high' | 'low'; // low → engine shows an Ask chip, not a flag
  reason: string;           // model's one line, shown labelled "AI reasoning", never as USG's words
}
export interface ExtractedItem {
  id: string;               // "i1", "i2", … assigned by the worker in order, not by the model
  description: string;      // as the user wrote it
  vendor: string | null;
  quantity: number | null;  // nights for lodging
  unitCostCents: Cents | null;
  totalCents: Cents | null; // line total; engine uses totalCents ?? quantity*unitCostCents ?? 0
  category: ItemCategory;
  matches: ItemRuleMatch[];
  evidence: string;         // verbatim span of the pasted plan
}
export interface EventRuleMatch {
  ruleId: EventAiRuleId;
  confidence: 'high' | 'low';
  reason: string;
  evidence: string;         // verbatim span, e.g. "$10 tickets at the door"
}
export interface EventFacts {
  name: string | null;
  date: IsoDate | null;     // first day
  endDate: IsoDate | null;  // last day if multi-day, else null
  time: string | null;
  location: string | null;
  onCampus: boolean | null;
  expectedAttendance: number | null;
  ticketed: boolean | null;
  openToAll: boolean | null;
  travel: boolean | null;   // airfare/hotel/conference travel
  multiDay: boolean | null;
  summary: string | null;   // one neutral sentence on what the event is
}
export interface Extraction {
  facts: EventFacts;
  items: ExtractedItem[];
  eventMatches: EventRuleMatch[];
  fund: { fund: FundId; reason: string }; // UI shows R29 quote for that fund + reason labelled AI
}

// ---------- Ask chips: facts only the user knows ----------
export interface Answers {
  receivedThisYearCents?: Cents | null;     // R9
  eventsFundedThisSemester?: number | null; // R10
  paymentDueDate?: IsoDate | null;          // R25 second anchor
  startupEligible?: boolean | null;         // R30 (social_rec_startup only)
  uepaNumber?: string | null;               // R16, validated /^A\d{5,6}$/
  modulesCompleted?: boolean | null;        // R32
  otherFundingSources?: string | null;      // R33; "N/A" if none
  vendorOnList?: Record<string, boolean>;   // itemId → user override of R18 "not found, verify"
  matchAnswers?: Record<string, boolean>;   // key "<itemId or 'event'>:<ruleId>" answers a low-confidence match: true → treat as high, false → drop it
}
// facts.* asks are answered by editing extraction.facts in the UI, not via Answers.
export type AskId =
  | keyof Omit<Answers, 'vendorOnList' | 'matchAnswers'>
  | 'facts.date' | 'facts.expectedAttendance' | 'facts.ticketed' | 'facts.openToAll'
  | 'facts.onCampus' | 'facts.travel' | `match:${string}`; // match:<itemId|event>:<ruleId>, answered via Answers.matchAnswers
export interface Ask { id: AskId; question: string; ruleId: RuleId; kind: 'money' | 'number' | 'date' | 'yesno' | 'text' }

// ---------- Check: what runCheck() in src/engine/check.ts returns (pure code, no LLM) ----------
export interface CheckInput { extraction: Extraction; answers: Answers; today: IsoDate; rules: RulesFile; vendors: VendorList }
export type Severity = 'not_eligible' | 'over_cap' | 'review_note' | 'confirm' | 'pass'; // asks are NOT flags: they live only in CheckResult.asks
export const SEVERITY_ORDER: Severity[] = ['not_eligible', 'over_cap', 'review_note', 'confirm', 'pass'];
export type Badge = 'rule_math' | 'ai_judged'; // D → rule_math; M or H → ai_judged

export interface Flag {
  id: string;               // `${ruleId}:${itemId ?? 'event'}`, stable
  ruleId: RuleId;
  severity: Severity;
  badge: Badge;
  itemId: string | null;
  message: string;          // OUR plain line, built by code: "Helium balloon arch ($250) is not eligible per §5."
  amountCents?: Cents;      // amount removed or over the cap
  aiReason?: string;        // only when badge = 'ai_judged'
  evidence?: string;        // the user's own words
}
export interface Money {
  totalCents: Cents;                 // sum of all lines
  ineligibleCents: Cents;            // lines with a high-confidence item match (R1, R3.*)
  venuePersonnelCents: Cents;        // venue + personnel lines
  capReductionCents: Cents;          // R6 + R11 + R21 reductions
  eligibleCents: Cents;              // total − ineligible − capReduction, then capped at yearlyRemainingCents when that is known
  foodCents: Cents;
  foodPerPersonCents: Cents | null;  // null if attendance unknown
  yearlyCapCents: 800000;
  yearlyRemainingCents: Cents | null; // null if receivedThisYear unknown
}
export interface DocItem {
  id: string;               // e.g. "R17:Vendor Name", "R12", "R15"
  ruleId: RuleId;
  label: string;            // "Health Permit from the food vendor"
  fileName?: string;        // "RSO_Lastname_Firstname_<Vendor>_Quote.pdf"
  status: 'needed' | 'done' | 'invalid';
}
export interface VendorCheck {
  itemId: string;
  vendor: string;
  status: 'found' | 'not_found_verify' | 'not_applicable'; // not_applicable = the line names no vendor
  matchedName?: string;
}
export type VendorList = { name: string; cuisine?: string; website?: string; active: boolean; kind?: 'food' | 'other'; category?: string }[]; // kind = which tab of USG's vendor sheet
export interface DeadlineCard {
  status: 'safe' | 'next_open' | 'past' | 'blackout' | 'unknown_date';
  headline: IsoDate | null;  // submit by (safe) or next open Wednesday (next_open)
  latest: IsoDate | null;    // latest date under the event-date wording
  weeks: 6 | 8 | 9;          // 9 if travel/lodging line, 8 if a named vendor is not found, else 6
  anchors: { kind: 'event' | 'payment'; date: IsoDate; weeks: 6 | 8 | 9 }[];
  blackout: boolean;         // R24
  ruleIds: RuleId[];         // ['R23', 'R24', 'R25', 'R26']
}
export interface CheckResult {
  rulesVersion: string;
  fund: { fund: FundId; label: string; ruleId: RuleId; aiReason: string };
  flags: Flag[];             // sorted by SEVERITY_ORDER, then item order
  money: Money;
  documents: DocItem[];
  vendors: VendorCheck[];
  deadline: DeadlineCard;
  asks: Ask[];
  postEventRuleId: 'R28';
}

// ---------- Draft: what /api/draft returns ----------
export interface Draft {
  description: string;           // "Description of event"
  missionAlignment: string;      // "How does the event align with your mission/vision/goals?"
  foodJustification: string | null;  // R13, only if food lines
  travelPurpose: string | null;      // R22 statement of purpose, only if travel
  budgetJustifications: Record<string, string>; // itemId → Justification column text
}
// Code-filled, never model: fund label, amount requested (= money.eligibleCents),
// other funding sources (+ R33 warning), budget CSV (src/engine/csv.ts).

// ---------- API ----------
export type ApiErrorCode = 'empty' | 'too_long' | 'llm_failed' | 'llm_invalid' | 'rate_limited';
export interface ApiError { code: ApiErrorCode; message: string }
export const MAX_PLAN_CHARS = 8000;
export type Provider = 'claude' | 'workers-ai' | 'cache'; // which step of the chain in worker/llm.ts served the call

export interface ExtractRequest { plan: string }
export type ExtractResponse =
  | { ok: true; extraction: Extraction; source: 'live' | 'cached'; provider: Provider; model: string; ms: number }
  | { ok: false; error: ApiError };

export interface DraftRequest { extraction: Extraction; check: CheckResult }
export type DraftResponse =
  | { ok: true; draft: Draft; source: 'live'; provider: Provider; model: string; ms: number }
  | { ok: false; error: ApiError };

// ---------- Evals ----------
export interface EvalCase {
  id: string;                    // "e01"
  title: string;                 // "DJ called 'entertainment'"
  plan: string;
  answers: Answers;
  today: IsoDate;                // fixed, e.g. "2026-11-14"
  expect: {
    mustFlag: { ruleId: RuleId; itemContains?: string }[]; // itemContains: substring of item description
    mustNotFlag: RuleId[];
    fund?: FundId;
    eligibleCents?: Cents;
  };
  why: string;                   // what makes this case tricky
}
export interface EvalCaseResult {
  id: string; title: string; pass: boolean;
  hits: RuleId[]; misses: RuleId[]; falseFlags: RuleId[];
  fundOk: boolean | null; eligibleOk: boolean | null; ms: number;
  provider: Provider; model: string;
}
export interface EvalRun {
  ranAt: string;                 // ISO timestamp
  provider: Provider;             // the provider that served most cases; per-case provider is in cases[]
  model: string;
  rulesVersion: string;
  cases: EvalCaseResult[];
  perRule: { ruleId: RuleId; tp: number; fn: number; fp: number }[];
  summary: { cases: number; passed: number; precision: number; recall: number };
}
