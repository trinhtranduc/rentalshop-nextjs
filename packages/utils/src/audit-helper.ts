/**
 * Audit Helper Utilities
 * 
 * This module provides helper functions to make audit logging easier
 * across all API routes and database operations with selective logging.
 */

import { PrismaClient } from '@prisma/client';
import { AuditLogger } from '@rentalshop/database';
import type { AuditContext } from '@rentalshop/database';
import { 
  shouldLogEntity, 
  shouldLogField, 
  shouldSample, 
  getAuditEntityConfig,
  sanitizeFieldValue,
  auditPerformanceMonitor,
  type AuditConfig
} from './audit-config';

export interface AuditHelperContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  merchantId?: string;
  outletId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export class AuditHelper {
  private auditLogger: AuditLogger;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.auditLogger = new AuditLogger(prisma);
  }

  /**
   * Log a CREATE operation with selective logging
   */
  async logCreate(params: {
    entityType: string;
    entityId: string;
    entityName?: string;
    newValues: Record<string, any>;
    description?: string;
    context: AuditHelperContext;
    severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    category?: 'GENERAL' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' | 'COMPLIANCE';
  }) {
    // Check if we should log this entity
    if (!shouldLogEntity(params.entityType, 'CREATE')) {
      return;
    }

    // Check sampling
    if (shouldSample(params.entityType)) {
      return;
    }

    const timer = auditPerformanceMonitor.startTimer();
    
    try {
      // Sanitize and filter values
      const sanitizedValues = this.sanitizeValues(params.entityType, params.newValues);
      
      // Get entity config for default values
      const entityConfig = getAuditEntityConfig(params.entityType);
      
      await this.auditLogger.log({
        action: 'CREATE',
        entityType: params.entityType,
        entityId: params.entityId,
        entityName: params.entityName,
        newValues: sanitizedValues,
        severity: params.severity || entityConfig?.severity || 'INFO',
        category: params.category || entityConfig?.category || 'BUSINESS',
        description: params.description || `${params.entityType} created`,
        context: this.transformContext(params.context)
      });
    } catch (error) {
      console.error('Failed to log CREATE audit:', error);
      auditPerformanceMonitor.recordFailure();
    } finally {
      timer();
    }
  }

  /**
   * Log an UPDATE operation with selective logging
   */
  async logUpdate(params: {
    entityType: string;
    entityId: string;
    entityName?: string;
    oldValues: Record<string, any>;
    newValues: Record<string, any>;
    changes?: Record<string, { old: any; new: any }>;
    description?: string;
    context: AuditHelperContext;
    severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    category?: 'GENERAL' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' | 'COMPLIANCE';
  }) {
    console.log('🔍 Audit Helper - logUpdate called:', {
      entityType: params.entityType,
      entityId: params.entityId,
      shouldLog: shouldLogEntity(params.entityType, 'UPDATE'),
      shouldSample: shouldSample(params.entityType)
    });

    // Check if we should log this entity
    if (!shouldLogEntity(params.entityType, 'UPDATE')) {
      console.log('❌ Audit logging skipped: Entity not configured for logging');
      return;
    }

    // Check sampling
    if (shouldSample(params.entityType)) {
      console.log('❌ Audit logging skipped: Sampling applied');
      return;
    }

    const timer = auditPerformanceMonitor.startTimer();
    
    try {
      // Calculate changes if not provided
      const changes = params.changes || this.calculateChanges(params.oldValues, params.newValues);
      
      // Filter changes to only include significant ones
      const significantChanges = this.filterSignificantChanges(params.entityType, changes);
      
      if (Object.keys(significantChanges).length > 0) {
        // Sanitize values
        const sanitizedOldValues = this.sanitizeValues(params.entityType, params.oldValues);
        const sanitizedNewValues = this.sanitizeValues(params.entityType, params.newValues);
        
        // Get entity config for default values
        const entityConfig = getAuditEntityConfig(params.entityType);
        
        await this.auditLogger.log({
          action: 'UPDATE',
          entityType: params.entityType,
          entityId: params.entityId,
          entityName: params.entityName,
          oldValues: sanitizedOldValues,
          newValues: sanitizedNewValues,
          changes: significantChanges,
          severity: params.severity || entityConfig?.severity || 'INFO',
          category: params.category || entityConfig?.category || 'BUSINESS',
          description: params.description || `${params.entityType} updated`,
          context: this.transformContext(params.context)
        });
      }
    } catch (error) {
      console.error('Failed to log UPDATE audit:', error);
      auditPerformanceMonitor.recordFailure();
    } finally {
      timer();
    }
  }

  /**
   * Log a DELETE operation
   */
  async logDelete(params: {
    entityType: string;
    entityId: string;
    entityName?: string;
    oldValues: Record<string, any>;
    description?: string;
    context: AuditHelperContext;
    severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    category?: 'GENERAL' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' | 'COMPLIANCE';
  }) {
    try {
      await this.auditLogger.log({
        action: 'DELETE',
        entityType: params.entityType,
        entityId: params.entityId,
        entityName: params.entityName,
        oldValues: params.oldValues,
        severity: params.severity || 'WARNING',
        category: params.category || 'BUSINESS',
        description: params.description || `${params.entityType} deleted`,
        context: this.transformContext(params.context)
      });
    } catch (error) {
      console.error('Failed to log DELETE audit:', error);
    }
  }

  /**
   * Log a custom action
   */
  async logCustom(params: {
    action: string;
    entityType: string;
    entityId: string;
    entityName?: string;
    description: string;
    context: AuditHelperContext;
    severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    category?: 'GENERAL' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' | 'COMPLIANCE';
    metadata?: Record<string, any>;
  }) {
    try {
      await this.auditLogger.log({
        action: params.action as any, // Cast to allowed action type
        entityType: params.entityType,
        entityId: params.entityId,
        entityName: params.entityName,
        description: params.description,
        severity: params.severity || 'INFO',
        category: params.category || 'GENERAL',
        context: {
          ...this.transformContext(params.context),
          metadata: {
            ...params.context.metadata,
            ...params.metadata
          }
        }
      });
    } catch (error) {
      console.error('Failed to log CUSTOM audit:', error);
    }
  }

  /**
   * Calculate changes between old and new values
   */
  private calculateChanges(oldValues: Record<string, any>, newValues: Record<string, any>): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};
    
    // Check all fields in newValues
    for (const key in newValues) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
      
      if (oldValues[key] !== newValues[key]) {
        changes[key] = {
          old: oldValues[key],
          new: newValues[key]
        };
      }
    }

    // Check for deleted fields
    for (const key in oldValues) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
      
      if (!(key in newValues)) {
        changes[key] = {
          old: oldValues[key],
          new: null
        };
      }
    }

    return changes;
  }

  /**
   * Sanitize values based on entity configuration
   */
  private sanitizeValues(entityType: string, values: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(values)) {
      if (shouldLogField(entityType, key)) {
        sanitized[key] = sanitizeFieldValue(entityType, key, value);
      }
    }
    
    return sanitized;
  }

  /**
   * Filter changes to only include significant ones
   */
  private filterSignificantChanges(entityType: string, changes: Record<string, { old: any; new: any }>): Record<string, { old: any; new: any }> {
    const significant: Record<string, { old: any; new: any }> = {};
    
    // Fields that are always considered significant
    const alwaysSignificant = ['name', 'email', 'phone', 'status', 'role', 'amount', 'price'];
    
    // Fields that are usually not significant
    const usuallyInsignificant = ['updatedAt', 'lastLoginAt', 'viewCount', 'accessCount'];
    
    for (const [field, change] of Object.entries(changes)) {
      // Skip if field shouldn't be logged
      if (!shouldLogField(entityType, field)) continue;
      
      // Always include significant fields
      if (alwaysSignificant.includes(field)) {
        significant[field] = change;
        continue;
      }
      
      // Skip insignificant fields
      if (usuallyInsignificant.includes(field)) continue;
      
      // Include other fields
      significant[field] = change;
    }
    
    return significant;
  }

  /**
   * Transform helper context to audit context
   */
  private transformContext(context: AuditHelperContext): AuditContext {
    return {
      userId: context.userId,
      userEmail: context.userEmail,
      userRole: context.userRole,
      merchantId: context.merchantId,
      outletId: context.outletId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      requestId: context.requestId,
      metadata: context.metadata
    };
  }
}

