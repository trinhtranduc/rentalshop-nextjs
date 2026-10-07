/**
 * Paper sizes of this computer's printers (#623): bill width and barcode label size.
 * Stored in localStorage like the theme (per browser, no API). Pure, so Jest loads it.
 */

export type BillWidth = 80 | 58;
export const BILL_WIDTHS: BillWidth[] = [80, 58];

export const LABEL_PRESETS = ['50x30', '40x30', '35x22', '2x35x22'] as const;
export type LabelPreset = (typeof LABEL_PRESETS)[number];
export type LabelChoice = LabelPreset | 'custom';

export interface PrintSettings {
  billWidth: BillWidth;
  label: LabelChoice;
  /** Used when `label` is 'custom'; kept while a preset is picked so switching back keeps it. */
  custom: { w: number; h: number };
}

export const PRINT_SETTINGS_KEY = 'anyrent-print-settings';

/** Custom label limits (mm). */
export const LABEL_W = { min: 20, max: 110 };
export const LABEL_H = { min: 10, max: 100 };

export const DEFAULT_PRINT_SETTINGS: PrintSettings = { billWidth: 80, label: '50x30', custom: { w: 50, h: 30 } };

/** A whole number of mm inside [min, max]; anything unreadable → fallback. */
export function clampMm(value: unknown, range: { min: number; max: number }, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(range.max, Math.max(range.min, Math.round(n)));
}

/** Stored JSON (or anything) → valid settings; each bad or missing field takes its default. */
export function parsePrintSettings(raw: unknown): PrintSettings {
  let data: unknown = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }
  const o = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const billWidth: BillWidth = o.billWidth === 58 ? 58 : 80;
  const label: LabelChoice =
    o.label === 'custom' || (LABEL_PRESETS as readonly unknown[]).includes(o.label) ? (o.label as LabelChoice) : DEFAULT_PRINT_SETTINGS.label;
  const c = (o.custom && typeof o.custom === 'object' ? o.custom : {}) as Record<string, unknown>;
  const custom = {
    w: clampMm(c.w, LABEL_W, DEFAULT_PRINT_SETTINGS.custom.w),
    h: clampMm(c.h, LABEL_H, DEFAULT_PRINT_SETTINGS.custom.h),
  };
  return { billWidth, label, custom };
}

type ReadStore = Pick<Storage, 'getItem'>;
type WriteStore = Pick<Storage, 'setItem'>;

function browserStore(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Saved settings, or the defaults when storage is empty, blocked or holds junk. */
export function readPrintSettings(store: ReadStore | null = browserStore()): PrintSettings {
  try {
    return parsePrintSettings(store ? store.getItem(PRINT_SETTINGS_KEY) : null);
  } catch {
    return parsePrintSettings(null);
  }
}

/** Saves the settings (cleaned first); false when storage is blocked. */
export function writePrintSettings(settings: PrintSettings, store: WriteStore | null = browserStore()): boolean {
  try {
    if (!store) return false;
    store.setItem(PRINT_SETTINGS_KEY, JSON.stringify(parsePrintSettings(settings)));
    return true;
  } catch {
    return false;
  }
}

export interface LabelLayout {
  /** One label, mm. */
  labelW: number;
  labelH: number;
  /** Labels side by side on one printed page (2 for the 2-up roll). */
  perRow: number;
  /** The printed page (`@page size`), mm. */
  pageW: number;
  pageH: number;
}

/** Label and page size of the current choice. 2×(35×22) prints two labels on one 70×22 page. */
export function labelLayout(settings: Pick<PrintSettings, 'label' | 'custom'>): LabelLayout {
  if (settings.label === 'custom') {
    const w = clampMm(settings.custom?.w, LABEL_W, DEFAULT_PRINT_SETTINGS.custom.w);
    const h = clampMm(settings.custom?.h, LABEL_H, DEFAULT_PRINT_SETTINGS.custom.h);
    return { labelW: w, labelH: h, perRow: 1, pageW: w, pageH: h };
  }
  const m = /^(?:(\d)x)?(\d+)x(\d+)$/.exec(settings.label);
  const perRow = m && m[1] ? Number(m[1]) : 1;
  const labelW = m ? Number(m[2]) : 50;
  const labelH = m ? Number(m[3]) : 30;
  return { labelW, labelH, perRow, pageW: labelW * perRow, pageH: labelH };
}

/** `@page` rule for label printing: the page is exactly the label row, no margin. */
export function labelPageCss(layout: LabelLayout): string {
  return `@media print { @page { size: ${layout.pageW}mm ${layout.pageH}mm; margin: 0; } }`;
}

/** "50 × 30 mm", "2 × (35 × 22 mm)". */
export function labelSizeText(layout: LabelLayout): string {
  const one = `${layout.labelW} × ${layout.labelH} mm`;
  return layout.perRow > 1 ? `${layout.perRow} × (${one})` : one;
}
