# 🔍 Expert Review: Subscription Management Flow

**Review Date:** October 2, 2025  
**Reviewer:** AI Expert  
**Focus Areas:** Ease of Use, History Tracking, Admin & Merchant Experience

---

## 📊 **Executive Summary**

### **Overall Rating: 7/10** 🟡

**Strengths:**
- ✅ Solid backend functions for core operations
- ✅ Role-based authorization working well
- ✅ New payment history & renewal features excellent
- ✅ Database schema supports full tracking

**Critical Issues:**
- ❌ **NO explicit history logging** for subscription changes
- ❌ **Inconsistent UI flows** between admin and merchant
- ❌ **Missing audit trail** for plan changes, cancellations
- ⚠️ **No confirmation dialogs** for destructive actions
- ⚠️ **Limited merchant self-service** capabilities

---

## 🔍 **Detailed Analysis**

### **1. Change Plan Flow** 

#### **Current Implementation:**

**Backend:** ✅ Working
```typescript
// packages/database/src/subscription.ts:456
export async function changePlan(
  subscriptionId: number, 
  newPlanId: number, 
  billingInterval: BillingInterval = 'month'
)
```

**API Endpoint:** ✅ Working
```
PATCH /api/subscriptions/:id/change-plan
Auth: ADMIN, MERCHANT
```

#### **Issues Found:**

1. **❌ NO HISTORY LOGGING**
   ```typescript
   // Current code does NOT log the change
   const updatedSubscription = await prisma.subscription.update({
     where: { id: subscriptionId },
     data: {
       planId: plan.id,
       interval: billingInterval,
       amount: amount
     }
   });
   // ❌ Missing: Audit log entry
   ```

2. **⚠️ Immediate Period Reset**
   - Resets period start to NOW
   - User loses remaining time on old plan
   - No pro-rata credit calculation

3. **⚠️ No Payment Record**
   - Changes plan but doesn't create payment
   - No invoice for the upgrade
   - Missing payment history entry

#### **Recommendations:**

```typescript
// ✅ SHOULD BE:
export async function changePlan(
  subscriptionId: number,
  newPlanId: number,
  billingInterval: BillingInterval = 'month',
  context?: {
    userId?: number;
    reason?: string;
    immediate?: boolean; // Change now or at period end
  }
): Promise<{
  subscription: Subscription;
  payment?: Payment;
  proRataCredit?: number;
  auditLog: AuditLog;
}> {
  // 1. Get old subscription
  const oldSubscription = await getOld();
  
  // 2. Calculate pro-rata
  const proRata = calculateProRata(oldSubscription, newPlan);
  
  // 3. Update in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update subscription
    const updated = await tx.subscription.update({...});
    
    // Create payment record
    const payment = await tx.payment.create({
      type: 'PLAN_CHANGE',
      amount: proRata.chargeAmount,
      description: `Plan change: ${oldPlan.name} → ${newPlan.name}`
    });
    
    // Create audit log
    const auditLog = await tx.auditLog.create({
      action: 'UPDATE',
      entityType: 'Subscription',
      entityId: subscriptionId,
      oldValues: { plan: oldPlan.name, amount: oldSubscription.amount },
      newValues: { plan: newPlan.name, amount: updated.amount },
      changes: {
        plan: { old: oldPlan.name, new: newPlan.name },
        amount: { old: oldSubscription.amount, new: updated.amount }
      },
      userId: context?.userId,
      description: context?.reason || 'Plan changed by admin'
    });
    
    return { updated, payment, auditLog };
  });
  
  return result;
}
```

---

### **2. Extend/Renew Plan Flow**

#### **Current Implementation:**

**New Function (Phase 1):** ✅ **GOOD!**
```typescript
// packages/database/src/subscription.ts:973
export async function renewSubscription(
  subscriptionId: number,
  paymentData: {
    method: 'STRIPE' | 'TRANSFER';
    transactionId: string;
    reference?: string;
    description?: string;
  }
)
```

**Strengths:**
- ✅ Creates payment record
- ✅ Extends period by 1 month
- ✅ Updates merchant status
- ✅ Uses transaction for atomicity

**Issues:**
- ❌ **NO audit log entry**
- ⚠️ Fixed to 1 month only (not flexible)

