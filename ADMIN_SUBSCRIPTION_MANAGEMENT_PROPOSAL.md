# 🎯 Admin Subscription Management - Complete Proposal

## 📊 Current State Analysis

### ✅ **What You Already Have (Good Foundation!)**

#### **UI Components** ✨
```typescript
packages/ui/src/components/features/Subscriptions/
├── SubscriptionList.tsx              ✅ List with filters
├── SubscriptionViewDialog.tsx        ✅ View details
├── SubscriptionEditDialog.tsx        ✅ Edit subscription
├── SubscriptionExtendDialog.tsx      ✅ Extend subscription
├── SubscriptionChangePlanDialog.tsx  ✅ Change plan
├── SubscriptionForm.tsx              ✅ Create/Edit form
└── AdminExtensionModal.tsx           ✅ Admin extension
```

#### **Admin Pages** ✨
```typescript
apps/admin/app/subscriptions/
├── page.tsx              ✅ List page with filters
├── [id]/page.tsx         ✅ Detail page
├── [id]/edit/page.tsx    ✅ Edit page
└── create/page.tsx       ✅ Create page
```

#### **Backend Functions** ✨
```typescript
✅ changePlan()         - Upgrade/downgrade
✅ pauseSubscription()  - Pause billing
✅ resumeSubscription() - Resume billing
✅ cancelSubscription() - Cancel with reason
✅ createSubscriptionPayment() - Record payment
```

#### **API Endpoints** ✨
```typescript
✅ GET    /api/subscriptions           - List subscriptions
✅ GET    /api/subscriptions/:id       - Get details
✅ PUT    /api/subscriptions/:id       - Update
✅ POST   /api/subscriptions/:id/pause - Pause
✅ POST   /api/subscriptions/:id/resume - Resume
✅ POST   /api/subscriptions/:id/cancel - Cancel
✅ PATCH  /api/subscriptions/:id/change-plan - Change plan
```

---

## ❌ **What's Missing (Need to Build)**

### 🚨 **Critical Missing Features**

#### **1. Payment History Management** ❌
```typescript
// Need to add:
- Payment history table component
- Payment detail modal
- Payment filtering (status, method, date)
- Export payment history
- Invoice generation
```

#### **2. Manual Renewal Function** ❌
```typescript
// Need to implement:
- Manual renewal button
- Payment method selection (Stripe/Transfer)
- Transaction ID input
- Renewal confirmation
- Auto-update subscription period
```

#### **3. Upgrade from Trial** ❌
```typescript
// Need to add:
- "Upgrade" button on trial subscriptions
- Plan selection modal
- Payment processing
- Status change: trial → active
```

#### **4. Subscription Analytics** ❌
```typescript
// Need dashboard widgets:
- Active subscriptions count
- Revenue by period
- Trial conversion rate
- Churn rate
- MRR (Monthly Recurring Revenue)
- Payment success/failure rates
```

---

## 🎨 **Proposed UI/UX Design (Simple & Clean)**

### **1. Enhanced Subscription List Page**

