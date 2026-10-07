/**
 * #361 — a SALE is paid in full when it is created: it stores no deposit.
 */
import { resolveOrderDeposits } from '../../apps/api/lib/order-deposits';

describe('resolveOrderDeposits (#361)', () => {
  it('stores 0 for SALE whatever the client sends', () => {
    expect(resolveOrderDeposits('SALE', 300000, 500000)).toEqual({ depositAmount: 0, securityDeposit: 0 });
  });

  it('keeps the client values for RENT', () => {
    expect(resolveOrderDeposits('RENT', 300000, 500000)).toEqual({ depositAmount: 300000, securityDeposit: 500000 });
  });

  it('defaults missing values to 0', () => {
    expect(resolveOrderDeposits('RENT', undefined, undefined)).toEqual({ depositAmount: 0, securityDeposit: 0 });
  });
});
