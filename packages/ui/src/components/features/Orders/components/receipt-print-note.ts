/**
 * Outlet note printed at the bottom of RENT receipts (#347), e.g.
 * "*** Vui lòng mang theo CMND/BLX khi lấy đồ". SALE receipts never print it.
 *
 * The order's own outlet wins; the `outlet` prop covers a just-created order whose
 * response has no nested outlet.
 */
type WithPrintNote = { printNote?: string | null } | null | undefined;

export function resolveReceiptPrintNote(
  order: { orderType?: string | null; outlet?: WithPrintNote },
  outlet?: WithPrintNote
): string | null {
  const orderType = order.orderType || 'RENT';
  if (orderType !== 'RENT') return null;
  const note = order.outlet?.printNote || outlet?.printNote || '';
  return note.trim() === '' ? null : note;
}
