import { describe, expect, it } from 'vitest';
import type { VendorList } from '../shared/contracts';
import vendorsJson from '../shared/vendors.json';
import { matchVendor } from './vendor';

const vendors = vendorsJson as VendorList;

describe('vendors.json', () => {
  it('holds both tabs: 124 food rows (19 inactive or not found) and 83 other vendors', () => {
    const food = vendors.filter((v) => v.kind === 'food');
    const other = vendors.filter((v) => v.kind === 'other');
    expect([food.length, food.filter((v) => !v.active).length]).toEqual([124, 19]);
    expect([other.length, other.filter((v) => !v.active).length]).toEqual([83, 0]);
    expect(vendors).toHaveLength(207);
    for (const v of other) expect(v.category, v.name).toBeTruthy();
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
    // Other Vendors tab
    ['Kinetic Lighting', 'Kinetic Lighting, Inc.'],
    ['PSAV Presentation Services', 'Audio Visual Svcs Grp (PSAV Presentation Services, AUDIO VISUAL SVCS GRP)'],
    ['Balloon Wonderland', 'Balloon Wonderland'],
    ['Sound Decision Entertainment', 'Sound Decision Entertainment Services'],
  ])('%s → found', (name, matched) => {
    expect(matchVendor(name, vendors)).toEqual({ status: 'found', matchedName: matched });
  });

  it.each([
    ['Pitfire Artisan Pizza'], // on the list but INACTIVE
    ['Barbecue King'], // NOT FOUND row
    ['Trader Joes'],
    ['Kinko Copies'], // non-food, not on either tab
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
