# 🔍 Comprehensive Audit Logging Implementation Guide

## Overview

This guide explains how to implement comprehensive audit logging across your rental shop system to track all changes, user actions, and system events.

## 🎯 Why Audit Logging is Important

- **Compliance**: Meet regulatory requirements for data tracking
- **Security**: Detect unauthorized access and changes
- **Debugging**: Track down issues and understand system behavior
- **Accountability**: Know who made what changes and when
- **Business Intelligence**: Understand user behavior and system usage

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Routes    │    │   Database      │
│   (User Action) │───▶│   (Audit Log)   │───▶│   (AuditLog)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Audit Viewer   │
                       │  (Admin Panel)  │
                       └─────────────────┘
```

## 📋 Implementation Levels

### Level 1: Manual API Route Logging (Current Implementation)
- ✅ **Pros**: Full control, specific to business logic
- ❌ **Cons**: Must be implemented in each route, easy to forget

### Level 2: Database Middleware (Recommended)
- ✅ **Pros**: Automatic, comprehensive, no missed events
- ❌ **Cons**: More complex setup, captures everything

### Level 3: Hybrid Approach (Best Practice)
- ✅ **Pros**: Automatic + manual control, comprehensive coverage
- ❌ **Cons**: Requires careful configuration

## 🚀 Quick Start: Manual Implementation

### Step 1: Add Audit Logging to Any API Route

```typescript
// In your API route (e.g., apps/api/app/api/customers/route.ts)
import { createAuditHelper } from '@rentalshop/utils';
import { captureAuditContext } from '@rentalshop/middleware';

export async function PUT(request: NextRequest) {
  try {
    // 1. Capture request context
    const auditContext = await captureAuditContext(request);
    
    // 2. Your existing business logic
    const user = await verifyTokenSimple(token);
    const existingCustomer = await getCustomerByPublicId(customerId);
    const updatedCustomer = await updateCustomer(customerId, updateData);
    
    // 3. Log the audit event
    const auditHelper = createAuditHelper(prisma);
    await auditHelper.logUpdate({
      entityType: 'Customer',
      entityId: updatedCustomer.id.toString(),
      entityName: `${updatedCustomer.firstName} ${updatedCustomer.lastName}`,
      oldValues: existingCustomer,
      newValues: updatedCustomer,
      description: `Customer updated: ${updatedCustomer.firstName} ${updatedCustomer.lastName}`,
      context: {
        ...auditContext,
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        merchantId: user.merchantId,
        outletId: user.outletId
      }
    });
    
    return NextResponse.json({ success: true, data: updatedCustomer });
  } catch (error) {
    // Handle errors
  }
}
```

### Step 2: Test the Implementation

1. **Update a customer** through your admin panel
2. **Check the audit logs** at `http://localhost:3001/system/audit-logs`
3. **Verify the log entry** shows the change details

## 🔧 Advanced Implementation: Database Middleware

### Step 1: Replace Prisma Client

```typescript
// In your API routes, replace:
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// With:
import { auditablePrisma } from '@rentalshop/database';
const prisma = auditablePrisma;
```

### Step 2: Automatic Logging

With database middleware, all database operations are automatically logged:

```typescript
// This will automatically create an audit log
const customer = await prisma.customer.update({
  where: { id: customerId },
  data: { firstName: 'New Name' }
});
```

## 📊 What Gets Logged

### Standard Fields
- **Who**: User ID, email, role
- **What**: Entity type, ID, name, changes
- **When**: Timestamp
- **Where**: IP address, user agent, session
- **Why**: Description, business context

### Change Tracking
- **Old Values**: Complete state before change
- **New Values**: Complete state after change
- **Changes**: Field-by-field comparison
- **Metadata**: Additional context

### Example Audit Log Entry