**Old Function:** ⚠️ **NOT IMPLEMENTED**
```typescript
// packages/database/src/plan-variant-placeholders.ts:65
export async function extendSubscription(subscriptionId: string, params: any) {
  throw new Error('extendSubscription is not yet implemented'); // ❌
}
```

#### **Recommendations:**

1. **Replace old `extendSubscription()` with `renewSubscription()`**
2. **Add audit logging:**

```typescript
export async function renewSubscription(
  subscriptionId: number,
  paymentData: {...},
  context?: { userId?: number; userEmail?: string }
) {
  const result = await prisma.$transaction(async (tx) => {
    // ... existing code ...
    
    // ✅ ADD: Create audit log
    await tx.auditLog.create({
      action: 'UPDATE',
      entityType: 'Subscription',
      entityId: subscriptionId.toString(),
      changes: {
        currentPeriodEnd: {
          old: subscription.currentPeriodEnd.toISOString(),
          new: newPeriodEnd.toISOString()
        },
        status: {
          old: subscription.status,
          new: 'active'
        }
      },
      description: `Subscription renewed - Payment: ${paymentData.transactionId}`,
      userId: context?.userId,
      userEmail: context?.userEmail,
      category: 'BUSINESS',
      severity: 'INFO'
    });
  });
}
```

---

### **3. Cancel Plan Flow**

#### **Current Implementation:**

**Backend:** ✅ Working
```typescript
// packages/database/src/subscription.ts:624
export async function cancelSubscription(
  subscriptionId: number
): Promise<{
  success: boolean;
  message: string;
  data?: Subscription;
}>
```

**API Endpoint:** ✅ Working
```
POST /api/subscriptions/:id/cancel
Body: { reason: "string" }
```

**Strengths:**
- ✅ Requires cancellation reason
- ✅ Proper error handling
- ✅ Status update to merchant

**Issues:**
- ❌ **NO audit log with reason**
- ⚠️ Immediate cancellation (no end-of-period option)
- ⚠️ No retention offer or feedback flow

#### **Recommendations:**

```typescript
export async function cancelSubscription(
  subscriptionId: number,
  options: {
    reason: string;
    cancelAt: 'immediate' | 'period_end';
    feedback?: string;
    userId?: number;
  }
): Promise<{
  subscription: Subscription;
  effectiveDate: Date;
  auditLog: AuditLog;
}> {
  const result = await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.findUnique({...});
    
    // Determine effective cancellation date
    const effectiveDate = options.cancelAt === 'immediate' 
      ? new Date() 
      : subscription.currentPeriodEnd;
    
    // Update subscription
    const updated = await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: options.cancelAt === 'immediate' ? 'cancelled' : 'active',
        cancelAtPeriodEnd: options.cancelAt === 'period_end',
        canceledAt: options.cancelAt === 'immediate' ? new Date() : null,
        cancelReason: options.reason
      }
    });
    
    // ✅ Create audit log
    const auditLog = await tx.auditLog.create({
      action: 'UPDATE',
      entityType: 'Subscription',
      entityId: subscriptionId.toString(),
      changes: {
        status: { old: subscription.status, new: updated.status },
        canceledAt: { old: null, new: effectiveDate }
      },
      description: `Subscription cancelled: ${options.reason}`,
      details: JSON.stringify({
        reason: options.reason,
        feedback: options.feedback,
        cancelType: options.cancelAt,
        effectiveDate: effectiveDate
      }),
      userId: options.userId,
      category: 'BUSINESS',
      severity: 'WARNING'
    });
    
    return { updated, effectiveDate, auditLog };
  });
  
  return result;
}
```

---

## 🎨 **UI Flow Recommendations**

### **ADMIN INTERFACE**

#### **Subscription Detail Page Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  🏢 Shop ABC - Subscription #123                            │
│                                                              │
│  [Manual Renewal] [Change Plan] [Pause] [Cancel]           │
├─────────────────────────────────────────────────────────────┤
│  Overview Cards                                              │
│  [Status] [Plan] [Amount] [Next Billing]                   │
├─────────────────────────────────────────────────────────────┤
│  Tabs: [💳 Payment History] [📊 Activity Log] [📋 Details] │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Payment History Table / Activity Log / Details       │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### **1. Change Plan Button Flow:**

