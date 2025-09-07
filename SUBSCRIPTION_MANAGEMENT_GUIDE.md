# Subscription Management System Guide

## Overview

This guide explains how to use the comprehensive subscription management system that handles plan expiration, payment processing, and admin extensions for the RentalShop platform.

## 🎯 Features Implemented

### ✅ **Subscription Expiry Detection**
- Automatic detection of expired subscriptions
- Real-time status checking via API
- Grace period management
- Background processing with middleware

### ✅ **Plan Selection UI**
- User-friendly plan selection modal for expired subscriptions
- Billing cycle options (monthly, quarterly, semi-annual, annual)
- Payment method selection
- Price calculation with discounts

### ✅ **Payment Gateway Integration**
- **Stripe Integration**: Full support for cards, subscriptions, and webhooks
- **PayPal Integration**: Complete PayPal payment processing
- **Bank Transfer**: Manual payment processing
- **Manual Payments**: Admin-managed payments

### ✅ **Admin Manual Extension**
- Admin-only subscription extension functionality
- Flexible payment methods (bank transfer, cash, check, etc.)
- Detailed extension tracking and audit logs
- Bulk subscription management

### ✅ **Subscription Status Management**
- Real-time subscription status API
- Automatic status updates
- Role-based access control
- Comprehensive subscription statistics

### ✅ **Billing Automation**
- Automated subscription renewal
- Cron job integration
- Payment retry logic
- Grace period handling

## 🚀 Quick Start

### 1. **Environment Setup**

Add these environment variables to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_ENVIRONMENT=sandbox  # or 'production'

# Cron Job Security
CRON_SECRET=your_secure_cron_secret
```

### 2. **Database Setup**

The subscription system uses these database models:
- `Subscription` - Main subscription records
- `SubscriptionPayment` - Payment history
- `Plan` - Available subscription plans
- `Merchant` - Merchant subscription status

### 3. **API Endpoints**

#### **Subscription Management**
- `GET /api/subscriptions` - List subscriptions (with role-based filtering)
- `POST /api/subscriptions` - Create new subscription
- `GET /api/subscriptions/status` - Get current user's subscription status
- `GET /api/subscriptions/stats` - Get subscription statistics (admin only)

#### **Expiry Management**
- `GET /api/subscriptions/expired` - Get expired subscriptions (admin only)
- `POST /api/subscriptions/expired` - Mark subscription as expired (admin only)
- `POST /api/subscriptions/extend` - Extend subscription (admin only)
- `POST /api/subscriptions/check-expiry` - Manual expiry check (admin only)

#### **Payment Processing**
- `POST /api/payments/process` - Process payment
- `GET /api/payments/process` - Get available payment gateways

#### **Cron Jobs**
- `POST /api/cron/subscription-renewal` - Run subscription renewal process

## 📱 User Experience

### **For Expired Subscriptions**

1. **Expiry Banner**: Users see a prominent banner when their subscription expires
2. **Plan Selection**: Clicking "Renew Now" opens a plan selection modal
3. **Payment Processing**: Users can choose from available payment methods
4. **Confirmation**: Success/failure feedback with next steps

### **For Admins**

1. **Subscription Dashboard**: View all subscriptions with filtering and search
2. **Manual Extension**: Extend subscriptions manually with payment tracking
3. **Bulk Management**: Process multiple subscriptions at once
4. **Analytics**: Comprehensive subscription statistics and trends

## 🔧 Implementation Details

### **Subscription Status Hook**

```typescript
import { useSubscriptionStatus } from '@rentalshop/hooks';

function MyComponent() {
  const {
    hasSubscription,
    subscription,
    isExpired,
    isExpiringSoon,
    needsRenewal,
    refresh
  } = useSubscriptionStatus();

  if (needsRenewal()) {
    return <SubscriptionExpiryBanner subscription={subscription} />;
  }

  return <div>Subscription is active</div>;
}
```

### **Plan Selection Modal**

```typescript
import { PlanSelectionModal } from '@rentalshop/ui';

function SubscriptionPage() {
  const [showPlanSelection, setShowPlanSelection] = useState(false);

  const handlePlanSelected = async (planId: number, billingCycle: string) => {
    // Process plan selection and payment
    console.log('Selected plan:', planId, billingCycle);
  };

  return (
    <PlanSelectionModal
      isOpen={showPlanSelection}
      onClose={() => setShowPlanSelection(false)}
      onSelectPlan={handlePlanSelected}
      plans={availablePlans}
      currentPlan={currentSubscription?.plan}
    />
  );
}
```

### **Admin Extension Modal**

```typescript
import { AdminExtensionModal } from '@rentalshop/ui';

