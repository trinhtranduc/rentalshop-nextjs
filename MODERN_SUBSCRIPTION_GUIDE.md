# Modern Subscription Billing Guide

## Overview
This guide explains how to manage billing intervals and discount percentages following Stripe's modern subscription practices.

## Billing Intervals & Discounts

### Default Configuration
Following Stripe's best practices, we offer these billing intervals:

| Interval | Months | Discount | Purpose |
|----------|--------|----------|---------|
| **Monthly** | 1 | 0% | Standard pricing, no commitment |
| **Quarterly** | 3 | 5% | Good retention, moderate commitment |
| **6 Months** | 6 | 10% | Better retention, longer commitment |
| **Yearly** | 12 | 20% | Best value, maximum commitment |

### Why These Discounts?

1. **Monthly (0%)** - No discount encourages customers to choose longer terms
2. **Quarterly (5%)** - Small discount for 3-month commitment
3. **6 Months (10%)** - Moderate discount for semi-annual commitment
4. **Yearly (20%)** - Significant discount for annual commitment

## Admin Management

### Where to Configure
- **Admin Panel**: `/admin/settings/billing`
- **API Endpoint**: `/api/settings/billing`

### How to Change Discounts

1. **Access Admin Panel**
   ```
   http://localhost:3001/admin/settings/billing
   ```

2. **Edit Billing Intervals**
   - Click "Edit" button next to any interval
   - Modify discount percentage (0-100%)
   - Toggle active/inactive status
   - Save changes

3. **Add New Intervals**
   - Click "Add Interval" button
   - Set name, months, and discount percentage
   - Save configuration

### API Usage

**Get Current Configuration:**
```bash
GET /api/settings/billing
```

**Update Configuration:**
```bash
POST /api/settings/billing
Content-Type: application/json

{
  "intervals": [
    {
      "id": "month",
      "name": "Monthly",
      "months": 1,
      "discountPercentage": 0,
      "isActive": true
    },
    {
      "id": "year",
      "name": "Yearly",
      "months": 12,
      "discountPercentage": 25,
      "isActive": true
    }
  ]
}
```

## Frontend Integration

### Extend Plan Dialog
The merchant detail page now includes a modern "Extend Plan" dialog with:

- **Billing Interval Selection** - Choose from configured intervals
- **Real-time Discount Calculation** - Shows discount percentage and savings
- **Pricing Summary** - Displays base price, discount, and total
- **Duration Selection** - Set how many intervals to extend

### Example Usage
```typescript
// In MerchantPlanManagement component
const billingIntervals = getActiveBillingIntervals();
const discount = getDiscountPercentage('year'); // Returns 20
const totalPrice = calculateDiscountedPrice(100, 'year', 1); // Returns 80
```

## Stripe Best Practices

### 1. Transparent Pricing
- Show discount percentages clearly
- Display both original and discounted prices
- Explain benefits of longer commitments

### 2. Flexible Billing
- Support multiple billing intervals
- Allow easy switching between intervals
- Provide proration for mid-cycle changes

### 3. Customer Retention
- Higher discounts for longer commitments
- Clear value proposition for annual plans
- Easy upgrade/downgrade options

### 4. Revenue Optimization
- Balance discount percentages with retention
- Monitor conversion rates by interval
- A/B test different discount structures

## Configuration Examples

### Conservative Approach (Lower Discounts)
```json
{
  "intervals": [
    {"id": "month", "name": "Monthly", "months": 1, "discountPercentage": 0, "isActive": true},
    {"id": "quarter", "name": "Quarterly", "months": 3, "discountPercentage": 3, "isActive": true},
    {"id": "year", "name": "Yearly", "months": 12, "discountPercentage": 10, "isActive": true}
  ]
}
```

### Aggressive Approach (Higher Discounts)
```json
{
  "intervals": [
    {"id": "month", "name": "Monthly", "months": 1, "discountPercentage": 0, "isActive": true},
    {"id": "quarter", "name": "Quarterly", "months": 3, "discountPercentage": 10, "isActive": true},
    {"id": "year", "name": "Yearly", "months": 12, "discountPercentage": 30, "isActive": true}
  ]
}
```

## Monitoring & Analytics

### Key Metrics to Track
- **Conversion Rate** by billing interval
- **Customer Lifetime Value** by interval
- **Churn Rate** by interval
- **Revenue Impact** of discount changes

### Recommended Tools
- Stripe Dashboard for payment analytics
- Custom admin dashboard for subscription metrics
- A/B testing for discount optimization

## Security Considerations

### Admin Access
- Restrict billing configuration to admin users only
- Log all configuration changes
- Implement audit trails

### Data Validation
- Validate discount percentages (0-100%)
- Ensure interval months are positive integers
- Prevent duplicate interval IDs

## Future Enhancements

### Planned Features
1. **Dynamic Pricing** - Time-based discount campaigns
2. **Customer Segmentation** - Different discounts for different customer types
3. **Usage-Based Discounts** - Discounts based on usage volume
4. **Promotional Codes** - One-time discount codes
5. **Trial Extensions** - Free trial period extensions

### Integration Opportunities
- Stripe Coupons API
- Customer segmentation tools
- Analytics and reporting platforms
- Marketing automation systems

---

This modern subscription system provides flexibility, transparency, and follows industry best practices while remaining simple to manage and configure.