```
Step 1: Click "Change Plan"
        ↓
Step 2: Modal opens with plan selection
        ┌─────────────────────────────────────┐
        │ Change Subscription Plan             │
        ├─────────────────────────────────────┤
        │ Current: Professional ($99/month)    │
        │                                      │
        │ Select New Plan:                     │
        │ [○] Basic ($49/month)               │
        │ [●] Enterprise ($199/month)          │
        │                                      │
        │ Billing Cycle:                       │
        │ [●] Monthly  [○] Quarterly  [○] Yearly│
        │                                      │
        │ ✅ Pro-rata Calculation:             │
        │ • Remaining credit: $45.00          │
        │ • New plan cost: $199.00            │
        │ • Amount due today: $154.00         │
        │                                      │
        │ When to apply:                       │
        │ [●] Immediately                      │
        │ [○] At period end (Oct 15)           │
        │                                      │
        │ Reason for change: (Optional)        │
        │ [_____________________________]      │
        │                                      │
        │ [Cancel] [Change Plan →]             │
        └─────────────────────────────────────┘
        ↓
Step 3: Confirmation
        "Plan changed successfully!"
        ↓
Step 4: Updates:
        • Subscription status updated
        • Payment record created
        • Audit log entry created ⭐
        • Email notification sent
        • Activity log shows change
```

#### **2. Manual Renewal Button Flow:**

```
Step 1: Click "💳 Manual Renewal"
        ↓
Step 2: Modal (Already implemented ✅)
        [Payment method selection]
        [Transaction ID input]
        [Process Renewal]
        ↓
Step 3: ✅ ADD: Create audit log
        • Log: "Subscription renewed by Admin John"
        • Payment record: $99.00
        • Period extended: +1 month
```

#### **3. Cancel Button Flow:**

```
Step 1: Click "Cancel"
        ↓
Step 2: Warning modal
        ┌─────────────────────────────────────┐
        │ ⚠️ Cancel Subscription               │
        ├─────────────────────────────────────┤
        │ Are you sure you want to cancel?     │
        │                                      │
        │ Merchant: Shop ABC                   │
        │ Plan: Professional ($99/month)       │
        │ Status: Active                       │
        │                                      │
        │ When to cancel:                      │
        │ [○] Cancel immediately               │
        │     • Access ends today              │
        │     • No refund                      │
        │                                      │
        │ [●] Cancel at period end (Oct 15)    │
        │     • Access until Oct 15            │
        │     • No future charges              │
        │                                      │
        │ Cancellation reason: * (Required)    │
        │ [▼] Select reason                    │
        │   • Too expensive                    │
        │   • Missing features                 │
        │   • Switching to competitor          │
        │   • Business closed                  │
        │   • Other (specify below)            │
        │                                      │
        │ Additional feedback: (Optional)      │
        │ [_____________________________]      │
        │                                      │
        │ [Go Back] [Confirm Cancellation]     │
        └─────────────────────────────────────┘
        ↓
Step 3: Confirmation
        "Subscription will be cancelled on Oct 15"
        ↓
Step 4: Updates:
        • Status: "Active (cancelling)"
        • Cancel flag: true
        • Audit log: Reason + feedback ⭐
        • Email: Cancellation confirmation
```

---

### **MERCHANT (CLIENT) INTERFACE**

#### **Merchant Dashboard - Subscription Card:**

```
┌─────────────────────────────────────────────────────────────┐
│  💳 Your Subscription                                        │
├─────────────────────────────────────────────────────────────┤
│  Plan: Professional                                          │
│  Status: ● Active                                            │
│  Amount: $99.00/month                                        │
│  Next billing: October 15, 2025                              │
│                                                              │
│  [Renew Now] [Upgrade Plan] [View Billing History]          │
└─────────────────────────────────────────────────────────────┘
```

#### **1. Merchant Renew Flow:**