function AdminPage() {
  const [showExtension, setShowExtension] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);

  const handleExtension = async (data) => {
    // Process subscription extension
    await extendSubscription(data);
  };

  return (
    <AdminExtensionModal
      isOpen={showExtension}
      onClose={() => setShowExtension(false)}
      onExtend={handleExtension}
      subscription={selectedSubscription}
    />
  );
}
```

## 🔄 Automation Setup

### **Cron Job Configuration**

Set up a cron job to run subscription renewals:

```bash
# Run every hour
0 * * * * curl -X POST https://your-domain.com/api/cron/subscription-renewal \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### **Webhook Configuration**

#### **Stripe Webhooks**
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events: `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`

#### **PayPal Webhooks**
1. Go to PayPal Developer Dashboard → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/paypal`
3. Select events: `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`

## 🛡️ Security Features

### **Role-Based Access Control**
- **ADMIN**: Full access to all subscription management
- **MERCHANT**: Can view and manage their own subscriptions
- **OUTLET_ADMIN/OUTLET_STAFF**: Limited access to subscription status

### **Payment Security**
- All payment processing is handled server-side
- Sensitive data is never exposed to the frontend
- Webhook signature verification
- Audit logging for all payment activities

### **API Security**
- JWT token authentication required
- Role-based endpoint protection
- Input validation and sanitization
- Rate limiting on payment endpoints

## 📊 Monitoring & Analytics

### **Subscription Statistics**
- Total subscriptions by status
- Revenue tracking
- Plan distribution
- Monthly trends

### **Payment Analytics**
- Success/failure rates
- Gateway performance
- Average transaction amounts
- Payment method preferences

### **Admin Dashboard**
- Real-time subscription status
- Expired subscription alerts
- Payment processing logs
- System health monitoring

## 🔧 Configuration Options

### **Renewal Settings**
```typescript
const renewalConfig = {
  autoRenewEnabled: true,
  gracePeriodDays: 7,
  retryAttempts: 3,
  retryDelayHours: 24
};
```

### **Payment Gateway Priority**
```typescript
const paymentConfig = {
  defaultGateway: 'STRIPE',
  availableGateways: ['STRIPE', 'PAYPAL', 'BANK_TRANSFER', 'MANUAL']
};
```

## 🚨 Troubleshooting

### **Common Issues**

1. **Subscription not renewing**
   - Check auto-renewal setting
   - Verify payment method is valid
   - Check cron job is running

2. **Payment failures**
   - Verify gateway configuration
   - Check webhook endpoints
   - Review error logs

3. **Admin extension not working**
   - Ensure user has ADMIN role
   - Check subscription exists
   - Verify date format

### **Debug Commands**

```bash
# Check subscription status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/api/subscriptions/status

# Run manual expiry check
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/api/subscriptions/check-expiry

# Test payment processing
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 29.99, "currency": "USD", "gateway": "STRIPE"}' \
  https://your-domain.com/api/payments/process
```

## 📈 Performance Optimization

### **Database Indexing**
- Subscriptions indexed by status, merchant, and dates
- Payment records indexed by subscription and status
- Optimized queries for large datasets

### **Caching Strategy**
- Subscription status cached for 5 minutes
- Plan data cached for 1 hour
- Payment gateway configs cached

### **Background Processing**
- Subscription renewals run in background
- Payment processing is asynchronous
- Email notifications queued

## 🔮 Future Enhancements

### **Planned Features**
- [ ] Dunning management for failed payments
- [ ] Proration for plan changes
- [ ] Usage-based billing
- [ ] Multi-currency support
- [ ] Advanced analytics dashboard
- [ ] Mobile app integration
- [ ] White-label customization

### **Integration Opportunities**
- [ ] Email marketing platforms
- [ ] CRM systems
- [ ] Accounting software
- [ ] Business intelligence tools

## 📞 Support

For technical support or questions about the subscription management system:

1. Check the troubleshooting section above
2. Review the API documentation
3. Check the system logs
4. Contact the development team

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Compatibility**: Next.js 14+, React 18+, TypeScript 5+
