import { describe, expect, it } from 'vitest';
import { blackoutMessage, deadlineCard, nextWindow } from './deadline';

const today = '2026-11-14';
const card = (event: string | null, o: { travel?: boolean; newVendor?: boolean; payment?: string; today?: string; end?: string } = {}) =>
  deadlineCard({ event, today: o.today ?? today, travel: !!o.travel, newVendor: !!o.newVendor, payment: o.payment, end: o.end });
const pick = (c: ReturnType<typeof card>) => [c.status, c.headline, c.latest];

describe('deadlineCard (port of grill Q3 Python)', () => {
  // [event, opts, status, headline, latest]; every row checked against the Python with python3 -I
  const rows: [string, Parameters<typeof card>[1], string, string | null, string | null][] = [
    ['2027-01-22', {}, 'next_open', '2026-11-18', '2026-12-02'], // grill assert
    ['2027-04-09', {}, 'safe', '2027-02-03', '2027-02-24'], // grill assert
    ['2027-04-09', { travel: true }, 'safe', '2026-12-02', '2027-02-03'],
    ['2027-04-09', { payment: '2027-03-26' }, 'next_open', '2026-11-18', '2027-01-20'],
    ['2027-02-23', {}, 'next_open', '2026-11-18', '2026-12-02'],
    ['2027-01-13', { travel: true }, 'past', null, '2026-11-04'],
    ['2027-04-09', { newVendor: true }, 'safe', '2027-01-20', '2027-02-10'],
    // other `today`s guard the second Python modulo, (2 - weekday) % 7
    ['2027-04-09', { today: '2027-02-04' }, 'next_open', '2027-02-10', '2027-02-24'],
    ['2027-02-23', { today: '2026-11-19' }, 'next_open', '2026-12-02', '2026-12-02'],
    ['2027-04-23', { today: '2027-01-14' }, 'safe', '2027-02-24', '2027-03-10'],
  ];
  it.each(rows)('event %s %o', (event, o, status, headline, latest) => {
    expect(pick(card(event, o))).toEqual([status, headline, latest]);
  });

  it('flags the R24 blackout before anything else', () => {
    const c = card('2026-12-10');
    expect(c).toMatchObject({ status: 'blackout', headline: null, latest: null, blackout: true });
    expect(card('2027-05-02').status).toBe('blackout');
    expect(card('2026-12-03', { end: '2026-12-06' }).status).toBe('blackout'); // multi-day into the window
  });

  it('flags University holidays, breaks, study days and finals (R24 sentence 2, USC academic calendar)', () => {
    expect(blackoutMessage('2027-02-15')).toBe("Event date falls on Presidents' Day, a University holiday, when USG does not fund events (§1).");
    expect(blackoutMessage('2027-03-16')).toBe('Event date falls during spring break (Spring Recess), when USG does not fund events (§1).');
    expect(blackoutMessage('2027-01-18')).toContain('Martin Luther King Jr. Day');
    expect(blackoutMessage('2027-05-01')).toBe('Event date falls during study days, when USG does not fund events (§1).'); // "after May 1" misses May 1 itself
    expect(blackoutMessage('2026-11-27')).toContain('Thanksgiving');
    expect(blackoutMessage('2026-12-10')).toBe("Event date falls in USG's no-funding window (per the application form)."); // the form's window wins
    for (const classDay of ['2027-02-16', '2027-02-12', '2027-03-12', '2027-03-22', '2027-04-09', '2027-04-30'])
      expect([classDay, blackoutMessage(classDay)]).toEqual([classDay, null]);
    expect(blackoutMessage('2027-03-12', '2027-03-14')).toContain('spring break'); // multi-day into the break
    expect(blackoutMessage('2027-02-12', '2027-02-14')).toBeNull(); // Fri to Sun before Presidents' Day
    expect(card('2027-02-15').status).toBe('blackout');
    expect(card('2027-03-16')).toMatchObject({ status: 'blackout', blackout: true, headline: null });
  });

  it('returns unknown_date for a missing or malformed date', () => {
    expect(card(null).status).toBe('unknown_date');
    expect(card('2027-4-9').status).toBe('unknown_date');
    expect(card('0002-01-01').status).toBe('past'); // valid but before the calendar: terminates
  });

  it('terminates outside the calendar (Python loops forever here)', () => {
    expect(pick(card('2026-10-01'))).toEqual(['past', null, null]);
    expect(card('2027-04-09', { payment: '2026-09-01' }).status).toBe('past');
    expect(card('2027-04-29', { today: '2027-04-30' }).status).toBe('past');
  });

  it('nextWindow: the next open application Wednesday on or after today', () => {
    expect(nextWindow('2026-11-14')).toBe('2026-11-18');
    expect(nextWindow('2026-11-19')).toBe('2026-12-02'); // Nov 25 is Thanksgiving break
    expect(nextWindow('2026-11-18')).toBe('2026-11-18'); // a Wednesday itself
    expect(nextWindow('2026-11-05')).toBe('2026-11-18'); // Nov 11 is a holiday
    expect(nextWindow('2026-12-03')).toBe('2027-01-13'); // winter recess
    expect(nextWindow('2027-04-29')).toBeNull(); // term ends Apr 30
    expect(nextWindow('not a date')).toBeNull();
  });

  it('sets weeks and anchors', () => {
    expect(card('2027-04-09', { payment: '2027-03-26', travel: true })).toMatchObject({
      weeks: 9,
      anchors: [{ kind: 'event', date: '2027-04-09', weeks: 9 }, { kind: 'payment', date: '2027-03-26', weeks: 9 }],
      ruleIds: ['R23', 'R24', 'R25', 'R26'],
    });
    expect(card('2027-04-09', { newVendor: true }).weeks).toBe(8);
    expect(card('2027-04-09').weeks).toBe(6);
  });
});