```
Step 1: Click "Renew Now" from dashboard
        ↓
Step 2: Renewal options modal
        ┌─────────────────────────────────────┐
        │ Renew Your Subscription              │
        ├─────────────────────────────────────┤
        │ Current Plan: Professional           │
        │ Amount: $99.00/month                 │
        │                                      │
        │ Renewal Period:                      │
        │ [●] 1 Month  ($99.00)               │
        │ [○] 3 Months ($267.00) - Save 10%   │
        │ [○] 12 Months ($950.00) - Save 20%  │
        │                                      │
        │ Payment Method:                      │
        │ [●] Credit Card (Stripe)             │
        │ [○] Bank Transfer                    │
        │                                      │
        │ [Cancel] [Proceed to Payment →]      │
        └─────────────────────────────────────┘
        ↓
Step 3: Payment processing
        • Stripe checkout (if card)
        • Bank details (if transfer)
        ↓
Step 4: Confirmation
        "Subscription renewed successfully!"
        • Receipt email sent
        • Invoice generated
        • History updated ⭐
```

#### **2. Merchant Upgrade Flow:**

```
Step 1: Click "Upgrade Plan"
        ↓
Step 2: Plan comparison page
        ┌─────────────────────────────────────────────────┐
        │  Choose Your Plan                                │
        ├─────────────────────────────────────────────────┤
        │                                                  │
        │  [Current]        [Upgrade]        [Enterprise] │
        │  Professional     Business         Ultimate      │
        │  $99/month        $149/month       $299/month   │
        │                                                  │
        │  ✓ 5 outlets      ✓ 10 outlets     ✓ Unlimited │
        │  ✓ 15 users       ✓ 50 users       ✓ Unlimited │
        │  ✓ 1000 products  ✓ 5000 products  ✓ Unlimited │
        │                                                  │
        │  [Current Plan]   [Upgrade →]      [Upgrade →]  │
        └─────────────────────────────────────────────────┘
        ↓
Step 3: Billing details
        "Pro-rata calculation:
         • Remaining credit: $45.00
         • New plan cost: $149.00
         • Due today: $104.00"
        ↓
Step 4: Payment & Confirmation
```

#### **3. Merchant Cancel Flow:**

```
Step 1: Navigate to Settings → Subscription
        ↓
Step 2: Click "Cancel Subscription" (red text at bottom)
        ↓
Step 3: Retention offer (optional)
        ┌─────────────────────────────────────┐
        │ Before you go...                     │
        ├─────────────────────────────────────┤
        │ We're sorry to see you leave!       │
        │                                      │
        │ Would you like to:                   │
        │ • Downgrade to Basic plan            │
        │ • Pause for 3 months                 │
        │ • Speak with support                 │
        │                                      │
        │ [Contact Support] [Continue Cancel]  │
        └─────────────────────────────────────┘
        ↓
Step 4: Cancellation form
        • Reason selection (required)
        • Feedback (optional)
        • When to cancel (immediate/period end)
        ↓
Step 5: Final confirmation
        "Your subscription will remain active until Oct 15"
```

---

## 📝 **History Tracking Implementation**

### **What Should Be Logged:**

```typescript
interface SubscriptionAuditLog {
  // Core info
  action: 'PLAN_CHANGE' | 'RENEWAL' | 'CANCELLATION' | 'PAUSE' | 'RESUME';
  subscriptionId: number;
  merchantId: number;
  
  // Changes
  oldValues: {
    plan?: string;
    status?: string;
    amount?: number;
    periodEnd?: Date;
  };
  newValues: {
    plan?: string;
    status?: string;
    amount?: number;
    periodEnd?: Date;
  };
  
  // Context
  userId?: number;
  userRole?: 'ADMIN' | 'MERCHANT';
  reason?: string;
  feedback?: string;
  
  // Payment
  paymentId?: number;
  paymentMethod?: string;
  paymentAmount?: number;
  
  // Metadata
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}
```

