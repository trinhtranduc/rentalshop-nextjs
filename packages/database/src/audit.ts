/**
 * Comprehensive Audit Logging System
 * 
 * This module provides a complete audit logging solution that tracks:
 * - Who made changes (user, role, context)
 * - What was changed (entity, fields, values)
 * - When changes occurred (timestamp, session)
 * - Where changes came from (IP, user agent)
 * - Why changes were made (business context)
 */

import { PrismaClient } from '@prisma/client';
import { normalizeStartDate, normalizeEndDate } from '@rentalshop/utils';

// Types for audit logging
export interface AuditContext {
  userId?: number;
  userEmail?: string;
  userRole?: string;
  merchantId?: number;
  outletId?: number;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogData {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'EXPORT' | 'IMPORT' | 'CUSTOM';
  entityType: string;
  entityId: string;
  entityName?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changes?: Record<string, { old: any; new: any }>;
  severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  category?: 'GENERAL' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' | 'COMPLIANCE';
  description?: string;
  outcome?: 'success' | 'failure';
  context: AuditContext;
}

export interface AuditLogFilter {
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: number;
  merchantId?: number;
  outletId?: number;
  severity?: string;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// Audit logger class
export class AuditLogger {
  private prisma: PrismaClient;
  private idCounter: number = 0;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // Main logging method - append-only write to AuditLog table
  async log(data: AuditLogData): Promise<void> {
    try {
      const validatedUserId = await this.validateUserId(data.context.userId);
      const validatedMerchantId = await this.validateMerchantId(data.context.merchantId);
      const validatedOutletId = await this.validateOutletId(data.context.outletId);

      const detailsPayload = {
        oldValues: data.oldValues,
        newValues: data.newValues,
        changes: data.changes,
        merchantId: validatedMerchantId ?? undefined,
        outletId: validatedOutletId ?? undefined,
        requestId: data.context.requestId,
        outcome: data.outcome ?? 'success',
        entityName: data.entityName,
        severity: data.severity,
        category: data.category,
        description: data.description
      };

      await this.prisma.auditLog.create({
        data: {
          entityType: data.entityType,
          entityId: data.entityId,
          action: data.action,
          details: JSON.stringify(detailsPayload),
          userId: validatedUserId,
          ipAddress: data.context.ipAddress ?? null,
          userAgent: data.context.userAgent ?? null,
          ...(validatedMerchantId != null && { merchantId: validatedMerchantId }),
          ...(validatedOutletId != null && { outletId: validatedOutletId })
        } as Parameters<typeof this.prisma.auditLog.create>[0]['data']
      });
    } catch (error) {
      // Don't throw errors from audit logging to avoid breaking main operations
      console.error('AuditLogger.log - Audit logging failed:', error);
    }
  }