```
┌─────────────────────────────────────────────────────────────────┐
│  🏢 Subscription Management                        [+ Create]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📊 Quick Stats                                                  │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│  │ Active   │ Trial    │ Past Due │ MRR      │ Churn    │      │
│  │  145     │  23      │  5       │ $14,500  │  2.3%    │      │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘      │
│                                                                  │
│  🔍 Filters                                                      │
│  [Search...] [Status ▼] [Plan ▼] [Date Range ▼] [Export CSV]   │
│                                                                  │
│  📋 Subscriptions                                                │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Merchant        │ Plan   │ Status  │ Next Billing │ ⚡ │    │
│  ├────────────────────────────────────────────────────────┤    │
│  │ 🏪 Shop ABC     │ Pro    │ Active  │ Oct 15, 2025 │ ⋮ │    │
│  │ $99/month       │        │ 🟢      │ 12 days      │   │    │
│  │                 │        │         │              │   │    │
│  │ 🏪 Store XYZ    │ Basic  │ Trial   │ Oct 8, 2025  │ ⋮ │    │
│  │ $0/month (14d)  │        │ 🟡      │ 5 days left  │   │    │
│  │                 │        │         │              │   │    │
│  │ 🏪 Business Co  │ Pro    │Past Due │ Oct 1, 2025  │ ⋮ │    │
│  │ $99/month       │        │ 🔴      │ 6 days late  │   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│                          [1] 2 3 4 5 ... 10 →                   │
└─────────────────────────────────────────────────────────────────┘

Action Menu (⋮):
- 👁️  View Details
- ✏️  Edit Subscription
- 💳 View Payment History ⭐ NEW
- 🔄 Manual Renewal ⭐ NEW
- 📈 Upgrade Plan ⭐ NEW
- ⏸️  Pause Subscription
- ▶️  Resume Subscription
- ❌ Cancel Subscription
```

