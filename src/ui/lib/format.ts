import type { Cents, IsoDate } from '../../shared/contracts';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usdCents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

/** $7,200 (or $7,200.50 when there are cents). Null → "Unknown", never $0 or NaN. */
export function money(c: Cents | null | undefined): string {
  if (c == null || !Number.isFinite(c)) return 'Unknown';
  return c % 100 === 0 ? usd.format(c / 100) : usdCents.format(c / 100);
}

export const moneyExact = (c: Cents) => usdCents.format(c / 100);

/** "$3,000", "3000.50", "3,000" → cents. Empty → null. Garbage → undefined (keep previous value). */
export function parseMoney(s: string): Cents | null | undefined {
  const t = s.replace(/[$,\s]/g, '');
  if (t === '') return null;
  if (!/^\d+(\.\d{0,2})?$/.test(t)) return undefined;
  return Math.round(parseFloat(t) * 100);
}

export const centsToInput = (c: Cents | null) =>
  c == null ? '' : (c / 100).toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 });

// IsoDate is a calendar date with no zone: format in UTC so "2027-02-03" never shows as Feb 2 in PT.
const dateFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
export function date(d: IsoDate | null | undefined): string {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return 'Unknown';
  return dateFmt.format(new Date(`${d}T00:00:00Z`));
}

/** Today's local calendar date (toISOString would roll to tomorrow after 4 pm PT). */
export function todayIso(now = new Date()): IsoDate {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

export const pct = (x: number) => `${Math.round(x * 100)}%`;
