/**
 * #1539 — db.users.findByEmail reads the shop language, so the password reset / verification email routes can send
 * the email in it. The other selected fields stay as they were (login reads them).
 */
const mockFindUnique = jest.fn(async (_args: any) => null);
const mockMerchantFindUnique = jest.fn(async (_args: any) => null);
jest.mock('../../../packages/database/src/client', () => ({
  prisma: {
    user: { findUnique: (args: any) => mockFindUnique(args) },
    merchant: { findUnique: (args: any) => mockMerchantFindUnique(args) },
  },
}));
jest.mock('@rentalshop/auth/server', () => ({ hashPassword: jest.fn() }));
jest.mock('@rentalshop/utils', () => ({
  removeVietnameseDiacritics: (s: string) => s,
  ApiError: class extends Error {},
  ErrorCode: {},
}));

import { simplifiedUsers } from '../../../packages/database/src/user';

describe('db.users.findByEmail selects merchant.language (#1539)', () => {
  it('merchant select is id, name and language', async () => {
    await simplifiedUsers.findByEmail('owner@shop.com');
    const args = mockFindUnique.mock.calls[0][0];
    expect(args.where).toEqual({ email: 'owner@shop.com' });
    expect(args.select.merchant).toEqual({ select: { id: true, name: true, language: true } });
    expect(args.select.outlet).toEqual({ select: { id: true, name: true, isActive: true } });
    expect(args.select.password).toBe(true);
  });
});

describe('db.users.findById selects merchant.language (#1539, GET /api/users/profile)', () => {
  it('the profile row carries the shop language (a mock row with the column hid this once)', async () => {
    mockFindUnique.mockClear();
    await simplifiedUsers.findById(10);
    const args = mockFindUnique.mock.calls[0][0];
    expect(args.include.merchant.select.language).toBe(true);
    expect(args.include.merchant.select.timezone).toBe(true);
  });
});
