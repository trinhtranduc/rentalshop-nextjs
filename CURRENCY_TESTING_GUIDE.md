# Multi-Currency Testing Guide

## ✅ Implementation Complete!

All core currency functionality has been implemented. This guide will help you test it.

## 🚀 Quick Start

### 1. Build Updated Packages

```bash
cd /Users/mac/Source-Code/rentalshop-nextjs

# Build all packages in correct order
yarn workspace @rentalshop/constants build
yarn workspace @rentalshop/types build  
yarn workspace @rentalshop/database build
yarn workspace @rentalshop/ui build
```

### 2. Run Database Migration (Optional)

If you have existing merchants in your database:

```bash
# This will set all existing merchants to USD
node scripts/migrate-merchant-currency.js
```

### 3. Start Development Server

```bash
yarn dev
```

## 🧪 Test Scenarios

### Test 1: New Merchant Registration with USD

1. Navigate to merchant registration page
2. Fill in business details
3. **Select Currency: USD ($)** from dropdown
4. Complete registration
5. **Expected Result**: 
   - Merchant created with currency = 'USD'
   - All prices display with $ symbol
   - Subscription created in USD

### Test 2: New Merchant Registration with VND

1. Navigate to merchant registration page
2. Fill in business details
3. **Select Currency: VND (đ)** from dropdown
4. Complete registration
5. **Expected Result**:
   - Merchant created with currency = 'VND'
   - All prices display with đ symbol
   - Subscription created in VND
   - Numbers formatted without decimals (VND doesn't use cents)

### Test 3: Order Creation - USD Merchant

**Prerequisites**: Merchant with USD currency

1. Login as USD merchant
2. Navigate to Create Order
3. Add products to order
4. **Expected Results**:
   - Product prices show $ symbol
   - Order summary shows $ symbol
   - Subtotal, deposit, total all use $ format
   - Example: $100.00, $50.00

### Test 4: Order Creation - VND Merchant

**Prerequisites**: Merchant with VND currency

1. Login as VND merchant
2. Navigate to Create Order
3. Add products to order
4. **Expected Results**:
   - Product prices show đ symbol after amount
   - Order summary shows đ symbol
   - No decimal places (VND format)
   - Example: 100,000đ, 50,000đ

### Test 5: Order Editing

1. Open existing order for editing
2. **Expected Results**:
   - Prices display in merchant's currency
   - Currency consistent throughout form
   - Can save changes successfully

### Test 6: Existing Merchants (After Migration)

**Prerequisites**: Run migration script

1. Login as existing merchant
2. Check merchant profile
3. **Expected Results**:
   - Currency field shows "USD"
   - All prices display with $ symbol
   - Orders show USD formatting

## 🔍 What to Check

### Visual Checks

- [ ] **Currency Symbol Position**:
  - USD: `$100.00` (symbol before)
  - VND: `100,000đ` (symbol after)

- [ ] **Decimal Places**:
  - USD: 2 decimal places (`$100.50`)
  - VND: No decimals (`100,500đ`)

- [ ] **Number Formatting**:
  - USD: Comma thousands separator (`$1,234.56`)
  - VND: Dot thousands separator (`1.234.567đ`)

### Functional Checks

- [ ] **Merchant Registration**:
  - Currency selector appears
  - Default is USD
  - Both USD and VND selectable
  - Selection saved to database

- [ ] **Order Creation**:
  - Currency passed to form
  - All price fields use correct currency
  - Subtotals calculate correctly
  - Total displays in correct currency

- [ ] **Order Display**:
  - Existing orders show in merchant currency
  - Order tables format correctly
  - Order details show correct currency

- [ ] **Database**:
  - Merchant table has currency field
  - Default value is "USD"
  - Values are either "USD" or "VND"

## 🐛 Troubleshooting

### Issue: Currency dropdown not showing

**Solution**: Rebuild UI package

```bash
yarn workspace @rentalshop/ui build
```

### Issue: Prices still showing in USD for VND merchant

**Possible Causes**:
1. Currency prop not passed to component
2. Component using hardcoded 'USD'
3. Old built files cached

**Solution**:
```bash
# Clear and rebuild
rm -rf packages/ui/dist
yarn workspace @rentalshop/ui build

# Restart dev server
yarn dev
```

### Issue: Migration script fails

**Possible Causes**:
1. Database not running
2. Connection string incorrect
3. Prisma schema not migrated

**Solution**:
```bash
# Check database connection
npx prisma db push

# Then run migration
node scripts/migrate-merchant-currency.js
```

### Issue: TypeScript errors in currency imports

**Solution**: Rebuild in correct order
```bash
yarn workspace @rentalshop/constants build
yarn workspace @rentalshop/types build
yarn workspace @rentalshop/ui build
```

## 📊 Database Verification

Check currency values directly in database:

```sql
-- Check all merchants have currency
SELECT id, name, email, currency FROM "Merchant";

-- Count merchants by currency
SELECT currency, COUNT(*) FROM "Merchant" GROUP BY currency;

-- Check subscriptions match merchant currency
SELECT 
  m.name,
  m.currency as merchant_currency,
  s.currency as subscription_currency
FROM "Merchant" m
LEFT JOIN "Subscription" s ON s."merchantId" = m.id;
```

## ✅ Success Criteria

You've successfully implemented multi-currency support when:

1. ✅ New merchants can choose USD or VND
2. ✅ Merchant registration saves selected currency
3. ✅ Order creation displays prices in merchant currency
4. ✅ Currency symbols display correctly ($ before, đ after)
5. ✅ Number formatting follows currency rules
6. ✅ Existing merchants default to USD
7. ✅ No TypeScript errors
8. ✅ No runtime errors in console

## 🎯 Next Steps After Testing

Once testing is complete:

1. **Document any issues found**
2. **Update remaining components** (see MULTI_CURRENCY_IMPLEMENTATION.md)
3. **Add currency to API responses** where applicable
4. **Consider adding currency to exports/reports**
5. **Update user documentation** with currency selection info

## 📝 Test Results Template

Copy this template to document your testing:

```markdown
## Test Results - [Date]

### Test 1: USD Registration
- [ ] Currency selector visible
- [ ] USD selectable
- [ ] Merchant created successfully
- [ ] Currency saved as 'USD'
- [ ] Prices show $ symbol

### Test 2: VND Registration  
- [ ] VND selectable
- [ ] Merchant created successfully
- [ ] Currency saved as 'VND'
- [ ] Prices show đ symbol
- [ ] No decimals shown

### Test 3: Order Creation (USD)
- [ ] Prices display with $
- [ ] 2 decimal places
- [ ] Calculations correct

### Test 4: Order Creation (VND)
- [ ] Prices display with đ
- [ ] No decimal places
- [ ] Calculations correct

### Test 5: Migration
- [ ] Script runs without errors
- [ ] All merchants have currency
- [ ] Existing merchants set to USD

### Issues Found:
1. [Issue description]
   - Impact: [High/Medium/Low]
   - Status: [Open/Fixed]

### Notes:
[Any additional observations]
```

## 🆘 Need Help?

If you encounter issues:

1. Check build logs for errors
2. Verify all packages built successfully
3. Check browser console for runtime errors
4. Review MULTI_CURRENCY_IMPLEMENTATION.md for details
5. Check git diff to see all changes made

Happy testing! 🎉

