/**
 * Audit Logging Configuration
 * 
 * This module provides a configurable audit logging system with tiered approach
 * and smart filtering to optimize performance while maintaining comprehensive coverage.
 */

export interface AuditEntityConfig {
  enabled: boolean;
  logLevel: 'ALL' | 'CREATE_UPDATE_DELETE' | 'CREATE_DELETE' | 'CRITICAL_ONLY';
  fields: {
    include: string[];
    exclude: string[];
    sensitive: string[];
  };
  sampling: {
    enabled: boolean;
    rate: number; // 0.0 to 1.0
  };
  async: boolean;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  category: 'GENERAL' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' | 'COMPLIANCE';
}

export interface AuditConfig {
  global: {
    enabled: boolean;
    async: boolean;
    retentionDays: number;
    maxLogSize: number; // in bytes
  };
  entities: Record<string, AuditEntityConfig>;
  performance: {
    maxLogTime: number; // max time to spend on audit logging (ms)
    batchSize: number;
    queueSize: number;
  };
  features: {
    changeDetection: boolean;
    fieldLevelTracking: boolean;
    userContext: boolean;
    networkContext: boolean;
  };
}

// Default configuration
export const defaultAuditConfig: AuditConfig = {
  global: {
    enabled: process.env.AUDIT_LOGGING_ENABLED === 'true' || 
             process.env.NODE_ENV === 'production' || 
             process.env.NODE_ENV === 'development' || 
             process.env.NODE_ENV === undefined, // Enable by default in development
    async: true,
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '90'),
    maxLogSize: parseInt(process.env.AUDIT_MAX_LOG_SIZE || '1048576') // 1MB
  },
  entities: {
    // Tier 1: Critical Business Operations (Always Log)
    Customer: {
      enabled: true,
      logLevel: 'ALL',
      fields: {
        include: ['*'], // All fields
        exclude: ['password', 'token', 'secret'],
        sensitive: ['email', 'phone', 'idNumber']
      },
      sampling: { enabled: false, rate: 1.0 },
      async: true,
      severity: 'INFO',
      category: 'BUSINESS'
    },
    Order: {
      enabled: true,
      logLevel: 'ALL',
      fields: {
        include: ['*'],
        exclude: ['paymentToken', 'cardNumber'],
        sensitive: ['customerId', 'totalAmount']
      },
      sampling: { enabled: false, rate: 1.0 },
      async: true,
      severity: 'INFO',
      category: 'BUSINESS'
    },
    User: {
      enabled: true,
      logLevel: 'ALL',
      fields: {
        include: ['*'],
        exclude: ['password', 'passwordHash', 'token'],
        sensitive: ['email', 'phone']
      },
      sampling: { enabled: false, rate: 1.0 },
      async: true,
      severity: 'WARNING',
      category: 'SECURITY'
    },
    Payment: {
      enabled: true,
      logLevel: 'ALL',
      fields: {
        include: ['*'],
        exclude: ['cardNumber', 'cvv', 'token'],
        sensitive: ['amount', 'customerId']
      },
      sampling: { enabled: false, rate: 1.0 },
      async: true,
      severity: 'WARNING',
      category: 'BUSINESS'
    },

    // Tier 2: Important Operations (Selective Logging)
    Product: {
      enabled: true,
      logLevel: 'CREATE_UPDATE_DELETE',
      fields: {
        include: ['name', 'price', 'stock', 'category', 'isActive'],
        exclude: ['description', 'images'],
        sensitive: ['cost', 'margin']
      },
      sampling: { enabled: false, rate: 1.0 },
      async: true,
      severity: 'INFO',
      category: 'BUSINESS'
    },
    Settings: {
      enabled: true,
      logLevel: 'CREATE_UPDATE_DELETE',
      fields: {
        include: ['*'],
        exclude: ['apiKey', 'secret', 'password'],
        sensitive: ['value']
      },
      sampling: { enabled: false, rate: 1.0 },
      async: true,
      severity: 'WARNING',
      category: 'SYSTEM'
    },
    Export: {
      enabled: true,
      logLevel: 'ALL',
      fields: {
        include: ['*'],
        exclude: ['data', 'content'],
        sensitive: ['userId', 'filters']
      },
      sampling: { enabled: false, rate: 1.0 },
      async: true,
      severity: 'INFO',
      category: 'BUSINESS'
    },
    Merchant: {
      enabled: true,
      logLevel: 'CREATE_UPDATE_DELETE',
      fields: {
        include: ['name', 'status', 'plan', 'settings'],
        exclude: ['apiKey', 'webhookSecret'],
        sensitive: ['email', 'phone']
      },
      sampling: { enabled: false, rate: 1.0 },
      async: true,
      severity: 'WARNING',
      category: 'BUSINESS'
    },

    // Tier 3: Low-Value Operations (Skip or Sample)
    AuditLog: {
      enabled: false, // Don't log audit logs
      logLevel: 'CRITICAL_ONLY',
      fields: { include: [], exclude: ['*'], sensitive: [] },
      sampling: { enabled: true, rate: 0.01 },
      async: true,
      severity: 'INFO',
      category: 'SYSTEM'
    },
    Session: {
      enabled: false,
      logLevel: 'CRITICAL_ONLY',
      fields: { include: [], exclude: ['*'], sensitive: [] },
      sampling: { enabled: true, rate: 0.05 },
      async: true,
      severity: 'INFO',
      category: 'SECURITY'
    }
  },
  performance: {
    maxLogTime: 100, // 100ms max
    batchSize: 50,
    queueSize: 1000
  },
  features: {
    changeDetection: true,
    fieldLevelTracking: true,
    userContext: true,
    networkContext: true
  }
};

