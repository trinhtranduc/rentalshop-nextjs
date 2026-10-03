import { ORDER_TYPE } from '@rentalshop/constants';

/**
 * Deposits stored on a new order (#361). A SALE is created COMPLETED and paid in full, so it holds
 * no deposit and no collateral money, whatever the client sends.
 */
export function resolveOrderDeposits(
  orderType: string,
  depositAmount: number | null | undefined,
  securityDeposit: number | null | undefined
): { depositAmount: number; securityDeposit: number } {
  if (orderType === ORDER_TYPE.SALE) {
    return { depositAmount: 0, securityDeposit: 0 };
  }
  return { depositAmount: depositAmount || 0, securityDeposit: securityDeposit || 0 };
}