### **Activity Log Display:**

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Activity Log                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Oct 2, 2025 10:30 AM                                       │
│  🔄 Subscription Renewed                                     │
│  • Renewed by: Admin John (admin@example.com)               │
│  • Payment: $99.00 via Bank Transfer                        │
│  • Period: Oct 15 → Nov 15, 2025                            │
│  • Transaction: TXN-123456                                   │
│  ────────────────────────────────────────────────           │
│                                                              │
│  Sep 15, 2025 2:45 PM                                       │
│  📈 Plan Changed                                             │
│  • Changed by: Merchant Owner (owner@shopabc.com)           │
│  • From: Basic ($49/month) → Professional ($99/month)       │
│  • Pro-rata charge: $35.00                                  │
│  • Reason: "Need more outlets"                              │
│  ────────────────────────────────────────────────           │
│                                                              │
│  Aug 20, 2025 9:00 AM                                       │
│  ⏸️ Subscription Paused                                      │
│  • Paused by: Admin Sarah (admin2@example.com)              │
│  • Reason: "Payment issues - temporary"                     │
│  ────────────────────────────────────────────────           │
│                                                              │
│  Aug 22, 2025 3:15 PM                                       │
│  ▶️ Subscription Resumed                                     │
│  • Resumed by: Admin Sarah (admin2@example.com)             │
│  • Note: "Payment resolved"                                 │
│  ────────────────────────────────────────────────           │
│                                                              │
│  [Load More...]                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 **Implementation Tasks**

### **Priority 1: Add History Logging** 🔴

**Files to Update:**

1. **`packages/database/src/subscription.ts`**
   ```typescript
   // Add to changePlan()
   await tx.auditLog.create({...});
   
   // Add to renewSubscription()
   await tx.auditLog.create({...});
   
   // Add to cancelSubscription()
   await tx.auditLog.create({...});
   
   // Add to pauseSubscription()
   await tx.auditLog.create({...});
   
   // Add to resumeSubscription()
   await tx.auditLog.create({...});
   ```

2. **`packages/database/src/index.ts`**
   ```typescript
   // Export audit functions
   export {
     getSubscriptionAuditLogs,
     createSubscriptionAuditLog
   } from './subscription-audit';
   ```

3. **Create `packages/database/src/subscription-audit.ts`**
   ```typescript
   export async function getSubscriptionAuditLogs(
     subscriptionId: number,
     filters?: {...}
   ) {
     return await prisma.auditLog.findMany({
       where: {
         entityType: 'Subscription',
         entityId: subscriptionId.toString()
       },
       include: {
         user: {
           select: { firstName: true, lastName: true, email: true }
         }
       },
       orderBy: { createdAt: 'desc' }
     });
   }
   ```

### **Priority 2: Enhance UI Components** 🟡

**New Components Needed:**

1. **`SubscriptionActivityLog.tsx`**
   - Display audit trail
   - Filter by action type
   - Export to PDF/CSV

2. **`ChangePlanModal.tsx`** (Enhanced)
   - Plan comparison
   - Pro-rata calculation display
   - Immediate vs. period-end option
   - Reason input field

3. **`CancelSubscriptionModal.tsx`** (Enhanced)
   - Retention offers
   - Reason dropdown
   - Feedback textarea
   - Cancel timing option

4. **`MerchantSubscriptionCard.tsx`**
   - Self-service renewal
   - Upgrade CTA
   - Billing history link

### **Priority 3: API Enhancements** 🟢

**New Endpoints:**

1. **`GET /api/subscriptions/:id/audit-logs`**
   - Get activity history
   - Support filtering

2. **`POST /api/subscriptions/:id/change-plan-with-payment`**
   - Combined plan change + payment
   - Pro-rata calculation
   - Audit logging

3. **`GET /api/merchant/my-subscription`**
   - Merchant-facing endpoint
   - Own subscription only
   - Simpler response format

---

## 📋 **Complete User Flows**

### **ADMIN: How to Use**

#### **1. View Subscription Details**
```
Navigation: Subscriptions → [Select merchant] → View Details
URL: /subscriptions/123/preview
Actions Available:
- Manual Renewal
- Change Plan
- Pause/Resume
- Cancel
- View Payment History
- View Activity Log
```

#### **2. Process Manual Renewal**
```
1. Click "💳 Manual Renewal"
2. Select payment method (Stripe/Transfer)
3. Enter transaction ID
4. Add optional reference
5. Click "Process Renewal"
6. ✅ Subscription extended
7. ✅ Payment recorded
8. ✅ History logged
```

#### **3. Change Merchant's Plan**
```
1. Click "Change Plan"
2. Select new plan
3. Choose billing cycle
4. Review pro-rata calculation
5. Select timing (immediate/period end)
6. Add reason (optional)
7. Confirm
8. ✅ Plan changed
9. ✅ Payment created
10. ✅ History logged
```

