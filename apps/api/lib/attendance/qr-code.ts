/**
 * #907 Outlet QR code: `a1.<outletId>.<qrVersion>.<D|F>.<dateKey|0>.<sig>`.
 * sig = HMAC-SHA256(key, payload) truncated to 16 bytes, base64url; key = HMAC(JWT_SECRET, 'attendance-qr-v1').
 * Computed, never stored. DAILY codes are valid on their VN day only; FIXED codes until a new version / mode.
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { vnDateKey } from './rules';

export type QrMode = 'DAILY' | 'FIXED';

export interface QrSettingState {
  outletId: number;
  qrVersion: number;
  qrMode: QrMode | string;
}

export interface ParsedQrCode {
  outletId: number;
  qrVersion: number;
  qrMode: QrMode;
  dateKey: string | null;
  signature: string;
}

const PATTERN = /^a1\.(\d{1,10})\.(\d{1,10})\.([DF])\.(\d{4}-\d{2}-\d{2}|0)\.([A-Za-z0-9_-]{1,64})$/;

export function attendanceQrSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
}

function sign(payload: string, secret: string): string {
  const key = createHmac('sha256', secret).update('attendance-qr-v1').digest();
  return createHmac('sha256', key).update(payload).digest().subarray(0, 16).toString('base64url');
}

function payloadOf(outletId: number, qrVersion: number, qrMode: QrMode, dateKey: string | null): string {
  return `a1.${outletId}.${qrVersion}.${qrMode === 'FIXED' ? 'F' : 'D'}.${dateKey ?? '0'}`;
}

export function buildAttendanceQrCode(input: {
  outletId: number;
  qrVersion: number;
  qrMode: QrMode | string;
  now: Date;
  secret: string;
}): { code: string; validDate: string | null } {
  const mode: QrMode = input.qrMode === 'FIXED' ? 'FIXED' : 'DAILY';
  const validDate = mode === 'DAILY' ? vnDateKey(input.now) : null;
  const payload = payloadOf(input.outletId, input.qrVersion, mode, validDate);
  return { code: `${payload}.${sign(payload, input.secret)}`, validDate };
}

export function parseAttendanceQrCode(code: string): ParsedQrCode | null {
  const m = PATTERN.exec(String(code || '').trim());
  if (!m) return null;
  const qrMode: QrMode = m[3] === 'F' ? 'FIXED' : 'DAILY';
  const dateKey = m[4] === '0' ? null : m[4];
  if ((qrMode === 'DAILY') !== (dateKey !== null)) return null;
  return { outletId: Number(m[1]), qrVersion: Number(m[2]), qrMode, dateKey, signature: m[5] };
}

export function verifyAttendanceQrCode(code: string, setting: QrSettingState | null, now: Date, secret: string): boolean {
  const parsed = parseAttendanceQrCode(code);
  if (!parsed || !setting || setting.qrVersion <= 0) return false;
  if (parsed.outletId !== setting.outletId || parsed.qrVersion !== setting.qrVersion) return false;
  if (parsed.qrMode !== (setting.qrMode === 'FIXED' ? 'FIXED' : 'DAILY')) return false;
  if (parsed.qrMode === 'DAILY' && parsed.dateKey !== vnDateKey(now)) return false;
  const expected = Buffer.from(sign(payloadOf(parsed.outletId, parsed.qrVersion, parsed.qrMode, parsed.dateKey), secret));
  const given = Buffer.from(parsed.signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
