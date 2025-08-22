// ============================================================================
// CUSTOMER MANAGEMENT TYPES
// ============================================================================

import { Customer, CustomerCreateInput, CustomerUpdateInput } from './customer';

export interface CustomerManagement {
  createCustomer(input: CustomerCreateInput): Promise<Customer>;
  updateCustomer(id: string, input: CustomerUpdateInput): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;
  getCustomer(id: string): Promise<Customer | null>;
  getCustomers(filters?: any): Promise<Customer[]>;
}