### **2. Subscription Detail Page (Enhanced)**

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Subscriptions                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🏪 Shop ABC - Subscription Details                             │
│                                                                  │
│  ┌─────────────────────────┬─────────────────────────────────┐  │
│  │ 📋 Overview             │ 💰 Billing                      │  │
│  │                         │                                 │  │
│  │ Status: 🟢 Active       │ Plan: Professional              │  │
│  │ Merchant: Shop ABC      │ Amount: $99.00/month            │  │
│  │ Email: shop@abc.com     │ Next Billing: Oct 15, 2025      │  │
│  │ Phone: +1234567890      │ Payment Method: Stripe          │  │
│  │                         │                                 │  │
│  │ Started: Sep 1, 2025    │ Total Paid: $594.00             │  │
│  │ Period: 6 months        │ Last Payment: Sep 15, 2025      │  │
│  └─────────────────────────┴─────────────────────────────────┘  │
│                                                                  │
│  🔘 Quick Actions                                                │
│  [💳 Manual Renewal] [📈 Change Plan] [⏸️ Pause] [❌ Cancel]   │
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  📊 Tabs                                                         │
│  [Payment History ⭐] [Activity Log] [Plan Details]             │
│                                                                  │
│  💳 Payment History (Last 12 months) ⭐ NEW                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Date       │ Amount  │ Method  │ Status    │ Invoice  │    │
│  ├────────────────────────────────────────────────────────┤    │
│  │ Sep 15     │ $99.00  │ Stripe  │ ✅ Paid   │ [📄 PDF] │    │
│  │ Aug 15     │ $99.00  │ Stripe  │ ✅ Paid   │ [📄 PDF] │    │
│  │ Jul 15     │ $99.00  │ Transfer│ ✅ Paid   │ [📄 PDF] │    │
│  │ Jun 15     │ $99.00  │ Stripe  │ ❌ Failed │ [🔄]     │    │
│  │ Jun 18     │ $99.00  │ Stripe  │ ✅ Paid   │ [📄 PDF] │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [Export History] [Download All Invoices]                       │
└─────────────────────────────────────────────────────────────────┘
```

### **3. Manual Renewal Modal ⭐ NEW**

```
┌─────────────────────────────────────────────┐
│  💳 Manual Subscription Renewal              │
├─────────────────────────────────────────────┤
│                                              │
│  Subscription Details:                       │
│  • Merchant: Shop ABC                        │
│  • Plan: Professional ($99.00/month)         │
│  • Current Period: Sep 15 - Oct 15, 2025    │
│  • New Period: Oct 15 - Nov 15, 2025 ⭐      │
│                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                              │
│  Payment Information:                        │
│                                              │
│  Amount: $99.00                              │
│  Currency: USD                               │
│                                              │
│  Payment Method: *                           │
│  ○ Stripe (Card Payment)                     │
│  ● Bank Transfer (Manual)                    │
│                                              │
│  Transaction ID: * (Required)                │
│  [txn_1234567890____________]                │
│                                              │
│  Reference Number: (Optional)                │
│  [REF-2025-001_______________]               │
│                                              │
│  Description: (Optional)                     │
│  [Monthly renewal - October 2025]            │
│                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                              │
│  [Cancel] [Process Renewal →] 🔄            │
└─────────────────────────────────────────────┘
```

### **4. Upgrade from Trial Modal ⭐ NEW**

```
┌─────────────────────────────────────────────┐
│  📈 Upgrade Subscription                     │
├─────────────────────────────────────────────┤
│                                              │
│  Current: Trial (Free)                       │
│  → Upgrade to: Professional                  │
│                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                              │
│  Choose a Plan: *                            │
│                                              │
│  ┌─────────────┐ ┌─────────────┐           │
│  │ 💼 Basic    │ │ ⭐ Pro      │           │
│  │             │ │   POPULAR   │           │
│  │ $49/month   │ │ $99/month   │ ✓ Selected│
│  │             │ │             │           │
│  │ • 2 outlets │ │ • 5 outlets │           │
│  │ • 5 users   │ │ • 15 users  │           │
│  │ • 100 prods │ │ • Unlimited │           │
│  │             │ │             │           │
│  │ [Select]    │ │ [✓ Selected]│           │
│  └─────────────┘ └─────────────┘           │
│                                              │
│  Billing Cycle: *                            │
│  ○ Monthly ($99.00/month)                    │
│  ● Quarterly ($267.00/quarter) - Save 10%   │
│  ○ Yearly ($950.00/year) - Save 20%         │
│                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                              │
│  Payment Summary:                            │
│  • First payment: $267.00 (3 months)         │
│  • Next billing: Nov 15, 2025                │
│  • You save: $30.00 (10% off)                │
│                                              │
│  Payment Method:                             │
│  ● Stripe (Card)                             │
│  ○ Bank Transfer                             │
│                                              │
│  [Cancel] [Upgrade Now →] 🚀                │
└─────────────────────────────────────────────┘
```

### **5. Dashboard Analytics Widget ⭐ NEW**

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Subscription Analytics                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Revenue Metrics (This Month)                                │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │ MRR          │ New Revenue  │ Churn        │            │
│  │ $14,500      │ +$2,400      │ -$350        │            │
│  │ 📈 +12%      │ 🎯 18 new    │ ⚠️ 3 lost    │            │
│  └──────────────┴──────────────┴──────────────┘            │
│                                                              │
│  Subscription Status                                         │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │ Active: 145  │ Trial: 23    │ Past Due: 5  │            │
│  │ 🟢 78%       │ 🟡 12%       │ 🔴 3%        │            │
│  └──────────────┴──────────────┴──────────────┘            │
│                                                              │
│  Trial Conversion                                            │
│  ┌────────────────────────────────────────────┐            │
│  │ This Month: 18 / 23 = 78% ✅ (Target: 70%) │            │
│  │ Last Month: 15 / 20 = 75%                  │            │
│  │ ████████████████████████░░░░░░░░           │            │
│  └────────────────────────────────────────────┘            │
│                                                              │
│  Top Plans                                                   │
│  1. Professional (89 subs) - $8,811/mo                      │
│  2. Basic (34 subs) - $1,666/mo                             │
│  3. Enterprise (22 subs) - $4,378/mo                        │
│                                                              │
│  [View Full Report →]                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ **Implementation Plan**

### **Phase 1: Critical Missing Features** (Priority 1)

#### **Task 1.1: Payment History Component** ⭐
**Files to create:**
```typescript
packages/ui/src/components/features/Subscriptions/components/
├── PaymentHistoryTable.tsx          ⭐ NEW
├── PaymentDetailModal.tsx           ⭐ NEW
└── PaymentFilters.tsx               ⭐ NEW
```

**Features:**
- ✅ Display all payments for a subscription
- ✅ Filter by status, method, date range
- ✅ Sort by date, amount
- ✅ Pagination
- ✅ Export to CSV
- ✅ View payment details
- ✅ Download invoice

**Estimated Time:** 4-6 hours

#### **Task 1.2: Manual Renewal Function** ⭐
**Files to create/update:**
```typescript
// Backend
packages/database/src/subscription.ts
└── renewSubscription()              ⭐ NEW (already in review doc)

