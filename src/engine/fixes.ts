import type { CheckInput, CheckResult, Extraction, Fix, Resolution } from '../shared/contracts';
import { runCheck } from './check';
import { lineCents, usd } from './money';

// Caps that a smaller request clears. R11 and R21 are review_note flags in runCheck, but they carry a cap reduction too.
const REDUCE: Record<string, (amt: string, desc: string) => string> = {
  R6: (amt) => `Request the $4,000 cap for venue and personnel (${amt} less)`,
  R11: (amt) => `Request food at $35 per person (${amt} less)`,
  R21: (amt, desc) => `Request ${desc} at $400 per night (${amt} less)`,
};

/** Fixes that would clear flags on this check, in flag order. Plain code; nothing changes until the user approves. */
export function proposeFixes(input: CheckInput, check: CheckResult): Fix[] {
  const items = new Map(input.extraction.items.map((i) => [i.id, i]));
  const removed = new Set<string>();
  const fixes: Fix[] = [];
  for (const f of check.flags) {
    const item = f.itemId ? items.get(f.itemId) : undefined;
    if (f.severity === 'not_eligible' && item) {
      if (removed.has(item.id)) continue; // two §5 matches on one line: one removal clears both
      removed.add(item.id);
      const amt = lineCents(item);
      fixes.push({ id: f.id, ruleId: f.ruleId, kind: 'remove_line', itemId: item.id, savesCents: amt, auto: true,
        label: `Remove ${item.description} (${usd(amt)}) from the request` });
    } else if (REDUCE[f.ruleId] && f.amountCents) {
      fixes.push({ id: f.id, ruleId: f.ruleId, kind: 'reduce_request', itemId: null, savesCents: f.amountCents, auto: true,
        label: REDUCE[f.ruleId](usd(f.amountCents), item?.description ?? 'lodging') });
    } else if (f.ruleId === 'R4' && f.severity === 'not_eligible') {
      fixes.push({ id: f.id, ruleId: 'R4', kind: 'change_event', itemId: null, savesCents: 0, auto: false,
        label: "Don't sell tickets: make the event free" });
    }
  }
  return fixes;
}

/** The plan with the approved fixes applied, rechecked. Never mutates `input`; unknown or repeated ids are ignored. */
export function applyFixes(input: CheckInput, check: CheckResult, approved: string[]): Resolution {
  const fixes = proposeFixes(input, check);
  const wanted = new Set(approved);
  const chosen = fixes.filter((f) => wanted.has(f.id));
  const drop = new Set(chosen.filter((f) => f.kind === 'remove_line').map((f) => f.itemId));
  const reduce = new Set(chosen.filter((f) => f.kind === 'reduce_request').map((f) => f.id));
  const free = chosen.some((f) => f.kind === 'change_event');

  const x = input.extraction;
  const extraction: Extraction = {
    ...x,
    facts: free ? { ...x.facts, ticketed: false } : x.facts,
    items: x.items.filter((i) => !drop.has(i.id)),
    eventMatches: free ? x.eventMatches.filter((m) => m.ruleId !== 'R4') : x.eventMatches,
  };
  const revisedInput = { ...input, extraction };
  const revised = runCheck(revisedInput);

  // Kept lines stay in; an approved cap takes its amount as the revised check states it
  const cut = revised.flags.filter((f) => reduce.has(f.id)).reduce((s, f) => s + (f.amountCents ?? 0), 0);
  const left = revised.money.yearlyRemainingCents;
  const asked = revised.money.totalCents - cut;
  // Savings re-read from the revised check, so a fix still on offer never shows a stale amount
  const now = new Map(proposeFixes(revisedInput, revised).map((f) => [f.id, f]));

  return {
    fixes: fixes.map((f) => now.get(f.id) ?? f),
    approved: chosen.map((f) => f.id),
    extraction,
    check: revised,
    requestCents: left === null ? asked : Math.min(asked, left),
    open: revised.flags.filter((f) => (f.severity === 'not_eligible' || f.severity === 'over_cap') && !reduce.has(f.id)),
  };
}