// Environment-based configuration override
export function getAuditConfig(): AuditConfig {
  const config = { ...defaultAuditConfig };

  // Override from environment variables
  if (process.env.AUDIT_ENTITIES) {
    const enabledEntities = process.env.AUDIT_ENTITIES.split(',');
    Object.keys(config.entities).forEach(entity => {
      config.entities[entity].enabled = enabledEntities.includes(entity);
    });
  }

  if (process.env.AUDIT_SAMPLING_RATE) {
    const samplingRate = parseFloat(process.env.AUDIT_SAMPLING_RATE);
    Object.keys(config.entities).forEach(entity => {
      config.entities[entity].sampling.rate = samplingRate;
    });
  }

  return config;
}

// Check if entity should be logged
export function shouldLogEntity(entityType: string, action: string): boolean {
  const config = getAuditConfig();
  
  console.log('🔍 shouldLogEntity check:', {
    entityType,
    action,
    globalEnabled: config.global.enabled,
    entityConfig: config.entities[entityType]
  });
  
  if (!config.global.enabled) {
    console.log('❌ Global audit logging is disabled');
    return false;
  }
  
  const entityConfig = config.entities[entityType];
  if (!entityConfig || !entityConfig.enabled) {
    console.log('❌ Entity not configured or disabled:', entityType);
    return false;
  }

  // Check log level
  switch (entityConfig.logLevel) {
    case 'ALL':
      return true;
    case 'CREATE_UPDATE_DELETE':
      return ['CREATE', 'UPDATE', 'DELETE'].includes(action);
    case 'CREATE_DELETE':
      return ['CREATE', 'DELETE'].includes(action);
    case 'CRITICAL_ONLY':
      return ['DELETE', 'LOGIN', 'LOGOUT'].includes(action);
    default:
      return false;
  }
}

// Check if field should be logged
export function shouldLogField(entityType: string, fieldName: string): boolean {
  const config = getAuditConfig();
  const entityConfig = config.entities[entityType];
  
  if (!entityConfig) return false;

  const { include, exclude } = entityConfig.fields;
  
  // Check exclude list first
  if (exclude.includes('*') || exclude.includes(fieldName)) return false;
  
  // Check include list
  if (include.includes('*')) return true;
  if (include.includes(fieldName)) return true;
  
  return false;
}

// Check if sampling should be applied
export function shouldSample(entityType: string): boolean {
  const config = getAuditConfig();
  const entityConfig = config.entities[entityType];
  
  if (!entityConfig || !entityConfig.sampling.enabled) return false;
  
  return Math.random() < entityConfig.sampling.rate;
}

// Get entity configuration
export function getAuditEntityConfig(entityType: string): AuditEntityConfig | null {
  const config = getAuditConfig();
  return config.entities[entityType] || null;
}

// Sanitize sensitive data
export function sanitizeFieldValue(entityType: string, fieldName: string, value: any): any {
  const config = getAuditConfig();
  const entityConfig = config.entities[entityType];
  
  if (!entityConfig) return value;
  
  if (entityConfig.fields.sensitive.includes(fieldName)) {
    if (typeof value === 'string' && value.length > 4) {
      return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
    }
    return '[REDACTED]';
  }
  
  return value;
}

// Performance monitoring
export class AuditPerformanceMonitor {
  private metrics = {
    totalLogs: 0,
    failedLogs: 0,
    totalTime: 0,
    averageTime: 0,
    maxTime: 0
  };

  startTimer(): () => number {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.updateMetrics(duration);
      return duration;
    };
  }

  private updateMetrics(duration: number) {
    this.metrics.totalLogs++;
    this.metrics.totalTime += duration;
    this.metrics.averageTime = this.metrics.totalTime / this.metrics.totalLogs;
    this.metrics.maxTime = Math.max(this.metrics.maxTime, duration);
  }

  recordFailure() {
    this.metrics.failedLogs++;
  }

  getMetrics() {
    return {
      ...this.metrics,
      failureRate: this.metrics.failedLogs / this.metrics.totalLogs,
      performance: {
        averageTime: this.metrics.averageTime,
        maxTime: this.metrics.maxTime,
        isHealthy: this.metrics.averageTime < 100 // 100ms threshold
      }
    };
  }

  reset() {
    this.metrics = {
      totalLogs: 0,
      failedLogs: 0,
      totalTime: 0,
      averageTime: 0,
      maxTime: 0
    };
  }
}

// Global performance monitor
export const auditPerformanceMonitor = new AuditPerformanceMonitor();
