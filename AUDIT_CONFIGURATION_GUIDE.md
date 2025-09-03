# 🔧 Audit Logging Configuration Guide

## Environment Variables

Add these to your `.env` file to configure audit logging:

```bash
# Global audit logging settings
AUDIT_LOGGING_ENABLED=true
AUDIT_RETENTION_DAYS=90
AUDIT_MAX_LOG_SIZE=1048576
AUDIT_SAMPLING_RATE=1.0

# Entity-specific settings (comma-separated)
AUDIT_ENTITIES=Customer,Order,User,Payment,Product,Settings,Export,Merchant

# Performance settings
AUDIT_ASYNC=true
AUDIT_MAX_LOG_TIME=100

# Feature flags
FEATURE_CUSTOMER_AUDIT=true
FEATURE_ORDER_AUDIT=true
FEATURE_USER_AUDIT=true
FEATURE_PRODUCT_AUDIT=true
FEATURE_SETTINGS_AUDIT=true

# Log levels
AUDIT_LOG_LEVEL=INFO
AUDIT_CONSOLE_LOGGING=false

# Storage settings
AUDIT_STORAGE_TYPE=database
AUDIT_ARCHIVE_ENABLED=true
AUDIT_ARCHIVE_AFTER_DAYS=30

# Security settings
AUDIT_SANITIZE_SENSITIVE=true
AUDIT_REDACT_PII=true
```

## Configuration Options

### Global Settings
- `AUDIT_LOGGING_ENABLED`: Enable/disable audit logging globally
- `AUDIT_RETENTION_DAYS`: How long to keep audit logs (default: 90 days)
- `AUDIT_MAX_LOG_SIZE`: Maximum size of individual audit log entry (default: 1MB)
- `AUDIT_SAMPLING_RATE`: Sampling rate for high-volume operations (0.0 to 1.0)

### Entity Configuration
- `AUDIT_ENTITIES`: Comma-separated list of entities to audit
- Individual feature flags for each entity type

### Performance Settings
- `AUDIT_ASYNC`: Use async logging to avoid blocking operations
- `AUDIT_MAX_LOG_TIME`: Maximum time to spend on audit logging (ms)

## Tier Configuration

### Tier 1: Critical Operations (Always Log)
```typescript
// These are always logged when enabled
const tier1Entities = [
  'Customer',    // ✅ Business critical
  'Order',       // ✅ Business critical  
  'User',        // ✅ Security critical
  'Payment'      // ✅ Compliance critical
];
```

### Tier 2: Important Operations (Selective Logging)
```typescript
// These are logged with filtering
const tier2Entities = [
  'Product',     // ⚠️ Log significant changes only
  'Settings',    // ⚠️ Log system changes
  'Export',      // ⚠️ Log all exports
  'Merchant'     // ⚠️ Log business changes
];
```

### Tier 3: Low-Value Operations (Skip or Sample)
```typescript
// These are skipped or sampled
const tier3Entities = [
  'AuditLog',    // ❌ Don't log audit logs
  'Session',     // ❌ Sample only
  'View',        // ❌ Sample only
  'HealthCheck'  // ❌ Skip entirely
];
```

## Usage Examples

### Basic Usage
```typescript
import { createAuditHelper } from '@rentalshop/utils';

const auditHelper = createAuditHelper(prisma);

// This will automatically apply selective logging rules
await auditHelper.logUpdate({
  entityType: 'Customer',
  entityId: customer.id.toString(),
  entityName: `${customer.firstName} ${customer.lastName}`,
  oldValues: existingCustomer,
  newValues: updatedCustomer,
  context: auditContext
});
```

### Advanced Configuration
```typescript
import { getAuditConfig, shouldLogEntity } from '@rentalshop/utils';

// Check if entity should be logged
if (shouldLogEntity('Customer', 'UPDATE')) {
  // Log the operation
}

// Get current configuration
const config = getAuditConfig();
console.log('Audit config:', config);
```

## Performance Monitoring

### Check Performance Metrics
```typescript
import { auditPerformanceMonitor } from '@rentalshop/utils';

// Get current performance metrics
const metrics = auditPerformanceMonitor.getMetrics();
console.log('Audit performance:', metrics);

// Check if performance is healthy
if (!metrics.performance.isHealthy) {
  console.warn('Audit logging performance is degraded');
}
```

### Performance Thresholds
- **Average Time**: < 100ms (healthy)
- **Max Time**: < 500ms (acceptable)
- **Failure Rate**: < 5% (healthy)
- **Total Logs**: Monitor growth

## Security Configuration

### Sensitive Data Handling
```typescript
// Sensitive fields are automatically redacted
const sensitiveFields = {
  'Customer': ['email', 'phone', 'idNumber'],
  'User': ['email', 'phone', 'password'],
  'Payment': ['cardNumber', 'cvv', 'token']
};
```

### PII Redaction
```typescript
// Email: jo**@ex****.com
// Phone: 12**-***-7890
// ID Number: 12****7890
```

## Troubleshooting

### Common Issues

1. **No audit logs appearing**
   ```bash
   # Check if audit logging is enabled
   echo $AUDIT_LOGGING_ENABLED
   
   # Check entity configuration
   echo $AUDIT_ENTITIES
   ```

2. **Performance issues**
   ```typescript
   // Check performance metrics
   const metrics = auditPerformanceMonitor.getMetrics();
   console.log('Performance:', metrics.performance);
   ```

3. **Storage growth**
   ```sql
   -- Check audit log table size
   SELECT COUNT(*) FROM AuditLog;
   SELECT MAX(createdAt) FROM AuditLog;
   ```

### Debug Mode
```bash
# Enable debug logging
AUDIT_CONSOLE_LOGGING=true
AUDIT_LOG_LEVEL=DEBUG
```

## Best Practices

1. **Start with Tier 1 entities** (Customer, Order, User, Payment)
2. **Monitor performance** after implementation
3. **Use async logging** to avoid blocking operations
4. **Set up retention policies** to manage storage
5. **Review logs regularly** for security and compliance
6. **Test in development** before production deployment

## Migration Guide

### From Manual to Selective Logging

1. **Update imports**:
   ```typescript
   // Old
   import { AuditLogger } from '@rentalshop/database';
   
   // New
   import { createAuditHelper } from '@rentalshop/utils';
   ```

2. **Update usage**:
   ```typescript
   // Old
   const auditLogger = new AuditLogger(prisma);
   await auditLogger.logUpdate({...});
   
   // New
   const auditHelper = createAuditHelper(prisma);
   await auditHelper.logUpdate({...});
   ```

3. **Remove manual configuration**:
   ```typescript
   // Old - manual configuration
   severity: 'INFO',
   category: 'BUSINESS',
   
   // New - automatic configuration
   // Severity and category are set automatically based on entity type
   ```

The selective audit logging system will automatically handle:
- ✅ Entity filtering
- ✅ Field sanitization
- ✅ Performance monitoring
- ✅ Sampling for high-volume operations
- ✅ Security and compliance requirements
