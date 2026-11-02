/**
 * #1442 the fee column of the orders file is called "Phụ phí", as on every screen since #1433.
 * Only the words of one header change: the data, the column order and the key `damageFee` stay. Nothing in the apps or on the
 * web reads the headers (the issue lists who reads the file), but a shop's own sheet may read the columns by position.
 *
 * The real route and the real Excel builder run; only auth, the database and `next/server` are replaced.
 */
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: Object.assign(
    function NextResponse(this: any, body: any, init?: any) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = init?.headers || {};
    },
    { json: (body: any, init?: any) => ({ body, status: init?.status || 200 }) },
  ),
}));

jest.mock('@rentalshop/auth/server', () => ({
  withPermissions: () => (handler: any) => (request: any) =>
    handler(request, { user: { id: 3, role: 'MERCHANT', email: 'm@x' }, userScope: { merchantId: 2 } }),
}));

const mockFindMany = jest.fn();
jest.mock('@rentalshop/database', () => ({
  db: { outletOperations: { merchantOutletIds: jest.fn() } },
  prisma: { order: { findMany: (...args: any[]) => mockFindMany(...args) } },
}));

jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../../packages/utils/src/core/date'),
  ...jest.requireActual('../../packages/utils/src/core/date-range'),
  ...jest.requireActual('../../packages/utils/src/core/excel'),
  formatFullName: (first?: string, last?: string) => [first, last].filter(Boolean).join(' '),
  handleApiError: (error: any) => ({ response: { success: false, message: String(error?.stack || error) }, statusCode: 500 }),
  ResponseBuilder: { error: (code: string) => ({ success: false, code }) },
}));

import * as XLSX from 'xlsx';
import { GET } from '../../apps/api/app/api/orders/export/route';

const HEADERS = [
  'Mã đơn hàng', 'NV tạo đơn', 'Ngày thuê', 'Ngày lấy', 'Ngày trả', 'Cọc', 'Tiền thế chân', 'Tổng đơn', 'Giảm giá', 'Loại giảm',
  'Số điện thoại KH', 'Tên khách', 'Phụ phí', 'Cọc giấy tờ', 'Trạng thái đơn', 'Ghi chú',
];
const FEE_COLUMN = 12;

const request = (format: string): any => ({ url: `http://localhost/api/orders/export?format=${format}&period=1year` });
const cells = (res: any): any[][] => {
  const workbook = XLSX.read(Buffer.from(res.body), { type: 'buffer' });
  return XLSX.utils.sheet_to_json<any[]>(workbook.Sheets['Orders'], { header: 1, defval: '' });
};

beforeEach(() => {
  mockFindMany.mockResolvedValue([
    {
      orderNumber: '123456', orderType: 'RENT', status: 'RETURNED', totalAmount: 1150000, depositAmount: 230000, securityDeposit: 300000,
      damageFee: 50000, discountType: 'AMOUNT', discountAmount: 100000, createdAt: new Date('2026-10-20T03:00:00Z'),
      pickupPlanAt: new Date('2026-10-22T02:00:00Z'), returnPlanAt: new Date('2026-10-25T11:00:00Z'), pickedUpAt: null, returnedAt: null,
      collateralType: null, collateralDetails: null, notes: 'ghi chú', customer: { firstName: 'An', lastName: 'Lê', phone: '0901234567' },
      createdBy: { firstName: 'Lan', lastName: 'Ngô', email: 'l@x' },
    },
  ]);
});

describe('GET /api/orders/export headers (#1442)', () => {
  it('Excel: the fee column is "Phụ phí", the other headers and their order stay', async () => {
    const res: any = await GET(request('excel'));
    expect(res.status).toBe(200);
    expect(cells(res)[0]).toEqual(HEADERS);
  });

  it('Excel: the column keeps the same number, in the same place', async () => {
    const row = cells(await GET(request('excel')))[1];
    expect(row).toHaveLength(HEADERS.length);
    expect(row[0]).toBe('123456');
    expect(row[7]).toBe(1150000);
    expect(row[FEE_COLUMN]).toBe(50000);
    expect(row[15]).toBe('ghi chú');
  });

  it('CSV: the same headers and the same number', async () => {
    const res: any = await GET(request('csv'));
    const [header, row] = String(res.body).split('\n');
    expect(header.split(',')).toEqual(HEADERS);
    expect(row.split(',')[FEE_COLUMN]).toBe('50000');
  });
});
