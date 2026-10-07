/**
 * #623 In tem: hand-written Code 128 set B encoder. Expected checksums are worked by hand in the
 * comments: (104 + Σ value × position) mod 103, value = char code − 32.
 */
import { describe, expect, it } from '@jest/globals';
import { PATTERNS, QUIET_ZONE, START_B, STOP, code128Bars, code128Values, isCode128B } from '../apps/client/app/products/labels/code128';

const widths = (p: string) => Array.from(p, Number);

describe('pattern table', () => {
  it('has 106 symbols plus STOP', () => {
    expect(PATTERNS).toHaveLength(107);
    expect(PATTERNS[STOP]).toBe('2331112');
    expect(PATTERNS[START_B]).toBe('211214');
  });

  it('every symbol is 11 modules, 3 bars + 3 spaces of width 1–4, even bar modules, all distinct', () => {
    for (const p of PATTERNS.slice(0, 106)) {
      const w = widths(p);
      expect(w).toHaveLength(6);
      expect(w.every((x) => x >= 1 && x <= 4)).toBe(true);
      expect(w.reduce((a, b) => a + b, 0)).toBe(11);
      expect((w[0] + w[2] + w[4]) % 2).toBe(0);
    }
    expect(new Set(PATTERNS).size).toBe(107);
    expect(widths(PATTERNS[STOP]).reduce((a, b) => a + b, 0)).toBe(13);
  });

  it('spot-checks published values (space, "A", "0", start A/C)', () => {
    expect(PATTERNS[0]).toBe('212222');
    expect(PATTERNS[33]).toBe('111323');
    expect(PATTERNS[16]).toBe('123122');
    expect(PATTERNS[103]).toBe('211412');
    expect(PATTERNS[105]).toBe('211232');
  });
});

describe('code128Values', () => {
  it('"A": 104 + 33 = 137 → 34', () => {
    expect(code128Values('A')).toEqual([104, 33, 34, 106]);
  });

  it('"ABC-123": 104+33+68+105+52+85+108+133 = 688 → 70', () => {
    expect(code128Values('ABC-123')).toEqual([104, 33, 34, 35, 13, 17, 18, 19, 70, 106]);
  });

  it('"12345678": 104+17+36+57+80+105+132+161+192 = 884 → 60', () => {
    expect(code128Values('12345678')?.slice(-2)).toEqual([60, 106]);
  });

  it('"Hello": 104+40+138+228+304+395 = 1209 → 76', () => {
    expect(code128Values('Hello')).toEqual([104, 40, 69, 76, 76, 79, 76, 106]);
  });

  it('rejects empty text and characters outside ASCII 32–126', () => {
    expect(code128Values('')).toBeNull();
    expect(code128Values('Áo dài')).toBeNull();
    expect(code128Values('A\tB')).toBeNull();
    expect(isCode128B(' ~')).toBe(true);
    expect(isCode128B('ñ')).toBe(false);
  });
});

describe('code128Bars', () => {
  it('"A" lays out start B, A, checksum 34, stop between two quiet zones', () => {
    const r = code128Bars('A');
    expect(r).not.toBeNull();
    // 3 symbols × 11 + stop 13 + 2 × 10 quiet
    expect(r!.width).toBe(66);
    const expected: Array<[number, number]> = [];
    let x = QUIET_ZONE;
    for (const p of ['211214', '111323', '131123', '2331112']) {
      widths(p).forEach((w, i) => {
        if (i % 2 === 0) expected.push([x, w]);
        x += w;
      });
    }
    expect(r!.bars).toEqual(expected);
    expect(r!.bars[0]).toEqual([10, 2]);
    // stop ends on a 2-module bar right before the quiet zone
    expect(r!.bars[r!.bars.length - 1]).toEqual([66 - QUIET_ZONE - 2, 2]);
  });

  it('width grows 11 modules per character', () => {
    expect(code128Bars('ABC-123')!.width).toBe(11 * (7 + 2) + 13 + 2 * QUIET_ZONE);
    expect(code128Bars('é')).toBeNull();
  });
});
