# Rental Shop Test Suite

This directory contains essential tests for the Rental Shop Next.js application, focusing on subscription validation and admin extension functionality.

## Test Structure

```
tests/
├── README.md                           # This file
├── subscription-validation.test.js     # Core subscription validation tests
├── admin-extension.test.js             # Admin extension functionality tests
├── product-availability-actual.test.js # Product availability with actual functions
├── duplicate-account-actual.test.js    # Duplicate account registration tests
├── subscription-admin-actual.test.js   # Admin subscription management tests
├── setup/                              # Test setup utilities
│   └── jest.setup.js                  # Jest configuration
├── package.json                        # Test dependencies and scripts
└── tsconfig.json                       # TypeScript configuration
```

## Test Categories

### 1. Subscription Validation Tests (`subscription-validation.test.js`)
- **Core Validation Logic**: Test subscription status validation requirements
- **User Role Validation**: Test different user roles (admin, merchant, trial)
- **Error Handling**: Test proper error messages and status codes
- **Product Availability**: Test subscription-first validation approach
- **Performance Requirements**: Test efficiency and concurrency handling

### 2. Admin Extension Tests (`admin-extension.test.js`)
- **Authorization**: Test admin permissions for subscription extension
- **Extension Logic**: Test extending expired and cancelled subscriptions
- **Workflow**: Test complete extension process from request to completion
- **Error Handling**: Test invalid requests and permission checks
- **Business Rules**: Test subscription limits and multiple extensions

### 3. Product Availability Tests (`product-availability-actual.test.js`)
- **Actual Implementation**: Tests using real `calculateAvailability` and `searchProducts` functions
- **Cart Integration**: Test availability checking when adding products to cart
- **Date Range Validation**: Test availability for specific pickup/return dates
- **Conflict Detection**: Test handling of overlapping orders
- **Real-time Updates**: Test concurrent availability checks and updates

### 4. Duplicate Account Tests (`duplicate-account-actual.test.js`)
- **Actual Registration**: Tests using real `registerUser` and `registerMerchantWithTrial` functions
- **Duplicate Detection**: Test email uniqueness validation
- **Error Handling**: Test proper error messages for duplicate accounts
- **Transaction Safety**: Test database rollback on duplicate detection
- **Security**: Test input validation and SQL injection prevention

### 5. Subscription Admin Management Tests (`subscription-admin-actual.test.js`)
- **Complete Admin Functions**: Tests using actual subscription management functions
- **Lifecycle Management**: Test pause, resume, cancel, renew operations
- **Plan Changes**: Test subscription plan upgrades and downgrades
- **Access Validation**: Test subscription-based access control
- **Workflow Integration**: Test complete admin workflows and bulk operations

## Running Tests

```bash
# Run all tests
cd tests && npm test

# Run specific test category
npm run test:subscription        # Run subscription validation tests
npm run test:admin              # Run admin extension tests
npm run test:product-availability # Run product availability tests
npm run test:duplicate-account   # Run duplicate account tests
npm run test:subscription-admin  # Run subscription admin tests

# Run all actual implementation tests
npm run test:actual

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run from root directory
npm exec jest tests/
```

## Test Philosophy

These tests focus on **documenting requirements** and **validating business logic** rather than testing implementation details. They serve as:

1. **Requirements Documentation**: Clear specification of what the system should do
2. **Business Logic Validation**: Ensuring core functionality works as expected
3. **Regression Prevention**: Catching breaking changes in critical features
4. **Development Guidance**: Helping developers understand expected behavior

## Test Approach

- **Documentation-First**: Tests document requirements and expected behavior
- **Business Logic Focus**: Test core subscription and extension logic
- **Error Handling**: Ensure proper error messages and status codes
- **Performance Awareness**: Test efficiency and concurrency requirements
- **Real-World Scenarios**: Test actual use cases and edge cases

## Key Test Scenarios

### Subscription Validation
- Admin users bypass all subscription checks
- Expired subscriptions deny access with clear error messages
- Active subscriptions allow full access
- Trial subscriptions have limited access
- Proper HTTP status codes (401, 403, 404, 500)

### Admin Extension
- Only admin users can extend subscriptions
- Expired and cancelled subscriptions can be extended
- Proper extension periods (1 month, 3 months, 6 months, 1 year)
- Status updates from expired/cancelled to active
- Access restoration after extension
- Activity logging for audit trails

## Implementation Notes

These tests are designed to work with the actual implementation in:
- `@rentalshop/utils` - Subscription validation logic
- `@rentalshop/auth` - Authentication and authorization
- `@rentalshop/database` - Database operations
- `apps/api` - API endpoints and middleware

The tests document the expected behavior that should be implemented in these packages.
