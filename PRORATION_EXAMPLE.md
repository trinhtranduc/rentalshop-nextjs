# 💰 Simple Proration Example

## How It Works

When a merchant upgrades their plan mid-cycle, they only pay the prorated difference for the remaining days.

## Example Scenario

**Current Plan**: Starter Monthly ($29/month)
**New Plan**: Professional Monthly ($99/month)  
**Upgrade Date**: 15 days into the billing cycle
**Days Remaining**: 15 days

## Calculation

```typescript
// Current subscription
const currentSubscription = {
  amount: 29,                    // $29/month
  currentPeriodStart: new Date('2024-01-01'),
  currentPeriodEnd: new Date('2024-01-31')
};

// New plan
const newPlanPrice = 99;         // $99/month
const changeDate = new Date('2024-01-16'); // 15 days in

// Proration calculation
const priceDifference = 99 - 29 = 70;        // $70 difference
const daysInPeriod = 31;                     // 31 days total
const daysRemaining = 15;                    // 15 days left
const dailyRate = 70 / 31 = $2.26/day;      // Daily rate
const proratedAmount = 2.26 * 15 = $33.90;  // Amount to charge
```

## Result

- **Charge**: $33.90 (prorated difference)
- **Reason**: "Upgrade proration: 15 days remaining at $2.26/day"
- **Payment Status**: COMPLETED
- **Payment Method**: MANUAL

## What Happens

1. ✅ **Immediate Access**: Merchant gets new plan features right away
2. ✅ **Fair Billing**: Only pays for the remaining days at the higher rate
3. ✅ **Clear Documentation**: Payment record shows exactly what was charged and why
4. ✅ **Next Billing**: Full $99 charged on next billing cycle

## API Response

```json
{
  "success": true,
  "message": "Plan changed successfully",
  "data": {
    "subscription": {
      "id": 123,
      "planName": "Professional Monthly",
      "amount": 99,
      "status": "active"
    },
    "payment": {
      "id": 456,
      "amount": 33.90,
      "method": "MANUAL",
      "type": "PLAN_CHANGE",
      "status": "COMPLETED",
      "notes": "Plan change from Starter Monthly to Professional Monthly (Proration: $33.90 - Upgrade proration: 15 days remaining at $2.26/day)"
    }
  }
}
```

## Benefits

- ✅ **Fair**: Only pay for what you use
- ✅ **Simple**: Easy to understand calculation
- ✅ **Immediate**: Get new features right away
- ✅ **Transparent**: Clear breakdown of charges