  // Validate foreign key IDs to prevent constraint violations
  private async validateUserId(userId?: number): Promise<number | null> {
    if (!userId) return null;
    
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });
      return user ? userId : null;
    } catch (error) {
      console.warn('⚠️ AuditLogger - Failed to validate userId:', userId, error);
      return null;
    }
  }

  private async validateMerchantId(merchantId?: number): Promise<number | null> {
    if (!merchantId) return null;
    
    try {
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { id: true }
      });
      return merchant ? merchantId : null;
    } catch (error) {
      console.warn('⚠️ AuditLogger - Failed to validate merchantId:', merchantId, error);
      return null;
    }
  }

  private async validateOutletId(outletId?: number): Promise<number | null> {
    if (!outletId) return null;
    
    try {
      const outlet = await this.prisma.outlet.findUnique({
        where: { id: outletId },
        select: { id: true }
      });
      return outlet ? outletId : null;
    } catch (error) {
      console.warn('⚠️ AuditLogger - Failed to validate outletId:', outletId, error);
      return null;
    }
  }

  // Convenience methods for common operations
  async logCreate(
    entityType: string,
    entityId: string,
    entityName: string,
    newValues: Record<string, any>,
    context: AuditContext,
    description?: string
  ): Promise<void> {
    await this.log({
      action: 'CREATE',
      entityType,
      entityId,
      entityName,
      newValues,
      description: description || `Created ${entityType.toLowerCase()}: ${entityName}`,
      context
    });
  }

  async logUpdate(
    entityType: string,
    entityId: string,
    entityName: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    context: AuditContext,
    description?: string
  ): Promise<void> {
    const changes = this.calculateChanges(oldValues, newValues);
    
    await this.log({
      action: 'UPDATE',
      entityType,
      entityId,
      entityName,
      oldValues,
      newValues,
      changes,
      description: description || `Updated ${entityType.toLowerCase()}: ${entityName}`,
      context
    });
  }

  async logDelete(
    entityType: string,
    entityId: string,
    entityName: string,
    oldValues: Record<string, any>,
    context: AuditContext,
    description?: string
  ): Promise<void> {
    await this.log({
      action: 'DELETE',
      entityType,
      entityId,
      entityName,
      oldValues,
      description: description || `Deleted ${entityType.toLowerCase()}: ${entityName}`,
      context
    });
  }

  async logLogin(
    userId: number,
    userEmail: string,
    userRole: string,
    context: AuditContext,
    success: boolean = true
  ): Promise<void> {
    await this.log({
      action: 'LOGIN',
      entityType: 'User',
      entityId: userId.toString(),
      entityName: userEmail,
      newValues: { success, timestamp: new Date().toISOString() },
      severity: success ? 'INFO' : 'WARNING',
      category: 'SECURITY',
      description: success ? `User logged in: ${userEmail}` : `Failed login attempt: ${userEmail}`,
      context
    });
  }

  async logLogout(
    userId: number,
    userEmail: string,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      action: 'LOGOUT',
      entityType: 'User',
      entityId: userId.toString(),
      entityName: userEmail,
      category: 'SECURITY',
      description: `User logged out: ${userEmail}`,
      context
    });
  }

  async logSecurityEvent(
    event: string,
    entityType: string,
    entityId: string,
    context: AuditContext,
    severity: 'WARNING' | 'ERROR' | 'CRITICAL' = 'WARNING',
    description?: string
  ): Promise<void> {
    await this.log({
      action: 'CUSTOM',
      entityType,
      entityId,
      severity,
      category: 'SECURITY',
      description: description || `Security event: ${event}`,
      context
    });
  }

  // Calculate changes between old and new values
  private calculateChanges(oldValues: Record<string, any>, newValues: Record<string, any>): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};
    
    // Check for changed fields
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
    
    for (const key of Array.from(allKeys)) {
      const oldValue = oldValues[key];
      const newValue = newValues[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = { old: oldValue, new: newValue };
      }
    }
    
    return changes;
  }

  // Query audit logs
  async getAuditLogs(filter: AuditLogFilter = {}): Promise<{
    logs: any[];
    total: number;
    hasMore: boolean;
  }> {
    const where: any = {};
    if (filter.action) where.action = filter.action;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.userId) where.userId = filter.userId;
    if (filter.merchantId != null) where.merchantId = filter.merchantId;
    if (filter.outletId != null) where.outletId = filter.outletId;
    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      const normalizedStart = filter.startDate ? normalizeStartDate(filter.startDate) : null;
      const normalizedEnd = filter.endDate ? normalizeEndDate(filter.endDate) : null;
      if (normalizedStart) where.createdAt.gte = normalizedStart;
      if (normalizedEnd) where.createdAt.lte = normalizedEnd;
    }

    const limit = Math.min(filter.limit || 50, 100);
    const offset = filter.offset || 0;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true
            }
          },
          merchant: { select: { id: true, name: true } },
          outlet: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      this.prisma.auditLog.count({ where })
    ]);

    type LogWithRelations = (typeof logs)[number];
    const transformedLogs = logs.map((log: LogWithRelations) => {
      let details: Record<string, any> = {};
      try {
        details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details ?? {};
      } catch {
        details = {};
      }
      const logAny = log as LogWithRelations & {
        user?: { id: number; email: string; firstName: string | null; lastName: string | null; role: string };
        merchant?: { id: number; name: string };
        outlet?: { id: number; name: string };
        merchantId?: number | null;
        outletId?: number | null;
      };
      return {
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        entityName: details.entityName ?? null,
        user: logAny.user
          ? {
              id: logAny.user.id,
              email: logAny.user.email,
              name: `${logAny.user.firstName ?? ''} ${logAny.user.lastName ?? ''}`.trim(),
              role: logAny.user.role
            }
          : null,
        merchantId: logAny.merchantId ?? details.merchantId ?? null,
        outletId: logAny.outletId ?? details.outletId ?? null,
        merchant: logAny.merchant ? { id: logAny.merchant.id, name: logAny.merchant.name } : null,
        outlet: logAny.outlet ? { id: logAny.outlet.id, name: logAny.outlet.name } : null,
        oldValues: details.oldValues ?? null,
        newValues: details.newValues ?? null,
        changes: details.changes ?? null,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        requestId: details.requestId ?? null,
        outcome: details.outcome ?? 'success',
        severity: details.severity ?? null,
        category: details.category ?? null,
        description: details.description ?? null,
        createdAt: log.createdAt
      };
    });

    return {
      logs: transformedLogs,
      total,
      hasMore: offset + limit < total
    };
  }

  // Get audit statistics
  async getAuditStats(filter: Partial<AuditLogFilter> = {}): Promise<{
    totalLogs: number;
    logsByAction: Record<string, number>;
    logsByEntity: Record<string, number>;
    logsBySeverity: Record<string, number>;
    logsByCategory: Record<string, number>;
    recentActivity: number;
  }> {
    const where: any = {};
    if (filter.userId) where.userId = filter.userId;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.merchantId != null) where.merchantId = filter.merchantId;
    if (filter.outletId != null) where.outletId = filter.outletId;
    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      const normalizedStart = filter.startDate ? normalizeStartDate(filter.startDate) : null;
      const normalizedEnd = filter.endDate ? normalizeEndDate(filter.endDate) : null;
      if (normalizedStart) where.createdAt.gte = normalizedStart;
      if (normalizedEnd) where.createdAt.lte = normalizedEnd;
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentWhere = { ...where, createdAt: { gte: oneDayAgo } };

    const [totalLogs, actionStats, entityStats, recentActivity] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true }
      }),
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        where,
        _count: { entityType: true }
      }),
      this.prisma.auditLog.count({ where: recentWhere })
    ]);

    const logsByAction = actionStats.reduce((acc, item) => {
      acc[item.action] = item._count.action;
      return acc;
    }, {} as Record<string, number>);
    const logsByEntity = entityStats.reduce((acc, item) => {
      acc[item.entityType] = item._count.entityType;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalLogs,
      logsByAction,
      logsByEntity,
      logsBySeverity: {},
      logsByCategory: {},
      recentActivity
    };
  }
}

// Create singleton instance
let auditLogger: AuditLogger | null = null;

export function getAuditLogger(prisma?: PrismaClient): AuditLogger {
  if (!auditLogger) {
    if (!prisma) {
      throw new Error('Prisma client is required for audit logging');
    }
    auditLogger = new AuditLogger(prisma);
  }
  return auditLogger;
}

// Helper function to extract audit context from request
export function extractAuditContext(request: Request, user?: any): AuditContext {
  const headers = request.headers;
  
  return {
    userId: user?.id,
    userEmail: user?.email,
    userRole: user?.role,
    merchantId: user?.merchantId,
    outletId: user?.outletId,
    ipAddress: headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown',
    userAgent: headers.get('user-agent') || 'unknown',
    sessionId: headers.get('x-session-id') || undefined,
    requestId: headers.get('x-request-id') || undefined,
    metadata: {
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString()
    }
  };
}