```json
{
  "id": 123,
  "action": "UPDATE",
  "entityType": "Customer",
  "entityId": "456",
  "entityName": "John Doe",
  "user": {
    "id": 789,
    "email": "admin@rentalshop.com",
    "name": "Admin User",
    "role": "ADMIN"
  },
  "oldValues": {
    "firstName": "John",
    "lastName": "Smith",
    "phone": "123-456-7890"
  },
  "newValues": {
    "firstName": "John",
    "lastName": "Doe",
    "phone": "123-456-7890"
  },
  "changes": {
    "lastName": {
      "old": "Smith",
      "new": "Doe"
    }
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "severity": "INFO",
  "category": "BUSINESS",
  "description": "Customer updated: John Doe",
  "createdAt": "2025-01-03T10:30:00Z"
}
```

## 🎛️ Configuration Options

### Severity Levels
- **INFO**: Normal business operations
- **WARNING**: Potentially concerning actions
- **ERROR**: Failed operations
- **CRITICAL**: Security or system issues

### Categories
- **GENERAL**: General system events
- **SECURITY**: Authentication, authorization
- **BUSINESS**: Customer, order, product changes
- **SYSTEM**: System configuration, maintenance
- **COMPLIANCE**: Regulatory, legal requirements

## 🔍 Viewing Audit Logs

### Admin Panel
- Navigate to `http://localhost:3001/system/audit-logs`
- Filter by date, user, entity type, action
- View detailed change information
- Export logs for compliance

### API Access
```typescript
// Get audit logs
const logs = await getAuditLogs({
  entityType: 'Customer',
  action: 'UPDATE',
  startDate: '2025-01-01',
  endDate: '2025-01-31'
});

// Get audit statistics
const stats = await getAuditLogStats({
  category: 'BUSINESS',
  startDate: '2025-01-01'
});
```

## 🚨 Best Practices

### 1. Don't Log Sensitive Data
```typescript
// ❌ Bad: Logging passwords
newValues: { password: 'secret123' }

// ✅ Good: Sanitize sensitive data
newValues: { password: '[REDACTED]' }
```

### 2. Use Meaningful Descriptions
```typescript
// ❌ Bad: Generic description
description: 'Updated'

// ✅ Good: Specific description
description: 'Customer name changed from John Smith to John Doe'
```

### 3. Handle Audit Failures Gracefully
```typescript
try {
  await auditHelper.logUpdate({...});
} catch (auditError) {
  console.error('Audit logging failed:', auditError);
  // Don't fail the main operation
}
```

### 4. Set Appropriate Severity Levels
```typescript
// Customer name change: INFO
severity: 'INFO'

// User role change: WARNING
severity: 'WARNING'

// Failed login attempts: ERROR
severity: 'ERROR'

// System compromise: CRITICAL
severity: 'CRITICAL'
```

## 📈 Performance Considerations

### 1. Async Logging
- Audit logging should not block main operations
- Use try-catch to prevent audit failures from affecting business logic

### 2. Batch Operations
- For bulk operations, consider batching audit logs
- Use database transactions to ensure consistency

### 3. Log Retention
- Implement log rotation and archival
- Consider data retention policies

## 🔧 Troubleshooting

### Common Issues

1. **No audit logs appearing**
   - Check if audit logging is implemented in the API route
   - Verify the audit context is being captured
   - Check database connection

2. **Missing user information**
   - Ensure authentication token is valid
   - Verify user context extraction

3. **Performance issues**
   - Check if audit logging is blocking operations
   - Consider async logging implementation

### Debug Commands

```bash
# Check audit logs in database
yarn db:studio

# View recent audit logs
SELECT * FROM AuditLog ORDER BY createdAt DESC LIMIT 10;

# Check audit log statistics
SELECT action, COUNT(*) FROM AuditLog GROUP BY action;
```

## 🎯 Next Steps

1. **Implement audit logging** in customer update route (✅ Done)
2. **Add to other entities**: Products, Orders, Users, etc.
3. **Set up database middleware** for automatic logging
4. **Configure log retention** and archival
5. **Set up alerts** for critical events
6. **Create audit reports** for compliance

## 📚 Additional Resources

- [Audit Logging Best Practices](https://docs.example.com/audit-best-practices)
- [Compliance Requirements](https://docs.example.com/compliance)
- [Security Guidelines](https://docs.example.com/security)

---

**Remember**: Audit logging is not just about compliance—it's about understanding your system, debugging issues, and maintaining accountability. Start with the manual approach and gradually move to automatic logging as your system grows.
