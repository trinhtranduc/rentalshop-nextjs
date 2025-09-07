# 💳 Payment Status Guide for Plan Changes

## 🎯 **Payment Status Strategy**

This guide explains the recommended payment statuses for different plan change scenarios.

## 📊 **Payment Status Types**

### **1. COMPLETED** ✅
- **When**: Payment is fully processed and confirmed
- **Use Cases**:
  - Admin-initiated plan changes (immediate)
  - Free upgrades (trial to trial, downgrades)
  - Stripe payments confirmed
  - Bank transfers verified

### **2. PENDING** ⏳
- **When**: Payment is initiated but not yet confirmed
- **Use Cases**:
  - Trial to paid plan changes (awaiting payment)
  - Bank transfers initiated (awaiting verification)
  - Stripe payments processing
  - Manual payments awaiting admin approval

### **3. FAILED** ❌
- **When**: Payment processing failed
- **Use Cases**:
  - Stripe payment declined
  - Bank transfer rejected
  - Insufficient funds
  - Payment timeout

### **4. REFUNDED** 🔄
- **When**: Payment was refunded
- **Use Cases**:
  - Plan downgrade refunds
  - Cancellation refunds
  - Disputed payments

### **5. CANCELLED** 🚫
- **When**: Payment was cancelled before processing
- **Use Cases**:
  - User cancelled payment
  - Admin cancelled pending payment
  - Payment expired

## 🔄 **Plan Change Scenarios & Statuses**

### **Scenario 1: Admin Changes Plan (Same Price Level)**
```typescript
// Example: Starter Monthly → Starter 3-Month
{
  amount: 6.21, // 3-month discounted price
  method: 'MANUAL',
  type: 'PLAN_CHANGE',
  status: 'COMPLETED', // ✅ Immediate completion
  notes: 'Plan change from Starter to Starter (3 Months) (Admin-initiated plan change)'
}
```

### **Scenario 2: Free Upgrade**
```typescript
// Example: Trial → Free Plan, or Professional → Starter (downgrade)
{
  amount: 0, // Free upgrade
  method: 'MANUAL',
  type: 'PLAN_CHANGE',
  status: 'COMPLETED', // ✅ No payment required
  notes: 'Plan change from Trial to Starter (Free upgrade - no payment required)'
}
```

### **Scenario 3: Trial to Paid Plan**
```typescript
// Example: Trial → Professional Monthly
{
  amount: 10.99,
  method: 'MANUAL',
  type: 'PLAN_CHANGE',
  status: 'PENDING', // ⏳ Awaiting payment
  notes: 'Plan change from Trial to Professional (Trial to paid - payment pending)'
}
```

### **Scenario 4: Paid Plan Upgrade**
```typescript
// Example: Starter → Professional
{
  amount: 4.00, // Price difference
  method: 'MANUAL',
  type: 'PLAN_CHANGE',
  status: 'COMPLETED', // ✅ Admin handles payment
  notes: 'Plan change from Starter to Professional (Admin-initiated plan change)'
}
```

## 🚀 **Future Merchant Self-Service Scenarios**

### **Scenario 5: Merchant Extends Plan (Stripe)**
```typescript
// Merchant extends their current plan via Stripe
{
  amount: 18.63,
  method: 'STRIPE',
  type: 'PLAN_EXTENSION',
  status: 'PENDING', // ⏳ Processing
  reference: 'pi_1234567890',
  notes: '3-month plan extension via Stripe'
}

// After Stripe webhook confirms:
{
  status: 'COMPLETED', // ✅ Payment confirmed
  processedAt: '2025-01-15T10:30:00Z'
}
```

### **Scenario 6: Merchant Extends Plan (Bank Transfer)**
```typescript
// Merchant initiates bank transfer
{
  amount: 18.63,
  method: 'TRANSFER',
  type: 'PLAN_EXTENSION',
  status: 'PENDING', // ⏳ Awaiting verification
  reference: 'TXN-2025-001234',
  notes: 'Bank transfer initiated by merchant'
}

// After admin verifies transfer:
{
  status: 'COMPLETED', // ✅ Transfer verified
  processedAt: '2025-01-15T14:30:00Z',
  processedBy: 'admin_user_id'
}
```

