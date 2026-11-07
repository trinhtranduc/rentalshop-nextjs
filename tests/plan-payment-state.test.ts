/**
 * #1486: state of a plan payment by who enters it (packages/constants planPaymentState).
 */
import { planPaymentState } from '../packages/constants/src/status';

const date = new Date('2026-09-10T03:00:00.000Z');
const now = new Date('2026-11-07T05:00:00.000Z');

describe('planPaymentState', () => {
  it('card: COMPLETED now', () => {
    expect(planPaymentState({ method: 'STRIPE', actorRole: 'MERCHANT', now })).toEqual({ status: 'COMPLETED', processedAt: now });
  });

  it.each(['TRANSFER', 'MANUAL', 'CASH'])('ADMIN entering %s: COMPLETED on the payment date, else now', (method) => {
    expect(planPaymentState({ method, actorRole: 'ADMIN', paymentDate: date, now })).toEqual({ status: 'COMPLETED', processedAt: date });
    expect(planPaymentState({ method, actorRole: 'ADMIN', now })).toEqual({ status: 'COMPLETED', processedAt: now });
  });

  it('OPS counts as platform staff', () => {
    expect(planPaymentState({ method: 'TRANSFER', actorRole: 'OPS', now }).status).toBe('COMPLETED');
  });

  it('a merchant saying it paid by transfer stays PENDING (not revenue until staff confirm)', () => {
    expect(planPaymentState({ method: 'TRANSFER', actorRole: 'MERCHANT', paymentDate: date, now })).toEqual({ status: 'PENDING', processedAt: date });
    expect(planPaymentState({ method: 'TRANSFER', actorRole: 'MERCHANT', now })).toEqual({ status: 'PENDING', processedAt: null });
  });

  it('no actor, or a method that is not a received-money method: PENDING', () => {
    expect(planPaymentState({ method: 'TRANSFER', now }).status).toBe('PENDING');
    expect(planPaymentState({ method: 'CHECK', actorRole: 'ADMIN', now }).status).toBe('PENDING');
    expect(planPaymentState({ actorRole: 'ADMIN', now }).status).toBe('PENDING');
  });
});
