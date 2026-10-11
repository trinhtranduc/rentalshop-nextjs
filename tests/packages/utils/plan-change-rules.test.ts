/**
 * #785: who may change which plan, when (owner rules of 2026-10-11).
 * - A merchant never changes plan in the middle of a period.
 * - Admin / OPS: in the middle of a period only an upgrade (higher monthly price); a downgrade only in a new period.
 * - New period = the subscription has ended, or it is a trial being turned into a paid plan.
 */
import { canChangePlan } from '../../../packages/utils/src/core/plan-change-rules';

const NOW = new Date('2026-10-11T03:00:00Z');
const future = new Date('2026-10-25T03:00:00Z');
const past = new Date('2026-10-01T03:00:00Z');

const base = { status: 'ACTIVE', currentPeriodEnd: future, currentPlanId: 1, currentBasePrice: 100000, newPlanId: 2, newBasePrice: 300000, now: NOW };

describe('canChangePlan: in the middle of a period', () => {
  it('a merchant is refused whatever the plan (PLAN_CHANGE_ONLY_AT_NEW_PERIOD, 403)', () => {
    for (const newBasePrice of [300000, 100000, 50000]) {
      expect(canChangePlan({ ...base, role: 'MERCHANT', newBasePrice })).toMatchObject({
        allowed: false, code: 'PLAN_CHANGE_ONLY_AT_NEW_PERIOD', status: 403
      });
    }
  });

  it.each(['ADMIN', 'OPS'])('%s may upgrade (higher monthly price)', (role) => {
    expect(canChangePlan({ ...base, role })).toMatchObject({ allowed: true, newPeriod: false, isUpgrade: true });
  });

  it.each(['ADMIN', 'OPS'])('%s is refused a downgrade (DOWNGRADE_ONLY_AT_NEW_PERIOD, 422)', (role) => {
    expect(canChangePlan({ ...base, role, newBasePrice: 50000 })).toMatchObject({
      allowed: false, code: 'DOWNGRADE_ONLY_AT_NEW_PERIOD', status: 422
    });
  });

  it('the same price is not an upgrade, so it is refused too', () => {
    expect(canChangePlan({ ...base, role: 'ADMIN', newBasePrice: 100000 })).toMatchObject({ allowed: false, code: 'DOWNGRADE_ONLY_AT_NEW_PERIOD' });
  });

  it('the same plan again (another billing cycle) is refused in the middle of a period', () => {
    expect(canChangePlan({ ...base, role: 'ADMIN', newPlanId: 1, newBasePrice: 100000 })).toMatchObject({ allowed: false });
  });
});

describe('canChangePlan: in a new period', () => {
  it.each(['MERCHANT', 'ADMIN', 'OPS'])('%s may change to any plan once the subscription has ended, even a downgrade', (role) => {
    for (const newBasePrice of [300000, 100000, 50000]) {
      expect(canChangePlan({ ...base, role, currentPeriodEnd: past, newBasePrice })).toMatchObject({ allowed: true, newPeriod: true });
    }
  });

  it('an end exactly now counts as ended', () => {
    expect(canChangePlan({ ...base, role: 'MERCHANT', currentPeriodEnd: NOW })).toMatchObject({ allowed: true, newPeriod: true });
  });

  it('a missing end counts as ended', () => {
    expect(canChangePlan({ ...base, role: 'MERCHANT', currentPeriodEnd: null })).toMatchObject({ allowed: true, newPeriod: true });
  });

  it.each(['MERCHANT', 'ADMIN'])('a trial (still running) may be turned into any plan by %s', (role) => {
    expect(canChangePlan({ ...base, role, status: 'TRIAL', currentBasePrice: 0 })).toMatchObject({ allowed: true, newPeriod: true });
  });

  it('the status is read case-insensitively', () => {
    expect(canChangePlan({ ...base, role: 'MERCHANT', status: 'trial', currentBasePrice: 0 })).toMatchObject({ allowed: true });
  });
});

describe('canChangePlan: who else', () => {
  it('a role that is not ADMIN, OPS or MERCHANT is never allowed', () => {
    expect(canChangePlan({ ...base, role: 'OUTLET_ADMIN', currentPeriodEnd: past })).toMatchObject({ allowed: false, status: 403 });
  });
});
