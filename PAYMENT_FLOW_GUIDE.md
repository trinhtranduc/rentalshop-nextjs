# 💳 Payment Flow Guide for Rental Shop

## 🎯 **Overview**

This guide explains the comprehensive payment system for plan changes, extensions, and future merchant self-service payments.

## 📊 **Payment Types**

### **1. Plan Change Payments (Admin-Initiated)**
- **Type**: `PLAN_CHANGE`
- **Method**: `MANUAL` (admin changes)
- **Status**: `COMPLETED` (immediate)
- **Trigger**: When admin changes merchant's plan
- **Amount**: New plan price (with variant discounts)

### **2. Plan Extension Payments (Merchant-Initiated)**
- **Type**: `PLAN_EXTENSION`
- **Method**: `STRIPE` | `TRANSFER` | `MANUAL`
- **Status**: `PENDING` → `COMPLETED` | `FAILED`
- **Trigger**: When merchant extends their current plan
- **Amount**: Current plan price × extension duration

### **3. Subscription Payments (Recurring)**
- **Type**: `SUBSCRIPTION_PAYMENT`
- **Method**: `STRIPE` | `TRANSFER`
- **Status**: `PENDING` → `COMPLETED` | `FAILED`
- **Trigger**: Automatic recurring billing
- **Amount**: Plan price (monthly/quarterly/yearly)

## 🔄 **Payment Methods**

### **1. Stripe Integration**
```typescript
// For future Stripe payments
{
  method: 'STRIPE',
  reference: 'pi_1234567890', // Stripe Payment Intent ID
  status: 'PENDING' // → 'COMPLETED' | 'FAILED'
}
```

### **2. Bank Transfer**
```typescript
// For bank transfer payments
{
  method: 'TRANSFER',
  reference: 'TXN-2025-001234', // Bank transaction reference
  status: 'PENDING' // → 'COMPLETED' (after manual verification)
}
```

### **3. Manual Processing**
```typescript
// For admin-processed payments
{
  method: 'MANUAL',
  reference: 'MANUAL-2025-001', // Internal reference
  status: 'COMPLETED' // Immediate completion
}
```

### **4. Cash/Check**
```typescript
// For offline payments
{
  method: 'CASH' | 'CHECK',
  reference: 'CASH-2025-001', // Internal reference
  status: 'PENDING' // → 'COMPLETED' (after verification)
}
```

## 🏗️ **Database Schema**

### **Enhanced Payment Model**
```prisma
model Payment {
  id            String   @id @default(cuid())
  publicId      Int      @unique
  amount        Float
  method        String   // STRIPE, TRANSFER, MANUAL, CASH, CHECK
  type          String   // ORDER_PAYMENT, SUBSCRIPTION_PAYMENT, PLAN_CHANGE, PLAN_EXTENSION
  status        String   @default("PENDING") // PENDING, COMPLETED, FAILED, REFUNDED, CANCELLED
  reference     String?  // Stripe payment ID, bank reference, etc.
  notes         String?
  processedAt   DateTime?
  processedBy   String?  // User ID who processed the payment
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  orderId       String?  // For order payments
  order         Order?   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  subscriptionId String? // For subscription payments
  subscription  Subscription? @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  merchantId    String?  // For direct merchant payments
  merchant      Merchant? @relation(fields: [merchantId], references: [id], onDelete: Cascade)
}
```

## 🔄 **Current Implementation**

### **Plan Change Flow (Admin)**
1. **Admin changes plan** → `MerchantPlanDialog`
2. **API creates subscription** → `POST /api/merchants/[id]/plan`
3. **API creates payment record** → `Payment` with `type: 'PLAN_CHANGE'`
4. **Payment status**: `COMPLETED` (immediate)
5. **Payment method**: `MANUAL` (admin-initiated)

### **Payment Record Example**
```json
{
  "id": 123,
  "amount": 18.63,
  "method": "MANUAL",
  "type": "PLAN_CHANGE",
  "status": "COMPLETED",
  "reference": "PLAN-CHANGE-456-789",
  "notes": "Plan change from Starter to Professional (3 Months)",
  "processedAt": "2025-01-15T10:30:00Z",
  "processedBy": "admin_user_id",
  "subscriptionId": "sub_123",
  "merchantId": "merchant_456"
}
```

## 🚀 **Future Implementation**

### **Merchant Self-Service Flow**
1. **Merchant extends plan** → `PlanExtensionDialog`
2. **Select payment method** → Stripe | Transfer | Manual
3. **Process payment** → Stripe API | Bank transfer | Admin approval
4. **Update subscription** → Extend end date
5. **Create payment record** → `Payment` with `type: 'PLAN_EXTENSION'`

