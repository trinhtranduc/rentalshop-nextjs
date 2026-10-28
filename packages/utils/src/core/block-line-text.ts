/**
 * Day-block order line text (#1189): the short label "Khối 3 ngày + 2 ngày thêm" and the formula
 * "120.000đ (3 ngày) + 2 × 20.000đ = 160.000đ", from `OrderItem.pricingSnapshot` (what the order was priced with).
 * Pure; the caller passes the translated words and the money formatter.
 */

export interface BlockSnapshotLike {
  type?: string | null;
  days?: number | null;
  quantity?: number | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
  basePrice?: number | null;
  extraDays?: number | null;
  extraAmount?: number | null;
  extraPrice?: number | null;
  overridden?: boolean | null;
}

export interface BlockLineWords {
  /** "Khối {n} ngày" */
  block: string;
  /** "Khối {n} ngày + {m} ngày thêm" */
  blockExtra: string;
  /** "{n} ngày" */
  days: string;
}

export interface BlockLineText {
  /** "Khối 3 ngày + 2 ngày thêm" */
  label: string;
  /** "120.000đ (3 ngày) + 2 × 20.000đ = 160.000đ"; with quantity > 1 "2 × (...)" */
  formula: string;
}

const fill = (template: string, values: Record<string, number>) =>
  template.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));

/** The snapshot of a BLOCK line, or null for any other line */
export function blockSnapshotOf(snapshot: unknown): BlockSnapshotLike | null {
  const s = snapshot as BlockSnapshotLike | null | undefined;
  return s && s.type === 'BLOCK' && Number(s.days) >= 1 ? s : null;
}

/** Text of a BLOCK line; `format` turns an amount into money text (e.g. "120.000đ"). A hand-typed price has no formula. */
export function blockLineText(
  snapshot: BlockSnapshotLike,
  words: BlockLineWords,
  format: (amount: number) => string
): BlockLineText {
  const days = Math.max(1, Math.round(Number(snapshot.days) || 1));
  const extraDays = Math.max(0, Math.round(Number(snapshot.extraDays) || 0));
  const blockDays = Math.max(1, days - extraDays);
  const qty = Math.max(1, Math.round(Number(snapshot.quantity) || 1));
  const label = extraDays > 0 ? fill(words.blockExtra, { n: blockDays, m: extraDays }) : fill(words.block, { n: blockDays });
  const unit = Number(snapshot.unitPrice) || 0;
  const total = snapshot.totalPrice != null ? Number(snapshot.totalPrice) : unit * qty;
  if (snapshot.overridden) return { label, formula: `${format(total)}` };
  const base = format(Number(snapshot.basePrice) || 0);
  let one = `${base} (${fill(words.days, { n: blockDays })})`;
  if (extraDays > 0) {
    const extra = Number(snapshot.extraPrice) || (Number(snapshot.extraAmount) || 0) / extraDays;
    one += ` + ${extraDays} × ${format(extra)}`;
  }
  const formula = qty > 1 ? `${qty} × (${one}) = ${format(total)}` : `${one}${extraDays > 0 ? ` = ${format(total)}` : ''}`;
  return { label, formula };
}