// API
apps/api/app/api/subscriptions/[id]/renew/route.ts  ⭐ NEW

// Frontend
packages/ui/src/components/features/Subscriptions/components/
└── ManualRenewalModal.tsx           ⭐ NEW
```

**Features:**
- ✅ Select payment method (Stripe/Transfer)
- ✅ Enter transaction ID
- ✅ Add reference number
- ✅ Process renewal
- ✅ Update subscription period (+1 month)
- ✅ Create payment record
- ✅ Show confirmation

**Estimated Time:** 4-6 hours

#### **Task 1.3: Upgrade from Trial** ⭐
**Files to create:**
```typescript
packages/ui/src/components/features/Subscriptions/components/
├── UpgradeTrialModal.tsx            ⭐ NEW
└── PlanSelectionCard.tsx            ⭐ NEW
```

**Features:**
- ✅ Show all available plans
- ✅ Select billing cycle (monthly/quarterly/yearly)
- ✅ Calculate pricing with discounts
- ✅ Payment method selection
- ✅ Process upgrade
- ✅ Status change: trial → active
- ✅ Send confirmation email

**Estimated Time:** 6-8 hours

---

### **Phase 2: Admin Dashboard** (Priority 2)

#### **Task 2.1: Subscription Analytics** ⭐
**Files to create:**
```typescript
apps/admin/app/dashboard/components/
├── SubscriptionMetrics.tsx          ⭐ NEW
├── RevenueChart.tsx                 ⭐ NEW
├── TrialConversionWidget.tsx        ⭐ NEW
└── TopPlansWidget.tsx               ⭐ NEW
```

**Features:**
- ✅ MRR calculation
- ✅ New revenue tracking
- ✅ Churn rate
- ✅ Active/Trial/Past Due counts
- ✅ Trial conversion rate
- ✅ Top performing plans
- ✅ Revenue by period chart

**Estimated Time:** 8-10 hours

#### **Task 2.2: Payment History API** ⭐
**Files to create:**
```typescript
apps/api/app/api/subscriptions/[id]/payments/route.ts  ⭐ NEW

packages/database/src/subscription.ts
└── getSubscriptionPaymentHistory()  ⭐ NEW (already in review doc)
```

**Estimated Time:** 2-3 hours

---

### **Phase 3: Enhanced Features** (Priority 3)

#### **Task 3.1: Automated Reminders**
- Email 3 days before renewal
- Payment failure notifications
- Trial expiration warnings

#### **Task 3.2: Invoice Generation**
- PDF invoice generation
- Invoice numbering
- Download/email invoices

#### **Task 3.3: Subscription History**
- Track all changes (upgrades, downgrades)
- Audit log
- Export history

---

## 💻 **Code Examples**

### **1. Payment History Table Component** ⭐ NEW

```typescript
// packages/ui/src/components/features/Subscriptions/components/PaymentHistoryTable.tsx

'use client'

