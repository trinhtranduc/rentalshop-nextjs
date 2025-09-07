# Test Scripts

This directory contains comprehensive test scripts for the Rental Shop Next.js application. These scripts test various functionalities including plan management, subscription extensions, and system availability.

## 📁 Available Test Scripts

### 1. **test-authentication.js** 🆕
**Purpose:** Tests authentication and authorization functionality for different user roles

**Features:**
- ✅ Admin authentication testing
- ✅ Merchant authentication testing
- ✅ Outlet admin authentication testing
- ✅ Role-based permission validation
- ✅ Token validation and security
- ✅ API endpoint authorization
- ✅ Data scoping verification
- ✅ Permission matrix validation

**Usage:**
```bash
node scripts/test-scripts/test-authentication.js
```

**What it tests:**
- User authentication for all roles
- Permission validation for plan operations
- API access control and authorization
- Token security and validation
- Data access scoping by role
- Role-based permission matrix

**Test Scenarios:**
- ✅ Admin can access all merchants and plans
- ✅ Merchant can only access their own data
- ✅ Outlet admin has limited access
- ✅ Invalid tokens are properly rejected
- ✅ Protected endpoints require authentication
- ✅ Data scoping works correctly

---

### 2. **test-ready-to-deliver.js** ✅
**Purpose:** Tests the `isReadyToDeliver` field functionality for orders

**Features:**
- ✅ Field existence validation
- ✅ Order creation with the field
- ✅ Field update functionality
- ✅ Filtering by ready status
- ✅ Composite index performance testing
- ✅ Integration with existing order system

**Usage:**
```bash
node scripts/test-scripts/test-ready-to-deliver.js
```

**What it tests:**
- Database field accessibility
- Order creation and updates
- Query performance with indexes
- Field integration with order workflow

---

### 3. **test-expired-merchant-access.js** 🆕
**Purpose:** Tests that expired merchants cannot access APIs except extension APIs

**Features:**
- ✅ Expired merchant creation and setup
- ✅ API access blocking for expired merchants
- ✅ Extension API access validation
- ✅ Admin access to expired merchants
- ✅ Subscription status verification
- ✅ Security enforcement testing

**Usage:**
```bash
node scripts/test-scripts/test-expired-merchant-access.js
```

**What it tests:**
- Expired merchants are blocked from most APIs
- Only extension APIs are allowed for expired merchants
- Admin can still access expired merchant details
- Subscription status is properly tracked
- Security measures work correctly

**Test Scenarios:**
- ✅ Expired merchant cannot access merchant APIs
- ✅ Expired merchant cannot access outlet APIs
- ✅ Expired merchant cannot access product APIs
- ✅ Expired merchant cannot access order APIs
- ✅ Expired merchant cannot access customer APIs
- ✅ Expired merchant cannot access user APIs
- ✅ Expired merchant cannot access analytics APIs
- ✅ Expired merchant cannot access payment APIs
- ✅ Expired merchant cannot access plan change APIs
- ✅ Expired merchant can only access extension APIs
- ✅ Admin can access expired merchant details

---

### 5. **test-plan-change.js** 🆕
**Purpose:** Tests plan change functionality with correct plan validation and date calculations

**Features:**
- ✅ Plan availability validation
- ✅ Resource limit checking (outlets, users, products)
- ✅ Proration calculations
- ✅ Date period calculations
- ✅ Plan change validation
- ✅ API payload structure testing
- ✅ Plan change history tracking

**Usage:**
```bash
node scripts/test-scripts/test-plan-change.js
```

**What it tests:**
- Plan change requirements validation
- Resource limit enforcement
- Price difference calculations
- Subscription period updates
- Plan change API structure
- Historical plan changes

**Test Scenarios:**
- ✅ Valid plan changes
- ✅ Resource limit violations
- ✅ Proration calculations
- ✅ Date period calculations
- ✅ Plan validation logic

---

### 6. **test-subscription-extension.js** 🆕
**Purpose:** Tests subscription extension functionality with expiration alerts

**Features:**
- ✅ Subscription expiration detection
- ✅ Multi-level alert system (Critical, High, Medium)
- ✅ Extension period calculations
- ✅ Extension validation
- ✅ Bulk alert processing
- ✅ Extension history tracking
- ✅ API payload structure testing

