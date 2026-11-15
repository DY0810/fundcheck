import { describe, expect, it } from 'vitest';
import type { VendorList } from '../shared/contracts';
import vendorsJson from '../shared/vendors.json';
import { matchVendor } from './vendor';

const vendors = vendorsJson as VendorList;

describe('vendors.json', () => {
  it('holds the 124 rows of the Food Vendors tab, 19 marked inactive or not found', () => {
    expect(vendors).toHaveLength(124);
    expect(vendors.filter((v) => !v.active)).toHaveLength(19);
    for (const v of vendors) expect(v.name.trim()).toBe(v.name);
  });
});

describe('matchVendor (string matching, not AI)', () => {
  it.each([
    ['Wolfgang Puck Catering', 'Wolfgang Puck Catering'],
    ['wolfgang puck', 'Wolfgang Puck Catering'],
    ['Chick-fil-A', 'Chick-Fil-A [Park Enterprise LLC]'],
    ['Habit Burger', 'HBG Franchise, LLC [Habit Burger Grill]'],
    ['In-N-Out', 'In-N-Out Burger'],
    ["Pink's Hot Dogs", "Pink's Hot Dogs, Inc. (PINK S HOT DOGS INC) Globally Connceted Inc (Phat daddys burgers)"],
    ['Lemonade', 'Lemonade'],
    ['Urth Caffe', 'URTH Caffe Associates V LLC (Urth Caffe, URTH CAFFE ASSOCIATES V LLC)'],
  ])('%s → found', (name, matched) => {
    expect(matchVendor(name, vendors)).toEqual({ status: 'found', matchedName: matched });
  });

  it.each([
    ['Pitfire Artisan Pizza'], // on the list but INACTIVE
    ['Barbecue King'], // NOT FOUND row
    ['Trader Joes'],
    ['The Catering Inc'], // normalises to nothing
    ['Pizza'], // one generic token must not hit "Yameel Pizza [2 for 1 pizza]"
    [''],
  ])('%s → not_found_verify', (name) => {
    expect(matchVendor(name, vendors)).toEqual({ status: 'not_found_verify' });
  });

  it('prefers an active row over an inactive duplicate', () => {
    const list: VendorList = [{ name: 'Acme Catering', active: false }, { name: 'Acme Catering Inc.', active: true }];
    expect(matchVendor('ACME', list)).toEqual({ status: 'found', matchedName: 'Acme Catering Inc.' });
  });

  it('matches on token-set overlap of at least 0.8 in any order', () => {
    const list: VendorList = [{ name: 'Blue Moon Taco Truck Express', active: true }];
    expect(matchVendor('Truck Taco Blue Moon', list).status).toBe('found'); // 4/5 tokens shared
    expect(matchVendor('Blue Moon Tacos', list).status).toBe('not_found_verify');
  });
});
