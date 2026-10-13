/** #918 Vietnamese words for the Excel "Chi tiết" sheet (the web shows the same words). */

const REJECT_REASONS: Record<string, string> = {
  OUT_OF_RANGE: 'Ngoài vùng',
  GPS_INACCURATE: 'GPS chưa chính xác',
  MOCK_LOCATION: 'Vị trí giả',
  QR_EXPIRED: 'Mã QR hết hiệu lực',
  QR_WRONG_OUTLET: 'Mã QR của chi nhánh khác',
  ATTENDANCE_NOT_CONFIGURED: 'Chi nhánh chưa cài vị trí',
};

/** IN → "Vào", OUT → "Ra". */
export function scanKindLabel(action: string | null | undefined): string {
  if (action === 'IN') return 'Vào';
  if (action === 'OUT') return 'Ra';
  return action ?? '';
}

/** ACCEPTED → "Ghi nhận"; a rejection → "Từ chối · <lý do>" (an unknown code is kept as is). */
export function scanResultLabel(result: string): string {
  if (result === 'ACCEPTED') return 'Ghi nhận';
  return `Từ chối · ${REJECT_REASONS[result] ?? result}`;
}