**Usage:**
```bash
node scripts/test-scripts/test-subscription-extension.js
```

**What it tests:**
- Subscription expiration status
- Alert generation and severity levels
- Extension period calculations
- Extension validation logic
- Bulk alert processing
- Extension history management

**Alert Levels:**
- 🔴 **CRITICAL**: Expired or expiring today
- 🟠 **HIGH**: Expiring in 3 days
- 🟡 **MEDIUM**: Expiring in 7 days

**Test Scenarios:**
- ✅ Expired subscription detection
- ✅ Expiration alert generation
- ✅ Extension period calculations
- ✅ Extension validation
- ✅ Bulk alert processing

---

## 🚀 Quick Start

### Prerequisites
1. **Database Setup**: Ensure your database is seeded with test data
2. **API Server**: Make sure the API server is running (for API tests)
3. **Dependencies**: All required packages should be installed

### 4. **test-exact-dates.js** 🆕
**Purpose:** Tests plan changes and subscription extensions with specific exact dates

**Features:**
- ✅ Plan changes with exact start/end dates
- ✅ Subscription extensions with exact dates
- ✅ Date precision validation
- ✅ Billing duration calculations
- ✅ Leap year handling
- ✅ Timezone handling
- ✅ Merchant detail validation with exact dates

**Usage:**
```bash
node scripts/test-scripts/test-exact-dates.js
```

**What it tests:**
- Plan changes with specific dates (2025-09-07 to 2025-12-07)
- Subscription extensions with exact dates
- Date calculation accuracy
- Merchant detail updates with exact timestamps
- Billing cycle date calculations

**Test Scenarios:**
- ✅ Plan change with exact dates (2025-09-15T00:00:00Z to 2025-12-15T23:59:59Z)
- ✅ Extension with exact dates (2025-10-08T00:00:00Z to 2025-11-08T23:59:59Z)
- ✅ Monthly billing dates (2025-09-07 to 2025-10-07)
- ✅ Quarterly billing dates (2025-09-07 to 2025-12-07)
- ✅ Yearly billing dates (2025-09-07 to 2026-09-07)
- ✅ Leap year date calculations (2024-02-29)

---

### 5. **test-proration.js** 🆕
**Purpose:** Tests proration calculations for plan changes and subscription extensions

**Features:**
- ✅ Proration calculation for mid-cycle plan changes
- ✅ Upgrade/downgrade proration detection
- ✅ Extension proration calculations
- ✅ Billing cycle proration handling
- ✅ Exact date proration testing
- ✅ Leap year proration calculations
- ✅ Daily rate calculations
- ✅ Net proration calculations

**Usage:**
```bash
node scripts/test-scripts/test-proration.js
```

**What it tests:**
- Proration calculations for different scenarios
- Upgrade vs downgrade detection
- Extension cost calculations
- Billing cycle calculations
- Exact date proration accuracy
- Leap year proration handling

**Test Scenarios:**
- ✅ Mid-cycle change (50% remaining)
- ✅ Early change (75% remaining)
- ✅ Late change (25% remaining)
- ✅ 1 month extension proration
- ✅ 3 month extension proration
- ✅ Quarterly extension proration
- ✅ Yearly extension proration
- ✅ Exact date proration (2025-09-07 to 2025-09-22)
- ✅ Leap year proration (2024-02-29)

---

## 🚀 Running All Tests
```bash
# Run all test scripts
node scripts/test-scripts/test-ready-to-deliver.js
node scripts/test-scripts/test-plan-change.js
node scripts/test-scripts/test-subscription-extension.js
```

### Running Individual Tests
```bash
# Test order delivery functionality
node scripts/test-scripts/test-ready-to-deliver.js

# Test plan change functionality
node scripts/test-scripts/test-plan-change.js

# Test subscription extension functionality
node scripts/test-scripts/test-subscription-extension.js
```

---

## 📊 Test Coverage

### Database Functionality
- ✅ Field existence and accessibility
- ✅ Data creation and updates
- ✅ Query performance with indexes
- ✅ Data validation and constraints
- ✅ Relationship integrity

### Business Logic
- ✅ Plan change validation
- ✅ Resource limit enforcement
- ✅ Subscription expiration detection
- ✅ Proration calculations
- ✅ Date period calculations

