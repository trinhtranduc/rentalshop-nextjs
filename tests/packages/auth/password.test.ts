/**
 * Unit tests for @rentalshop/auth - Password utilities
 */
import { hashPassword, comparePassword } from '../../../packages/auth/src/password';

describe('@rentalshop/auth - Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password and return a string', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
    });

    it('should produce different hashes for the same password (salt)', async () => {
      const password = 'samePassword';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce a bcrypt-formatted hash', async () => {
      const hash = await hashPassword('test');
      // bcrypt hashes start with $2a$ or $2b$
      expect(hash).toMatch(/^\$2[ab]\$/);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'correctPassword';
      const hash = await hashPassword(password);
      const result = await comparePassword(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'correctPassword';
      const hash = await hashPassword(password);
      const result = await comparePassword('wrongPassword', hash);

      expect(result).toBe(false);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('somePassword');
      const result = await comparePassword('', hash);

      expect(result).toBe(false);
    });

    it('should handle special characters in password', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const hash = await hashPassword(password);
      const result = await comparePassword(password, hash);

      expect(result).toBe(true);
    });

    it('should handle unicode characters', async () => {
      const password = 'mật_khẩu_tiếng_việt_🔐';
      const hash = await hashPassword(password);
      const result = await comparePassword(password, hash);

      expect(result).toBe(true);
    });
  });
});
