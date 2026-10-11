/**
 * #848: the admin subscription detail page shows Resume for a suspended (PAUSED) subscription
 * and Cancel for a TRIAL one. Buttons follow what the API accepts:
 * POST /resume takes PAUSED (or CANCELLED); POST /cancel takes any status.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { subscriptionActions } from '../apps/admin/app/subscriptions/[id]/subscription-actions';

const page = fs.readFileSync(
  path.resolve(__dirname, '../apps/admin/app/subscriptions/[id]/page.tsx'),
  'utf8'
);
const resumeRoute = fs.readFileSync(
  path.resolve(__dirname, '../apps/api/app/api/subscriptions/[id]/resume/route.ts'),
  'utf8'
);

describe('subscriptionActions (#848)', () => {
  it.each([
    ['ACTIVE', { canSuspend: true, canCancel: true, canResume: false }],
    ['active', { canSuspend: true, canCancel: true, canResume: false }],
    ['TRIAL', { canSuspend: false, canCancel: true, canResume: false }],
    ['PAUSED', { canSuspend: false, canCancel: false, canResume: true }],
    ['paused', { canSuspend: false, canCancel: false, canResume: true }],
    ['CANCELLED', { canSuspend: false, canCancel: false, canResume: false }],
    ['EXPIRED', { canSuspend: false, canCancel: false, canResume: false }],
    ['PAST_DUE', { canSuspend: false, canCancel: false, canResume: false }],
  ])('%s', (status, expected) => {
    expect(subscriptionActions(status)).toEqual(expected);
  });

  it('no status shows no action', () => {
    expect(subscriptionActions(undefined)).toEqual({ canSuspend: false, canCancel: false, canResume: false });
  });

  it('every status that shows Resume is one the resume API accepts', () => {
    for (const s of ['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'PAUSED', 'EXPIRED']) {
      if (subscriptionActions(s).canResume) expect(resumeRoute).toContain(`SUBSCRIPTION_STATUS.${s}`);
    }
  });
});

describe('admin subscription detail page wiring (#848)', () => {
  it('uses the model for the buttons', () => {
    expect(page).toMatch(/subscriptionActions\(/);
    expect(page).toMatch(/actions\.canResume &&/);
    expect(page).toMatch(/actions\.canCancel &&/);
  });

  it('resumes through subscriptionsApi.resume, not a raw fetch, and reloads', () => {
    expect(page).toMatch(/subscriptionsApi\.resume\(/);
    expect(page).not.toMatch(/fetch\([^)]*\/resume/);
    const handler = page.slice(page.indexOf('handleResumeConfirm = async'));
    expect(handler.slice(0, handler.indexOf('};'))).toMatch(/fetchSubscription\(\)/);
  });

  it('Resume uses the shared ConfirmationDialog', () => {
    expect(page).toMatch(/confirmationDialog\.type === 'resume'/);
  });
});