### API Integration
- ✅ API payload structure
- ✅ Request/response validation
- ✅ Error handling
- ✅ Authentication requirements

### Alert System
- ✅ Multi-level alert generation
- ✅ Expiration detection
- ✅ Bulk alert processing
- ✅ Alert severity classification

---

## 🔧 Test Data Requirements

### For Plan Change Tests
- At least 2 active plans in the database
- Merchants with active subscriptions
- Merchants with outlets, users, and products

### For Subscription Extension Tests
- Merchants with active subscriptions
- Subscriptions with various expiration dates
- Plan data with billing cycles

### For Ready-to-Deliver Tests
- Orders in the database
- Products and outlets
- Order status variations

---

## 📋 Test Results Interpretation

### ✅ Success Indicators
- All validation checks pass
- Calculations are accurate
- API payloads are correctly structured
- Database operations complete successfully
- Alerts are generated appropriately

### ❌ Failure Indicators
- Validation errors
- Calculation inaccuracies
- Database connection issues
- Missing required data
- API structure problems

### ⚠️ Warning Indicators
- Resource limit violations
- Data inconsistencies
- Performance issues
- Missing optional data

---

## 🛠️ Troubleshooting

### Common Issues

#### 1. **Database Connection Errors**
```bash
# Check database connection
npx prisma db push

# Verify database URL
echo $DATABASE_URL
```

#### 2. **Missing Test Data**
```bash
# Seed the database with test data
node scripts/seed-modern-subscriptions.js
node scripts/regenerate-entire-system-2025.js
```

#### 3. **API Server Not Running**
```bash
# Start the API server
cd apps/api
npm run dev
# or
yarn dev
```

#### 4. **Permission Errors**
```bash
# Make scripts executable
chmod +x scripts/test-scripts/*.js
```

### Debug Mode
Add `console.log` statements or use Node.js debugger:
```bash
node --inspect scripts/test-scripts/test-plan-change.js
```

---

## 📈 Performance Testing

### Database Performance
- Index usage validation
- Query execution time measurement
- Large dataset handling
- Concurrent operation testing

### API Performance
- Response time measurement
- Payload size validation
- Error handling performance
- Authentication overhead

---

## 🔄 Continuous Integration

### Automated Testing
These scripts can be integrated into CI/CD pipelines:

```bash
# Example CI script
#!/bin/bash
set -e

echo "Running database tests..."
node scripts/test-scripts/test-ready-to-deliver.js
node scripts/test-scripts/test-plan-change.js
node scripts/test-scripts/test-subscription-extension.js

echo "All tests passed! ✅"
```

### Test Reporting
Scripts output structured results that can be parsed for reporting:
- Success/failure counts
- Performance metrics
- Error details
- Warning summaries

---

## 📚 Additional Resources

### Related Documentation
- [Database Setup Guide](../../DATABASE_SETUP.md)
- [API Documentation](../../API_REVIEW.md)
- [Subscription Management Guide](../../SUBSCRIPTION_MANAGEMENT_GUIDE.md)

### Database Schema
- [Prisma Schema](../../prisma/schema.prisma)
- [Database Migrations](../../prisma/migrations/)

### API Endpoints
- [Plan API](../../apps/api/app/api/plans/)
- [Merchant API](../../apps/api/app/api/merchants/)
- [Subscription API](../../apps/api/app/api/subscriptions/)

---

## 🤝 Contributing

### Adding New Tests
1. Create new test file in this directory
2. Follow naming convention: `test-{functionality}.js`
3. Include comprehensive error handling
4. Add documentation to this README
5. Test with various data scenarios

### Test Standards
- ✅ Comprehensive error handling
- ✅ Clear success/failure indicators
- ✅ Detailed logging and output
- ✅ Proper cleanup of test data
- ✅ Performance measurement
- ✅ Documentation and comments

---

## 📞 Support

If you encounter issues with the test scripts:

1. **Check the console output** for specific error messages
2. **Verify database connectivity** and permissions
3. **Ensure test data is available** in the database
4. **Check API server status** for API-related tests
5. **Review the troubleshooting section** above

For additional help, refer to the main project documentation or create an issue in the project repository.

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Maintainer:** Rental Shop Development Team
