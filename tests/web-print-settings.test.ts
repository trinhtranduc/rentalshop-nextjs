/**
 * #623 printer paper sizes (this browser) and the barcode label model. Pure; run under TZ=UTC and
 * TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  DEFAULT_PRINT_SETTINGS,
  PRINT_SETTINGS_KEY,
  labelLayout,
  labelPageCss,
  labelSizeText,
  parsePrintSettings,
  readPrintSettings,
  writePrintSettings,
} from '../apps/client/lib/print-settings';
import {
  buildPrintJob,
  clampCopies,
  pageCheck,
  parseIdsParam,
  setCopies,
  toLabelProduct,
  toPages,
  togglePagePicks,
  togglePick,
  type Picks,
} from '../apps/client/app/products/labels/labels-model';

const memory = () => {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
};

describe('print settings storage', () => {
  it('defaults: bill 80 mm, label 50×30', () => {
    expect(DEFAULT_PRINT_SETTINGS).toEqual({ billWidth: 80, label: '50x30', custom: { w: 50, h: 30 } });
    expect(readPrintSettings(memory())).toEqual(DEFAULT_PRINT_SETTINGS);
    expect(readPrintSettings(null)).toEqual(DEFAULT_PRINT_SETTINGS);
  });

  it('round-trips what was saved', () => {
    const store = memory();
    expect(writePrintSettings({ billWidth: 58, label: 'custom', custom: { w: 60, h: 40 } }, store)).toBe(true);
    expect(Object.keys(store.data)).toEqual([PRINT_SETTINGS_KEY]);
    expect(readPrintSettings(store)).toEqual({ billWidth: 58, label: 'custom', custom: { w: 60, h: 40 } });
  });

  it('survives blocked storage (read → defaults, write → false)', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
    };
    expect(readPrintSettings(blocked)).toEqual(DEFAULT_PRINT_SETTINGS);
    expect(writePrintSettings(DEFAULT_PRINT_SETTINGS, blocked)).toBe(false);
    expect(writePrintSettings(DEFAULT_PRINT_SETTINGS, null)).toBe(false);
  });

  it('cleans junk field by field', () => {
    expect(parsePrintSettings('{not json')).toEqual(DEFAULT_PRINT_SETTINGS);
    expect(parsePrintSettings({ billWidth: 57, label: '99x99' })).toEqual(DEFAULT_PRINT_SETTINGS);
    expect(parsePrintSettings({ billWidth: 58, label: '2x35x22' })).toEqual({ ...DEFAULT_PRINT_SETTINGS, billWidth: 58, label: '2x35x22' });
    // custom W 20–110, H 10–100, whole mm
    expect(parsePrintSettings({ label: 'custom', custom: { w: 5, h: 500 } }).custom).toEqual({ w: 20, h: 100 });
    expect(parsePrintSettings({ label: 'custom', custom: { w: '62.4', h: 'x' } }).custom).toEqual({ w: 62, h: 30 });
  });
});

describe('label layout', () => {
  const at = (label: string, custom = { w: 50, h: 30 }) => labelLayout({ label: label as never, custom });

  it('presets: one label per page', () => {
    expect(at('50x30')).toEqual({ labelW: 50, labelH: 30, perRow: 1, pageW: 50, pageH: 30 });
    expect(at('40x30')).toEqual({ labelW: 40, labelH: 30, perRow: 1, pageW: 40, pageH: 30 });
    expect(at('35x22')).toEqual({ labelW: 35, labelH: 22, perRow: 1, pageW: 35, pageH: 22 });
  });

  it('2×(35×22): two labels side by side on a 70×22 page', () => {
    expect(at('2x35x22')).toEqual({ labelW: 35, labelH: 22, perRow: 2, pageW: 70, pageH: 22 });
    expect(labelSizeText(at('2x35x22'))).toBe('2 × (35 × 22 mm)');
  });

  it('custom size, clamped', () => {
    expect(at('custom', { w: 62, h: 29 })).toMatchObject({ pageW: 62, pageH: 29, perRow: 1 });
    expect(at('custom', { w: 300, h: 1 })).toMatchObject({ pageW: 110, pageH: 10 });
  });

  it('@page is the label row with no margin', () => {
    expect(labelPageCss(at('50x30'))).toBe('@media print { @page { size: 50mm 30mm; margin: 0; } }');
    expect(labelPageCss(at('2x35x22'))).toBe('@media print { @page { size: 70mm 22mm; margin: 0; } }');
    expect(labelSizeText(at('50x30'))).toBe('50 × 30 mm');
  });
});

describe('labels model', () => {
  const a = toLabelProduct({ id: 1, name: ' Áo dài đỏ ', barcode: ' AD-001 ' });
  const b = toLabelProduct({ id: 2, name: 'Vest', barcode: '' });
  const c = toLabelProduct({ id: 3, name: 'Váy', barcode: 'VÁY-01' });
  const d = toLabelProduct({ id: 4, name: 'Giày', barcode: '8935001' });

  it('maps API rows (trimmed, empty code → null)', () => {
    expect(a).toEqual({ id: 1, name: 'Áo dài đỏ', barcode: 'AD-001' });
    expect(b.barcode).toBeNull();
    expect(toLabelProduct({ id: 9 })).toEqual({ id: 9, name: '', barcode: null });
  });

  it('parses ?ids=', () => {
    expect(parseIdsParam('3,5,5,x,-1,0,2.5, 7')).toEqual([3, 5, 7]);
    expect(parseIdsParam(null)).toEqual([]);
    expect(parseIdsParam(Array.from({ length: 150 }, (_, i) => i + 1).join(','))).toHaveLength(100);
  });

  it('copies stay 1–99', () => {
    expect(clampCopies('3')).toBe(3);
    expect(clampCopies(0)).toBe(1);
    expect(clampCopies(250)).toBe(99);
    expect(clampCopies('abc')).toBe(1);
    expect(clampCopies(2.7)).toBe(2);
  });

  it('toggles one product and sets its copies', () => {
    let picks: Picks = togglePick([], a);
    expect(picks).toEqual([{ product: a, copies: 1 }]);
    picks = setCopies(picks, 1, '4');
    expect(picks[0].copies).toBe(4);
    expect(togglePick(picks, a)).toEqual([]);
  });

  it('select all on the page, then clear it (other pages untouched)', () => {
    const start = togglePick([], d);
    expect(pageCheck(start, [a, b])).toBe('none');
    const all = togglePagePicks(togglePick(start, a), [a, b]);
    expect(all.map((x) => x.product.id)).toEqual([4, 1, 2]);
    expect(pageCheck(all, [a, b])).toBe('all');
    expect(pageCheck(togglePick(all, b), [a, b])).toBe('some');
    expect(togglePagePicks(all, [a, b]).map((x) => x.product.id)).toEqual([4]);
    expect(pageCheck([], [])).toBe('none');
  });

  it('one label per copy; no code and non-ASCII codes are skipped, not printed', () => {
    const picks: Picks = [
      { product: a, copies: 2 },
      { product: b, copies: 3 },
      { product: c, copies: 1 },
      { product: d, copies: 1 },
    ];
    const job = buildPrintJob(picks);
    expect(job.labels.map((l) => `${l.key}:${l.code}`)).toEqual(['1-0:AD-001', '1-1:AD-001', '4-0:8935001']);
    expect(job.labels[0].name).toBe('Áo dài đỏ');
    expect(job.skipped).toEqual([
      { id: 2, name: 'Vest', reason: 'empty' },
      { id: 3, name: 'Váy', reason: 'invalid' },
    ]);
    expect(buildPrintJob([])).toEqual({ labels: [], skipped: [] });
  });

  it('groups labels into printed pages', () => {
    expect(toPages([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
    expect(toPages([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
    expect(toPages([], 2)).toEqual([]);
  });
});
