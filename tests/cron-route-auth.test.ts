import assert from 'node:assert/strict';
import test from 'node:test';

import { usesRouteManagedAuth } from '../apps/api/lib/route-auth';

test('expiry reminder cron uses route-level CRON_SECRET authentication', () => {
  assert.equal(
    usesRouteManagedAuth('/api/cron/subscription-expiry-reminders'),
    true,
  );
});

test('loyalty expiry cron uses route-level CRON_SECRET authentication', () => {
  assert.equal(usesRouteManagedAuth('/api/cron/loyalty-expire'), true);
});

test('normal API routes still require a user JWT', () => {
  assert.equal(usesRouteManagedAuth('/api/orders'), false);
  assert.equal(usesRouteManagedAuth('/api/cron/future-unsecured-job'), false);
});
