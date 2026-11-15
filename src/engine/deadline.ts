import type { DeadlineCard, IsoDate, RuleId } from '../shared/contracts';

// Port of the tested Python from research/grill-fundcheck.md Q3. Calendar: usc.edu/academic-calendar, modified 2026-11-05.
//
// from datetime import date as D, timedelta as td
// HOL={D(2026,9,7),D(2026,10,8),D(2026,10,9),D(2026,11,11),D(2027,1,18),D(2027,2,15)}
// BRK=[(D(2026,11,25),D(2026,11,29)),(D(2026,12,5),D(2027,1,10)),(D(2027,3,14),D(2027,3,21)),(D(2027,5,1),D(2027,8,23))]
// TERM=[(D(2026,8,24),D(2026,12,4)),(D(2027,1,11),D(2027,4,30))]
// def instr(d): return d.weekday()<5 and any(a<=d<=b for a,b in TERM) and d not in HOL and not any(a<=d<=b for a,b in BRK)
// def back_to_open_wed(w):
//     while not instr(w): w-=td(7)
//     return w
// def safe(anchor,n):
//     m=anchor-td(anchor.weekday()); c=0
//     while c<n: m-=td(7); c+=all(instr(m+td(i)) for i in range(5))
//     return back_to_open_wed(m-td(5))
// def latest(anchor,n):
//     x=anchor-td(7*n); return back_to_open_wed(x-td((x.weekday()-2)%7))
// def card(event,today,travel=False,new_vendor=False,payment=None):
//     n=9 if travel else 8 if new_vendor else 6
//     anchors=[(event,n)]+([(payment,9)] if payment else [])
//     s=min(safe(a,k) for a,k in anchors); l=min(latest(a,k) for a,k in anchors)
//     nxt=today+td((2-today.weekday())%7)
//     while not instr(nxt): nxt+=td(7)
//     if s>=nxt: return ('safe',s,l)
//     if l>=nxt: return ('next-open',nxt,l)
//     return ('past',None,l)
//
// Differences: dates are UTC day numbers; each loop stops at the calendar edge, where the Python loops forever
// (null = earlier than the calendar, so it sorts before every date and reads as past).

const DAY = 86_400_000;

/** Day number since 1970-01-01 UTC, or null if `s` is not a real YYYY-MM-DD date. */
function day(s: string | null | undefined): number | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? t.getTime() / DAY : null;
}
const iso = (n: number): IsoDate => new Date(n * DAY).toISOString().slice(0, 10);
const weekday = (n: number) => (new Date(n * DAY).getUTCDay() + 6) % 7; // Python weekday(): Monday = 0
const mod7 = (n: number) => ((n % 7) + 7) % 7; // Python's % is never negative; JS's is
const at = (s: string) => day(s) as number;
const span = ([a, b]: [string, string]): [number, number] => [at(a), at(b)];

const HOL = new Set(['2026-09-07', '2026-10-08', '2026-10-09', '2026-11-11', '2027-01-18', '2027-02-15'].map(at));
const BRK = ([['2026-11-25', '2026-11-29'], ['2026-12-05', '2027-01-10'], ['2027-03-14', '2027-03-21'], ['2027-05-01', '2027-08-23']] as [string, string][]).map(span);
const TERM = ([['2026-08-24', '2026-12-04'], ['2027-01-11', '2027-04-30']] as [string, string][]).map(span);
const START = TERM[0][0];
const END = TERM[TERM.length - 1][1];

const within = (n: number, ranges: [number, number][]) => ranges.some(([a, b]) => a <= n && n <= b);
const instr = (n: number) => weekday(n) < 5 && within(n, TERM) && !HOL.has(n) && !within(n, BRK);

function backToOpenWed(w: number): number | null {
  while (!instr(w)) {
    if (w < START) return null;
    w -= 7;
  }
  return w;
}

function safe(anchor: number, n: number): number | null {
  let m = anchor - weekday(anchor);
  let c = 0;
  while (c < n) {
    m -= 7;
    if (m < START) return null;
    if ([0, 1, 2, 3, 4].every((i) => instr(m + i))) c++;
  }
  return backToOpenWed(m - 5);
}

function latest(anchor: number, n: number): number | null {
  const x = anchor - 7 * n;
  return backToOpenWed(x - mod7(weekday(x) - 2));
}

const minOrNull = (xs: (number | null)[]) => (xs.includes(null) ? null : Math.min(...(xs as number[])));

// R24, quoted from the form: events Dec 5 2026 to Jan 12 2027, or after May 1 2027. ISO strings compare as dates.
const inBlackout = (first: IsoDate, last: IsoDate) => (first <= '2027-01-12' && last >= '2026-12-05') || last > '2027-05-01';

/** The Python's `nxt`: the first open Wednesday on or after `today`, or null if none before the term ends. */
function openWed(today: IsoDate): number | null {
  const t = day(today);
  let nxt = t === null ? null : t + mod7(2 - weekday(t));
  while (nxt !== null && !instr(nxt)) nxt = nxt + 7 > END ? null : nxt + 7;
  return nxt;
}

/** The next Wednesday the USG application window opens, on or after `today`. */
export function nextWindow(today: IsoDate): IsoDate | null {
  const n = openWed(today);
  return n === null ? null : iso(n);
}

export function deadlineCard(a: {
  event: IsoDate | null;
  today: IsoDate;
  travel: boolean;
  newVendor: boolean;
  payment?: IsoDate | null;
  end?: IsoDate | null; // last day of a multi-day event, for the blackout check only
}): DeadlineCard {
  const weeks: DeadlineCard['weeks'] = a.travel ? 9 : a.newVendor ? 8 : 6;
  const ruleIds: RuleId[] = ['R23', 'R24', 'R25', 'R26'];
  const ev = day(a.event);
  if (ev === null || !a.event) return { status: 'unknown_date', headline: null, latest: null, weeks, anchors: [], blackout: false, ruleIds };

  const anchors: DeadlineCard['anchors'] = [{ kind: 'event', date: a.event, weeks }];
  if (a.payment && day(a.payment) !== null) anchors.push({ kind: 'payment', date: a.payment, weeks: 9 });
  const last = a.end && day(a.end) !== null && a.end > a.event ? a.end : a.event;
  if (inBlackout(a.event, last)) return { status: 'blackout', headline: null, latest: null, weeks, anchors, blackout: true, ruleIds };

  const s = minOrNull(anchors.map((x) => safe(at(x.date), x.weeks)));
  const l = minOrNull(anchors.map((x) => latest(at(x.date), x.weeks)));
  const nxt = openWed(a.today);
  const out = { weeks, anchors, blackout: false, ruleIds, latest: l === null ? null : iso(l) };
  if (nxt !== null && s !== null && s >= nxt) return { ...out, status: 'safe', headline: iso(s) };
  if (nxt !== null && l !== null && l >= nxt) return { ...out, status: 'next_open', headline: iso(nxt) };
  return { ...out, status: 'past', headline: null };
}
