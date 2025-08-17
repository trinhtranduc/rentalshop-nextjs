# Customer API Troubleshooting Guide

## 🚨 Common Issues and Solutions

### 1. 400 Bad Request Error

**Problem**: You're getting a 400 Bad Request error when trying to create a customer.

**Possible Causes**:
- Missing required fields
- Invalid data format
- Validation errors
- Database constraints

**Solutions**:

#### Step 1: Check Required Fields
Make sure your request includes ALL required fields:
```json
{
  "firstName": "John",           // ✅ Required
  "lastName": "Doe",            // ✅ Required  
  "email": "john@example.com",  // ✅ Required
  "phone": "+1234567890",       // ✅ Required
  "merchantId": "merchant_123"  // ✅ Required
}
```

#### Step 2: Use Test Endpoints
Test your payload with the validation endpoints first:

```bash
# Test validation (doesn't create customer)
POST /api/customers/test

# Debug payload (detailed analysis)
POST /api/customers/debug
```

#### Step 3: Check Data Types
- `firstName`, `lastName`: Must be non-empty strings
- `email`: Must be valid email format
- `phone`: Must be at least 8 characters, only numbers, +, -, spaces, parentheses
- `merchantId`: Must be a valid merchant ID that exists in the database
- `idType`: Must be one of: `passport`, `drivers_license`, `national_id`, `other`

### 2. Merchant ID Issues

**Problem**: "Merchant not found" error

**Solution**: 
- Verify the merchant ID exists in your database
- Check if you're using the correct merchant ID format
- Ensure the merchant is active

### 3. Database Connection Issues

**Problem**: Database connection errors

**Solution**:
- Check if your database is running
- Verify database connection string
- Check database migrations are up to date

## 🧪 Testing Steps

### Step 1: Test Validation
```bash
curl -X POST http://localhost:3000/api/customers/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john@example.com",
    "phone": "+1234567890",
    "merchantId": "your_merchant_id"
  }'
```

### Step 2: Test Debug
```bash
curl -X POST http://localhost:3000/api/customers/debug \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com", 
    "phone": "+1234567890",
    "merchantId": "your_merchant_id"
  }'
```

### Step 3: Test Creation
```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890", 
    "merchantId": "your_merchant_id"
  }'
```

## 🔍 Debug Tools

### 1. Test Page
Visit: `http://localhost:3000/api/customers/test-page`

This interactive page helps you:
- Test different payloads
- See detailed validation errors
- Debug API responses

### 2. Test Script
Run the test script:
```bash
# Set your JWT token
export JWT_TOKEN="your_jwt_token_here"

# Run the test
node scripts/test-customer-api.js
```

### 3. API Documentation
Visit: `http://localhost:3000/api/customers/docs`

Complete API documentation with examples.

## 📋 Sample Working Payload

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "merchantId": "clx1234567890abcdef",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "USA",
  "idType": "passport",
  "idNumber": "AB123456",
  "notes": "Test customer"
}
```

## 🚨 Error Messages Explained

### "Missing required fields"
- Check that all required fields are present
- Ensure no fields are empty strings

### "Invalid email address"
- Email must be in valid format (user@domain.com)
- Check for typos or extra spaces

### "Phone number contains invalid characters"
- Only allow: numbers, +, -, spaces, parentheses
- Must be at least 8 characters

### "Merchant is required"
- Include merchantId in your request
- Ensure it's not null or empty

### "Merchant with ID X not found"
- Verify the merchant ID exists in your database
- Check if you're using the correct ID format

## 🔧 Quick Fixes

### Fix 1: Simplify Your Request
Start with minimal data:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "merchantId": "your_merchant_id"
}
```

### Fix 2: Check Your Token
Ensure your JWT token is:
- Valid and not expired
- Has proper permissions
- Correctly formatted in Authorization header

### Fix 3: Verify Database
- Check if database is running
- Verify migrations are applied
- Ensure merchant exists

## 📞 Getting Help

If you're still having issues:

1. **Check the logs**: Look at your API server console for detailed error messages
2. **Use test endpoints**: Test with `/api/customers/test` and `/api/customers/debug`
3. **Verify data**: Double-check all required fields and data formats
4. **Check permissions**: Ensure your user has permission to create customers

## 🎯 Next Steps

1. Try the test endpoints first
2. Use the test page for interactive debugging
3. Check the detailed error messages
4. Verify your database setup
5. Test with minimal data first

Remember: The test endpoints (`/test` and `/debug`) are safe to use and won't create actual customer records!
