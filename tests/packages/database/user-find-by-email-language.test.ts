/**
 * #1539 — db.users.findByEmail reads the shop language, so the password reset / verification email routes can send
 * the email in it. The other selected fields stay as they were (login reads them).
 */
const mockFindUnique = jest.fn(async (_args: any) => null);
jest.mock('../../../packages/database/src/client', () => ({
  prisma: { user: { findUnique: (args: any) => mockFindUnique(args) } },
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
