import type { ExtractedItem, VendorCheck, VendorList } from '../shared/contracts';

// Plain string matching against the USG Vendor List (both tabs: Food Vendors and Other Vendors). Not AI.

const STOP = new Set(['catering', 'inc', 'llc', 'the', 'co', 'corp', 'ltd', 'pbc']);
const tokens = (s: string) =>
  s.toLowerCase().replace(/['’]/g, '').split(/[^a-z0-9]+/).filter((t) => t && !STOP.has(t));

const BRACKETED = /[[(][^\])]*[\])]/g;
/** "Legal Name [DBA] (Alias)" → token lists for the full name, the part outside brackets, and each bracketed part. */
const aliases = (name: string) =>
  [name, name.replace(BRACKETED, ' '), ...(name.match(BRACKETED) ?? [])].map(tokens).filter((t) => t.length);

function same(a: string[], b: string[]): boolean {
  const B = new Set(b);
  const shared = new Set(a.filter((t) => B.has(t))).size;
  if (shared / new Set([...a, ...b]).size >= 0.8) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  // containment needs 2+ tokens: a lone "Pizza" must not match "Yameel Pizza"
  return short.length >= 2 && ` ${long.join(' ')} `.includes(` ${short.join(' ')} `);
}

export function matchVendor(name: string, list: VendorList): { status: 'found' | 'not_found_verify'; matchedName?: string } {
  const q = tokens(name);
  if (q.length) for (const v of list) if (v.active && aliases(v.name).some((a) => same(q, a))) return { status: 'found', matchedName: v.name };
  return { status: 'not_found_verify' };
}

/** One check per line, against both tabs of the list. A line that names no vendor is not_applicable. Being listed never makes an item eligible. */
export function checkVendors(items: ExtractedItem[], list: VendorList, onList: Record<string, boolean> = {}): VendorCheck[] {
  return items.map((i): VendorCheck => {
    const vendor = i.vendor?.trim() ?? '';
    if (!vendor) return { itemId: i.id, vendor, status: 'not_applicable' };
    if (onList[i.id] === true) return { itemId: i.id, vendor, status: 'found' };
    return { itemId: i.id, vendor, ...matchVendor(vendor, list) };
  });
}
