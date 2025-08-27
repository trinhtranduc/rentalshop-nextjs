// ============================================================================
// CUSTOMER MANAGEMENT TYPES
// ============================================================================

import { Customer, CustomerCreateInput, CustomerUpdateInput } from './customer';

export interface CustomerManagement {
  createCustomer(input: CustomerCreateInput): Promise<Customer>;
  updateCustomer(id: number, input: CustomerUpdateInput): Promise<Customer>;
  deleteCustomer(id: number): Promise<void>;
  getCustomer(id: number): Promise<Customer | null>;
  getCustomers(filters?: any): Promise<Customer[]>;
}