#### **4. Cancel Subscription**
```
1. Click "Cancel"
2. Choose cancel timing
3. Select reason from dropdown
4. Add feedback (optional)
5. Confirm cancellation
6. ✅ Status updated
7. ✅ Cancellation scheduled
8. ✅ History logged with reason
9. ✅ Email sent to merchant
```

---

### **MERCHANT: How to Use**

#### **1. View My Subscription**
```
Navigation: Dashboard → Subscription Card
Or: Settings → Billing & Subscription
Info Shown:
- Current plan & features
- Billing amount
- Next billing date
- Status
```

#### **2. Renew Subscription**
```
1. Click "Renew Now"
2. Select renewal period (1/3/12 months)
3. See discount for longer periods
4. Choose payment method
5. Complete payment
6. ✅ Subscription extended
7. ✅ Receipt emailed
8. ✅ Invoice generated
```

#### **3. Upgrade Plan**
```
1. Click "Upgrade Plan"
2. Compare plans side-by-side
3. Select desired plan
4. Review pricing & pro-rata
5. Choose billing cycle
6. Complete payment
7. ✅ Plan upgraded immediately
8. ✅ New features unlocked
9. ✅ Confirmation email
```

#### **4. Request Cancellation**
```
1. Settings → Subscription
2. Scroll to "Cancel Subscription"
3. Click "Cancel" (red link)
4. Review retention offers (optional)
5. Provide cancellation reason
6. Choose cancel timing
7. Confirm
8. ✅ Cancellation scheduled
9. ✅ Confirmation email
10. Access continues until period end
```

---

## ✅ **Recommendations Summary**

### **Must Do (Critical):**
1. ✅ Add audit logging to all subscription changes
2. ✅ Create SubscriptionActivityLog component
3. ✅ Add confirmation modals for destructive actions
4. ✅ Implement pro-rata calculations for plan changes
5. ✅ Add reason tracking for cancellations

### **Should Do (Important):**
1. ⭐ Create merchant self-service portal
2. ⭐ Add retention offers in cancel flow
3. ⭐ Implement payment method saved cards
4. ⭐ Add email notifications for all changes
5. ⭐ Create invoice generation for payments

### **Nice to Have:**
1. 💡 Usage analytics dashboard
2. 💡 Automated renewal reminders
3. 💡 Dunning management for failed payments
4. 💡 Multi-currency support
5. 💡 Subscription pause feature

---

## 🎯 **Ease of Use Score**

### **Current State:**

| Feature | Admin | Merchant | Score | Notes |
|---------|-------|----------|-------|-------|
| View Subscription | ✅ Good | ⚠️ Limited | 7/10 | Admin has full view, merchant needs better dashboard |
| Manual Renewal | ✅ Excellent | ❌ None | 6/10 | Only admin can do manually |
| Change Plan | ⚠️ Basic | ❌ None | 4/10 | Missing pro-rata, merchant can't self-serve |
| Cancel | ⚠️ Basic | ❌ None | 4/10 | No history, no merchant self-service |
| History View | ❌ None | ❌ None | 2/10 | Critical missing feature |

### **Target State (After Improvements):**

| Feature | Admin | Merchant | Score | Improvement |
|---------|-------|----------|-------|-------------|
| View Subscription | ✅ Excellent | ✅ Good | 9/10 | +2 Activity log added |
| Manual Renewal | ✅ Excellent | ✅ Good | 9/10 | +3 Merchant can renew |
| Change Plan | ✅ Excellent | ✅ Good | 9/10 | +5 Pro-rata, self-service |
| Cancel | ✅ Excellent | ✅ Good | 9/10 | +5 Reason tracking, retention |
| History View | ✅ Excellent | ✅ Good | 9/10 | +7 Full audit trail |

---

## 🚀 **Next Steps**

1. **Implement audit logging** (Priority 1)
2. **Create activity log component** (Priority 1)
3. **Build merchant self-service portal** (Priority 2)
4. **Add confirmation dialogs** (Priority 2)
5. **Implement pro-rata calculations** (Priority 3)

**Estimated Time:**
- Priority 1: 6-8 hours
- Priority 2: 8-10 hours
- Priority 3: 6-8 hours

**Total: 20-26 hours for complete implementation**

---

**Questions or need clarification? Let's discuss the implementation plan!** 🎉

