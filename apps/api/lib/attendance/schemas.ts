/** #907 zod pieces shared by the attendance routes. */
import { z } from 'zod';

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealDateKey(value: string): boolean {
  const m = DATE_KEY.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d;
}

export const dateKeySchema = z.string().refine(isRealDateKey, 'Expected a YYYY-MM-DD day');
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected YYYY-MM');
export const hhmmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm');
export const idSchema = z.number().int().positive();
export const queryIdSchema = z.coerce.number().int().positive();
export const isoInstantSchema = z.string().datetime({ offset: true });
export const reasonSchema = z.string().trim().min(1).max(500);
export const shiftColorSchema = z.enum(['blue', 'purple', 'green', 'orange']);
export const weekdaysSchema = z
  .array(z.number().int().min(1).max(7))
  .min(1)
  .max(7)
  .transform((days) => [...new Set(days)].sort((a, b) => a - b));

export function queryOf(url: string): Record<string, string> {
  return Object.fromEntries(new URL(url).searchParams.entries());
}

export async function bodyOf(request: { json: () => Promise<unknown> }): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/** Route param as a positive integer, or null. */
export function paramId(value: string | undefined): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}