### **Scenario 7: Payment Failed**
```typescript
// Stripe payment declined
{
  amount: 18.63,
  method: 'STRIPE',
  type: 'PLAN_EXTENSION',
  status: 'FAILED', // ❌ Payment failed
  reference: 'pi_1234567890',
  notes: 'Stripe payment declined - insufficient funds'
}
```

## 📋 **Status Transition Rules**

### **PENDING → COMPLETED**
- ✅ Stripe webhook confirms payment
- ✅ Admin verifies bank transfer
- ✅ Manual payment processed
- ✅ Payment gateway confirms

### **PENDING → FAILED**
- ❌ Stripe payment declined
- ❌ Bank transfer rejected
- ❌ Payment timeout (30 days)
- ❌ Insufficient funds

### **COMPLETED → REFUNDED**
- 🔄 Plan downgrade refund
- 🔄 Cancellation refund
- 🔄 Disputed payment resolved

### **PENDING → CANCELLED**
- 🚫 User cancelled payment
- 🚫 Admin cancelled pending payment
- 🚫 Payment expired

## 🎯 **Recommended Implementation**

### **Current Admin Plan Changes**
```typescript
// Smart status determination
const determinePaymentStatus = (merchant, newPlan, finalPrice) => {
  // Free upgrade (trial to trial, downgrade)
  if (finalPrice === 0 || (merchant.plan && newPlan.basePrice <= merchant.plan.basePrice)) {
    return 'COMPLETED'; // No payment required
  }
  
  // Trial to paid
  if (merchant.subscriptionStatus === 'trial' && newPlan.basePrice > 0) {
    return 'PENDING'; // Awaiting payment
  }
  
  // Admin-initiated paid plan change
  return 'COMPLETED'; // Admin handles payment
};
```

### **Future Merchant Self-Service**
```typescript
// Merchant-initiated payments
const createMerchantPayment = (amount, method, type) => {
  const status = method === 'STRIPE' ? 'PENDING' : 'PENDING';
  
  return {
    amount,
    method,
    type,
    status, // Always PENDING initially
    reference: generateReference(method),
    notes: `${type} initiated by merchant`
  };
};
```

## 📊 **Payment Status Dashboard**

### **Admin Dashboard Views**
- **Pending Payments**: Require admin attention
- **Completed Payments**: Successfully processed
- **Failed Payments**: Need retry or manual handling
- **Refunded Payments**: Financial reconciliation

### **Merchant Dashboard Views**
- **Payment History**: All merchant payments
- **Pending Payments**: Awaiting processing
- **Payment Methods**: Stripe, Transfer, etc.

## 🔧 **Implementation Benefits**

### **1. Clear Payment Tracking**
- ✅ **Status progression** from PENDING to COMPLETED
- ✅ **Payment method tracking** for different scenarios
- ✅ **Reference tracking** for external systems
- ✅ **Audit trail** for all status changes

### **2. Flexible Payment Handling**
- ✅ **Admin control** for immediate plan changes
- ✅ **Merchant self-service** for extensions
- ✅ **Multiple payment methods** support
- ✅ **Status-based workflows** for different scenarios

### **3. Financial Reconciliation**
- ✅ **Payment status reporting** for accounting
- ✅ **Refund tracking** for financial records
- ✅ **Failed payment handling** for retry logic
- ✅ **Audit logging** for compliance

## 💡 **Best Practices**

### **1. Status Updates**
- Always update `processedAt` when status changes to `COMPLETED`
- Log status changes in audit trail
- Notify relevant parties of status changes

### **2. Payment References**
- Use consistent reference format: `{TYPE}-{MERCHANT_ID}-{SUBSCRIPTION_ID}`
- Include external payment IDs (Stripe, bank references)
- Make references searchable and traceable

### **3. Error Handling**
- Set appropriate timeouts for PENDING payments
- Implement retry logic for FAILED payments
- Provide clear error messages for users

This comprehensive payment status strategy ensures proper tracking and handling of all payment scenarios! 🎉