/**
 * Create an audit helper instance
 */
export function createAuditHelper(prisma: PrismaClient): AuditHelper {
  return new AuditHelper(prisma);
}

/**
 * Quick audit logging functions for common operations
 */
export async function quickAuditLog(
  prisma: PrismaClient,
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  entityType: string,
  entityId: string,
  context: AuditHelperContext,
  options?: {
    entityName?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    description?: string;
    severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    category?: 'GENERAL' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' | 'COMPLIANCE';
  }
) {
  const auditHelper = new AuditHelper(prisma);
  
  switch (operation) {
    case 'CREATE':
      await auditHelper.logCreate({
        entityType,
        entityId,
        entityName: options?.entityName,
        newValues: options?.newValues || {},
        description: options?.description,
        context,
        severity: options?.severity,
        category: options?.category
      });
      break;
      
    case 'UPDATE':
      await auditHelper.logUpdate({
        entityType,
        entityId,
        entityName: options?.entityName,
        oldValues: options?.oldValues || {},
        newValues: options?.newValues || {},
        description: options?.description,
        context,
        severity: options?.severity,
        category: options?.category
      });
      break;
      
    case 'DELETE':
      await auditHelper.logDelete({
        entityType,
        entityId,
        entityName: options?.entityName,
        oldValues: options?.oldValues || {},
        description: options?.description,
        context,
        severity: options?.severity,
        category: options?.category
      });
      break;
  }
}
