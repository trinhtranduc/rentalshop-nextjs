/**
 * #919 web error toast: title in the user's language, auto-hide after 6 s, no click blocking.
 * The policy modules are required inside each test so a missing export fails that test, not the file.
 */
import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

const policy = () => require('../packages/ui/src/components/ui/toast-policy');
const apiToast = () => require('../packages/hooks/src/hooks/apiErrorToast');

describe('toast duration (#919: error toasts hide after 6 s)', () => {
  it('an error toast hides after 6 s even when the caller asks for 0 or nothing', () => {
    const { toastDurationFor, ERROR_TOAST_DURATION_MS } = policy();
    expect(ERROR_TOAST_DURATION_MS).toBe(6000);
    expect(toastDurationFor('error', 0)).toBe(6000);
    expect(toastDurationFor('error', undefined)).toBe(6000);
    expect(toastDurationFor('error', 3000)).toBe(3000);
  });

  it('other toast types keep their durations', () => {
    const { toastDurationFor } = policy();
    expect(toastDurationFor('success', undefined)).toBe(5000);
    expect(toastDurationFor('info', 2000)).toBe(2000);
    expect(toastDurationFor('warning', 0)).toBe(0);
  });
});

describe('global API error toast (#919: title in the user language)', () => {
  it('maps the error code to a toast type and a common.labels title key', () => {
    const { apiErrorToast } = apiToast();
    expect(apiErrorToast('ORDER_NOT_FOUND')).toEqual({ type: 'error', titleKey: 'labels.error' });
    expect(apiErrorToast(undefined)).toEqual({ type: 'error', titleKey: 'labels.error' });
    expect(apiErrorToast('VALIDATION_ERROR')).toEqual({ type: 'warning', titleKey: 'labels.warning' });
    expect(apiErrorToast('INVALID_PHONE')).toEqual({ type: 'warning', titleKey: 'labels.warning' });
  });

  it('the handler has no English title literal and no sticky duration', () => {
    const src = read('packages/hooks/src/hooks/useGlobalErrorHandler.ts');
    expect(src).not.toMatch(/addToast[^\n]*'Error'/);
    expect(src).not.toMatch(/addToast[^\n]*,\s*0\s*\)/);
  });

  it('the title keys exist in all 5 locales', () => {
    for (const lang of ['en', 'vi', 'ja', 'ko', 'zh']) {
      const common = JSON.parse(read(`locales/${lang}/common.json`));
      expect(typeof common.labels.error).toBe('string');
      expect(typeof common.labels.warning).toBe('string');
    }
    expect(JSON.parse(read('locales/vi/common.json')).labels.error).toBe('Lỗi');
  });
});

describe('toast stack does not block clicks (#919)', () => {
  const src = () => read('packages/ui/src/components/ui/toast.tsx');

  it('only a visible toast card takes clicks; a fading toast does not', () => {
    expect(src()).toMatch(/fixed top-4 right-4[^"]*pointer-events-none/);
    expect(src()).toMatch(/isVisible\s*\?[^:]*pointer-events-auto[^:]*:[^)]*pointer-events-none/);
  });

  it('no caller makes an error toast sticky', () => {
    expect(src()).not.toMatch(/addToast\('error'[^\n]*,\s*0\s*\)/);
    expect(read('packages/hooks/src/hooks/useToast.ts')).not.toMatch(/addToast\('error'[^\n]*,\s*0\s*\)/);
  });
});
