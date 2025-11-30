import { authenticatedFetch, parseApiResponse } from '../core';
import { apiUrls } from '../config/api';

// ============================================================================
// BANK ACCOUNT API TYPES
// ============================================================================

export interface BankAccount {
  id: number;
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  bankCode?: string;
  branch?: string;
  isDefault: boolean;
  qrCode?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  outletId: number;
}

export interface BankAccountInput {
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  bankCode?: string;
  branch?: string;
  isDefault?: boolean;
  notes?: string;
}

export interface BankAccountUpdateInput extends Partial<BankAccountInput> {
  isActive?: boolean;
}

export interface BankAccountApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: any;
}

// ============================================================================
// BANK ACCOUNT API
// ============================================================================

export const bankAccountsApi = {
  /**
   * Get all bank accounts for an outlet
   */
  async getBankAccounts(merchantId: number, outletId: number): Promise<BankAccountApiResponse<BankAccount[]>> {
    const response = await authenticatedFetch(
      apiUrls.merchants.outlets.bankAccounts.list(merchantId, outletId)
    );
    return parseApiResponse<BankAccount[]>(response);
  },

  /**
   * Get a specific bank account
   */
  async getBankAccount(
    merchantId: number,
    outletId: number,
    accountId: number
  ): Promise<BankAccountApiResponse<BankAccount>> {
    const response = await authenticatedFetch(
      apiUrls.merchants.outlets.bankAccounts.get(merchantId, outletId, accountId)
    );
    return parseApiResponse<BankAccount>(response);
  },

  /**
   * Create a new bank account
   */
  async createBankAccount(
    merchantId: number,
    outletId: number,
    data: BankAccountInput
  ): Promise<BankAccountApiResponse<BankAccount>> {
    const response = await authenticatedFetch(
      apiUrls.merchants.outlets.bankAccounts.create(merchantId, outletId),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );
    return parseApiResponse<BankAccount>(response);
  },

  /**
   * Update a bank account
   */
  async updateBankAccount(
    merchantId: number,
    outletId: number,
    accountId: number,
    data: BankAccountUpdateInput
  ): Promise<BankAccountApiResponse<BankAccount>> {
    const response = await authenticatedFetch(
      apiUrls.merchants.outlets.bankAccounts.update(merchantId, outletId, accountId),
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );
    return parseApiResponse<BankAccount>(response);
  },

  /**
   * Delete (soft delete) a bank account
   */
  async deleteBankAccount(
    merchantId: number,
    outletId: number,
    accountId: number
  ): Promise<BankAccountApiResponse<BankAccount>> {
    const response = await authenticatedFetch(
      apiUrls.merchants.outlets.bankAccounts.delete(merchantId, outletId, accountId),
      {
        method: 'DELETE',
      }
    );
    return parseApiResponse<BankAccount>(response);
  },
};