### **Stripe Integration Flow**
```typescript
// 1. Create Stripe Payment Intent
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(amount * 100), // Convert to cents
  currency: 'usd',
  metadata: {
    merchantId: merchant.publicId,
    subscriptionId: subscription.publicId,
    type: 'PLAN_EXTENSION'
  }
});

// 2. Create pending payment record
const payment = await prisma.payment.create({
  data: {
    amount: amount,
    method: 'STRIPE',
    type: 'PLAN_EXTENSION',
    status: 'PENDING',
    reference: paymentIntent.id,
    merchantId: merchant.id,
    subscriptionId: subscription.id
  }
});

// 3. Handle webhook for completion
// When Stripe webhook confirms payment:
await prisma.payment.update({
  where: { id: payment.id },
  data: {
    status: 'COMPLETED',
    processedAt: new Date()
  }
});
```

### **Bank Transfer Flow**
```typescript
// 1. Merchant initiates bank transfer
const payment = await prisma.payment.create({
  data: {
    amount: amount,
    method: 'TRANSFER',
    type: 'PLAN_EXTENSION',
    status: 'PENDING',
    reference: `TXN-${Date.now()}`,
    notes: 'Bank transfer initiated by merchant',
    merchantId: merchant.id,
    subscriptionId: subscription.id
  }
});

// 2. Admin verifies transfer
// Admin checks bank account and updates payment:
await prisma.payment.update({
  where: { id: payment.id },
  data: {
    status: 'COMPLETED',
    processedAt: new Date(),
    processedBy: adminUserId,
    notes: 'Bank transfer verified and confirmed'
  }
});
```

## 📱 **API Endpoints**

### **Create Payment**
```http
POST /api/merchants/[id]/payments
Content-Type: application/json
Authorization: Bearer <token>

{
  "amount": 18.63,
  "method": "STRIPE",
  "type": "PLAN_EXTENSION",
  "reference": "pi_1234567890",
  "notes": "3-month plan extension",
  "subscriptionId": "sub_123"
}
```

### **Get Merchant Payments**
```http
GET /api/merchants/[id]/payments?status=COMPLETED&type=PLAN_CHANGE&limit=20&offset=0
Authorization: Bearer <token>
```

### **Update Payment Status**
```http
PATCH /api/merchants/[id]/payments
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "COMPLETED",
  "reference": "TXN-2025-001234",
  "notes": "Bank transfer verified",
  "processedBy": "admin_user_id"
}
```

## 🎯 **Benefits of This Approach**

### **1. Unified Payment System**
- ✅ **Single payment model** for all payment types
- ✅ **Consistent API** across different payment methods
- ✅ **Centralized tracking** and reporting

### **2. Flexible Payment Methods**
- ✅ **Stripe integration** for automated payments
- ✅ **Bank transfer** for traditional payments
- ✅ **Manual processing** for admin-controlled payments
- ✅ **Cash/Check** for offline payments

### **3. Comprehensive Tracking**
- ✅ **Payment history** for each merchant
- ✅ **Audit logging** for all payment actions
- ✅ **Status tracking** from creation to completion
- ✅ **Reference tracking** for external payment systems

### **4. Future-Ready**
- ✅ **Easy Stripe integration** when ready
- ✅ **Merchant self-service** capabilities
- ✅ **Recurring billing** support
- ✅ **Multi-currency** support (ready for expansion)

## 🔧 **Implementation Status**

### **✅ Completed**
- [x] Enhanced Payment model with all relations
- [x] Plan change payment creation (admin-initiated)
- [x] Payment API endpoints
- [x] Audit logging for payments
- [x] Database schema updates

### **🚧 Next Steps**
- [ ] Stripe integration setup
- [ ] Merchant self-service UI
- [ ] Payment webhook handling
- [ ] Bank transfer verification UI
- [ ] Payment reporting dashboard
- [ ] Recurring billing automation

## 💡 **Usage Examples**

### **Admin Changes Plan**
```typescript
// This happens automatically when admin changes plan
const result = await merchantsApi.updateMerchantPlan(merchantId, {
  planId: 2,
  planVariantId: 6, // 3-month Professional
  reason: 'Upgrade to Professional plan',
  effectiveDate: new Date(),
  notifyMerchant: true
});

// Payment record is automatically created:
// - amount: 28.85 (3-month Professional price)
// - method: 'MANUAL'
// - type: 'PLAN_CHANGE'
// - status: 'COMPLETED'
```

### **Merchant Extends Plan (Future)**
```typescript
// Merchant extends their current plan
const result = await paymentsApi.createPayment(merchantId, {
  amount: 18.63,
  method: 'STRIPE',
  type: 'PLAN_EXTENSION',
  subscriptionId: 'sub_123',
  notes: 'Extend current plan by 3 months'
});

// Payment is processed through Stripe
// Status updates from PENDING → COMPLETED
```

This comprehensive payment system provides a solid foundation for both current admin-controlled plan changes and future merchant self-service capabilities! 🎉
