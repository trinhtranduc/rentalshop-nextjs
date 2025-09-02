// ============================================================================
// SUBSCRIPTION TYPES
// ============================================================================

import type { BillingCycle } from './plan';

export type SubscriptionPaymentMethod = 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'PAYPAL' | 'STRIPE' | 'CASH';
export type SubscriptionPaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

export interface Subscription {
  id: number;                    // This represents the publicId from database
  merchantId: number;            // Merchant ID
  planId: number;                // Plan ID
  status: SubscriptionStatus;    // Subscription status
  startDate: Date;               // Subscription start date
  endDate: Date;                 // Subscription end date
  trialEndDate?: Date;           // Trial end date
  nextBillingDate: Date;         // Next billing date
  amount: number;                // Subscription amount
  currency: string;              // Currency code
  billingCycle: BillingCycle;    // Billing cycle
  autoRenew: boolean;            // Whether to auto-renew
  cancelledAt?: Date;            // When subscription was cancelled
  cancellationReason?: string;    // Reason for cancellation
  createdAt: Date;
  updatedAt: Date;
  
  // Relations (forward references to avoid circular dependencies)
  merchant?: any;                // Merchant details
  plan?: any;                    // Plan details
  payments?: SubscriptionPayment[]; // Payment history
}

export interface SubscriptionCreateInput {
  merchantId: number;
  planId: number;
  startDate: Date;
  endDate: Date;
  trialEndDate?: Date;
  nextBillingDate: Date;
  amount: number;
  currency?: string;
  billingCycle?: BillingCycle;
  autoRenew?: boolean;
}

export interface SubscriptionUpdateInput {
  status?: SubscriptionStatus;
  endDate?: Date;
  trialEndDate?: Date;
  nextBillingDate?: Date;
  amount?: number;
  currency?: string;
  billingCycle?: BillingCycle;
  autoRenew?: boolean;
  cancelledAt?: Date;
  cancellationReason?: string;
}

export interface SubscriptionPayment {
  id: number;                    // This represents the publicId from database
  subscriptionId: number;        // Subscription ID
  amount: number;                // Payment amount
  currency: string;              // Currency code
  status: SubscriptionPaymentStatus;         // Payment status
  method: SubscriptionPaymentMethod;         // Payment method
  reference: string;             // Payment reference
  transactionId?: string;        // External transaction ID
  description: string;            // Payment description
  paidAt?: Date;                 // When payment was made
  failedAt?: Date;               // When payment failed
  failureReason?: string;        // Reason for failure
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionPaymentCreateInput {
  subscriptionId: number;
  amount: number;
  currency?: string;
  status: SubscriptionPaymentStatus;
  method: SubscriptionPaymentMethod;
  reference: string;
  transactionId?: string;
  description: string;
  paidAt?: Date;
  failedAt?: Date;
  failureReason?: string;
}

export interface SubscriptionPaymentUpdateInput {
  status?: SubscriptionPaymentStatus;
  transactionId?: string;
  paidAt?: Date;
  failedAt?: Date;
  failureReason?: string;
}

export type SubscriptionStatus = 
  | 'ACTIVE'           // Subscription is active
  | 'TRIAL'            // In trial period
  | 'EXPIRED'          // Subscription expired
  | 'CANCELLED'        // Subscription cancelled
  | 'PAST_DUE'         // Payment past due
  | 'SUSPENDED';       // Subscription suspended

// Import BillingCycle from plan.ts to avoid duplication
export type { BillingCycle } from './plan';