import React, { useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Badge,
  Button,
  Pagination,
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '../../../ui';
import { formatDate, formatCurrency } from '@rentalshop/utils';
import { Download, FileText, Eye, Filter } from 'lucide-react';

interface Payment {
  id: number;
  amount: number;
  currency: string;
  method: string;
  status: string;
  transactionId: string;
  description?: string;
  createdAt: Date;
  invoiceNumber?: string;
}

interface PaymentHistoryTableProps {
  subscriptionId: number;
  payments: Payment[];
  loading?: boolean;
  onViewPayment?: (payment: Payment) => void;
  onDownloadInvoice?: (payment: Payment) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

export function PaymentHistoryTable({
  subscriptionId,
  payments,
  loading = false,
  onViewPayment,
  onDownloadInvoice,
  pagination
}: PaymentHistoryTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  const getStatusBadge = (status: string) => {
    const statusMap = {
      COMPLETED: { variant: 'success', label: 'Paid' },
      PENDING: { variant: 'warning', label: 'Pending' },
      FAILED: { variant: 'danger', label: 'Failed' },
      REFUNDED: { variant: 'secondary', label: 'Refunded' }
    };

    const config = statusMap[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getMethodIcon = (method: string) => {
    switch (method.toUpperCase()) {
      case 'STRIPE':
        return '💳';
      case 'TRANSFER':
        return '🏦';
      case 'MANUAL':
        return '✏️';
      default:
        return '💰';
    }
  };

  const exportToCSV = () => {
    const csv = [
      ['Date', 'Amount', 'Method', 'Status', 'Transaction ID'].join(','),
      ...payments.map(p => [
        formatDate(p.createdAt),
        p.amount,
        p.method,
        p.status,
        p.transactionId
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${subscriptionId}-${Date.now()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-600">Loading payment history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>💳 Payment History</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No payment history yet</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {formatDate(payment.createdAt, 'MMM DD, YYYY')}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(payment.amount, payment.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{getMethodIcon(payment.method)}</span>
                          <span className="capitalize">
                            {payment.method.toLowerCase()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.status)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {payment.transactionId}
                      </TableCell>
                      <TableCell>
                        {payment.invoiceNumber ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDownloadInvoice?.(payment)}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            {payment.invoiceNumber}
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewPayment?.(payment)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {pagination && (
              <div className="mt-6">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={Math.ceil(pagination.total / pagination.limit)}
                  onPageChange={pagination.onPageChange}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

### **2. Manual Renewal Modal** ⭐ NEW

```typescript
// packages/ui/src/components/features/Subscriptions/components/ManualRenewalModal.tsx

'use client'

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Textarea,
  Card
} from '../../../ui';
import { formatCurrency, formatDate } from '@rentalshop/utils';
import { CreditCard, Building2, AlertCircle } from 'lucide-react';

interface ManualRenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: {
    id: number;
    merchantName: string;
    planName: string;
    amount: number;
    currency: string;
    currentPeriodEnd: Date;
  };
  onRenew: (data: RenewalData) => Promise<void>;
  loading?: boolean;
}

interface RenewalData {
  method: 'STRIPE' | 'TRANSFER';
  transactionId: string;
  reference?: string;
  description?: string;
}

export function ManualRenewalModal({
  isOpen,
  onClose,
  subscription,
  onRenew,
  loading = false
}: ManualRenewalModalProps) {
  const [method, setMethod] = useState<'STRIPE' | 'TRANSFER'>('TRANSFER');
  const [transactionId, setTransactionId] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const nextPeriodStart = new Date(subscription.currentPeriodEnd);
  const nextPeriodEnd = new Date(nextPeriodStart);
  nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!transactionId.trim()) {
      newErrors.transactionId = 'Transaction ID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await onRenew({
        method,
        transactionId,
        reference: reference || undefined,
        description: description || `Monthly renewal - ${formatDate(new Date(), 'MMMM YYYY')}`
      });

      // Reset form
      setTransactionId('');
      setReference('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Renewal failed:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>💳 Manual Subscription Renewal</DialogTitle>
          <DialogDescription>
            Process a manual payment for this subscription
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Subscription Details */}
          <Card className="bg-blue-50 border-blue-200">
            <div className="p-4 space-y-2">
              <h3 className="font-semibold text-blue-900">Subscription Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-blue-700">Merchant:</span>
                  <span className="ml-2 font-medium">{subscription.merchantName}</span>
                </div>
                <div>
                  <span className="text-blue-700">Plan:</span>
                  <span className="ml-2 font-medium">{subscription.planName}</span>
                </div>
                <div>
                  <span className="text-blue-700">Current Period:</span>
                  <span className="ml-2">{formatDate(subscription.currentPeriodEnd, 'MMM DD, YYYY')}</span>
                </div>
                <div>
                  <span className="text-blue-700">New Period:</span>
                  <span className="ml-2 font-semibold text-green-700">
                    {formatDate(nextPeriodEnd, 'MMM DD, YYYY')} ⭐
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Payment Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Payment Information</h3>

            {/* Amount */}
            <div>
              <Label>Amount</Label>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(subscription.amount, subscription.currency)}
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <RadioGroup value={method} onValueChange={(v) => setMethod(v as 'STRIPE' | 'TRANSFER')}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="STRIPE" id="stripe" />
                  <Label htmlFor="stripe" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CreditCard className="w-4 h-4" />
                    <span>Stripe (Card Payment)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="TRANSFER" id="transfer" />
                  <Label htmlFor="transfer" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Building2 className="w-4 h-4" />
                    <span>Bank Transfer (Manual)</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Transaction ID */}
            <div className="space-y-2">
              <Label htmlFor="transactionId">
                Transaction ID *
                {method === 'STRIPE' && <span className="text-gray-500 text-sm ml-2">(e.g., txn_1234567890)</span>}
                {method === 'TRANSFER' && <span className="text-gray-500 text-sm ml-2">(Bank reference number)</span>}
              </Label>
              <Input
                id="transactionId"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder={method === 'STRIPE' ? 'txn_1234567890' : 'BANK-REF-123'}
                className={errors.transactionId ? 'border-red-500' : ''}
              />
              {errors.transactionId && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.transactionId}
                </p>
              )}
            </div>

            {/* Reference Number */}
            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number (Optional)</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="REF-2025-001"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Monthly subscription renewal - October 2025"
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Processing...
              </>
            ) : (
              <>🔄 Process Renewal</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### **3. Usage in Admin Page** ⭐

```typescript
// apps/admin/app/subscriptions/[id]/page.tsx (Enhanced)

'use client'

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  PaymentHistoryTable,
  ManualRenewalModal,
  UpgradeTrialModal,
  Button,
  Card,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  useToasts
} from '@rentalshop/ui';
import { subscriptionsApi, paymentsApi } from '@rentalshop/utils';

export default function SubscriptionDetailPage() {
  const params = useParams();
  const subscriptionId = parseInt(params.id as string);
  const { showSuccess, showError } = useToasts();

  const [subscription, setSubscription] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [subscriptionId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch subscription details
      const subResult = await subscriptionsApi.getSubscription(subscriptionId);
      if (subResult.success) {
        setSubscription(subResult.data);
      }

      // Fetch payment history ⭐ NEW
      const paymentResult = await subscriptionsApi.getPaymentHistory(subscriptionId);
      if (paymentResult.success) {
        setPayments(paymentResult.data);
      }
    } catch (error) {
      showError('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  const handleManualRenewal = async (data) => {
    try {
      const result = await subscriptionsApi.renewSubscription(subscriptionId, data);
      if (result.success) {
        showSuccess('Subscription renewed successfully!');
        fetchData(); // Reload data
        setShowRenewalModal(false);
      }
    } catch (error) {
      showError('Failed to renew subscription');
    }
  };

  const handleUpgrade = async (planId, billingCycle) => {
    try {
      const result = await subscriptionsApi.upgradePlan(subscriptionId, {
        planId,
        billingCycle
      });
      if (result.success) {
        showSuccess('Plan upgraded successfully!');
        fetchData();
        setShowUpgradeModal(false);
      }
    } catch (error) {
      showError('Failed to upgrade plan');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!subscription) return <div>Subscription not found</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {subscription.merchant.name} - Subscription
        </h1>
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => setShowRenewalModal(true)}
          >
            💳 Manual Renewal
          </Button>
          {subscription.status === 'trial' && (
            <Button
              variant="success"
              onClick={() => setShowUpgradeModal(true)}
            >
              📈 Upgrade Plan
            </Button>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        {/* Status, Plan, Amount, Next Billing cards */}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">💳 Payment History</TabsTrigger>
          <TabsTrigger value="activity">📊 Activity Log</TabsTrigger>
          <TabsTrigger value="details">📋 Plan Details</TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          <PaymentHistoryTable
            subscriptionId={subscriptionId}
            payments={payments}
            loading={loading}
            onViewPayment={(payment) => {/* View details */}}
            onDownloadInvoice={(payment) => {/* Download */}}
          />
        </TabsContent>

        <TabsContent value="activity">
          {/* Activity log */}
        </TabsContent>

        <TabsContent value="details">
          {/* Plan details */}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <ManualRenewalModal
        isOpen={showRenewalModal}
        onClose={() => setShowRenewalModal(false)}
        subscription={subscription}
        onRenew={handleManualRenewal}
      />

      {subscription.status === 'trial' && (
        <UpgradeTrialModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          subscription={subscription}
          onUpgrade={handleUpgrade}
        />
      )}
    </div>
  );
}
```

---

## 📋 **Complete Implementation Checklist**

### **Phase 1: Critical Features** 🔴
- [ ] Create `PaymentHistoryTable.tsx` component
- [ ] Create `ManualRenewalModal.tsx` component  
- [ ] Create `UpgradeTrialModal.tsx` component
- [ ] Implement `getSubscriptionPaymentHistory()` function
- [ ] Implement `renewSubscription()` function
- [ ] Create `GET /api/subscriptions/:id/payments` endpoint
- [ ] Create `POST /api/subscriptions/:id/renew` endpoint
- [ ] Update subscription detail page with new components
- [ ] Add manual renewal to action menu
- [ ] Add upgrade button for trial subscriptions

### **Phase 2: Analytics** 🟡
- [ ] Create subscription metrics component
- [ ] Add MRR calculation
- [ ] Add trial conversion tracking
- [ ] Create revenue chart
- [ ] Add top plans widget
- [ ] Integrate into admin dashboard

### **Phase 3: Enhancements** 🟢
- [ ] Email notification system
- [ ] Invoice PDF generation
- [ ] Subscription change history
- [ ] Export functionality
- [ ] Advanced filtering
- [ ] Bulk operations

---

## 🎯 **Summary**

### **What Makes This Solution Simple & Clean:**

1. **Reuses Existing Components** ✅
   - Builds on your current UI library
   - Consistent design patterns
   - Minimal new code

2. **Clear Separation of Concerns** ✅
   - Database functions in `packages/database`
   - API routes in `apps/api`
   - UI components in `packages/ui`
   - Pages in `apps/admin`

3. **Incremental Implementation** ✅
   - Phase 1 = Core features (10-14 hours)
   - Phase 2 = Analytics (8-10 hours)
   - Phase 3 = Nice-to-haves (optional)

4. **Extensible Architecture** ✅
   - Easy to add new payment methods
   - Easy to add new plan types
   - Easy to add new metrics
   - Modular components

### **Estimated Total Time:**
- **Phase 1 (Critical):** 10-14 hours
- **Phase 2 (Analytics):** 8-10 hours
- **Phase 3 (Optional):** 12-16 hours

**Total:** 18-24 hours for complete system

---

## 🚀 **Next Steps**

**Ready to implement?**

1. ✅ Start with Phase 1 (Payment History + Manual Renewal)
2. ✅ Test thoroughly with real data
3. ✅ Add Phase 2 (Analytics) after Phase 1 is stable
4. ✅ Phase 3 can be added incrementally

**Bạn muốn tôi implement Phase 1 ngay không?** 

Tôi sẽ tạo tất cả các files và code cần thiết cho:
- Payment History Table
- Manual Renewal Modal
- Backend functions
- API endpoints

**Simple, Clean, và Production-Ready!** 🎉

