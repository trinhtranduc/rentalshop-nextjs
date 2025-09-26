/**
 * Prisma Audit Middleware
 * 
 * This middleware automatically logs all database changes to the audit_logs table.
 * It captures CREATE, UPDATE, and DELETE operations for all entities.
 */

import { PrismaClient } from '@prisma/client';
import { AuditLogger } from './audit';

// Extend PrismaClient to include audit functionality
export class AuditablePrismaClient extends PrismaClient {
  private auditLogger: AuditLogger;

  constructor() {
    super();
    this.auditLogger = new AuditLogger(this);
    this.setupAuditMiddleware();
  }

  private setupAuditMiddleware() {
    // Middleware for CREATE operations
    this.$use(async (params, next) => {
      if (params.action === 'create') {
        const result = await next(params);
        
        // Log the creation
        await this.auditLogger.logCreate({
          action: 'CREATE',
          entityType: params.model || 'Unknown',
          entityId: result.id || result.id?.toString() || 'unknown',
          entityName: this.getEntityName(params.model, result),
          newValues: this.sanitizeData(result),
          severity: 'INFO',
          category: 'BUSINESS',
          description: `${params.model} created`,
          context: await this.getAuditContext()
        });

        return result;
      }
      return next(params);
    });

    // Middleware for UPDATE operations
    this.$use(async (params, next) => {
      if (params.action === 'update' || params.action === 'updateMany') {
        // Get the original data before update
        const originalData = await this.getOriginalData(params);
        
        const result = await next(params);
        
        // Calculate changes
        const changes = this.calculateChanges(originalData, result);
        
        if (Object.keys(changes).length > 0) {
          // Log the update
          await this.auditLogger.logUpdate({
            action: 'UPDATE',
            entityType: params.model || 'Unknown',
            entityId: result.id || result.id?.toString() || 'unknown',
            entityName: this.getEntityName(params.model, result),
            oldValues: originalData,
            newValues: this.sanitizeData(result),
            changes: changes,
            severity: 'INFO',
            category: 'BUSINESS',
            description: `${params.model} updated`,
            context: await this.getAuditContext()
          });
        }

        return result;
      }
      return next(params);
    });

    // Middleware for DELETE operations
    this.$use(async (params, next) => {
      if (params.action === 'delete' || params.action === 'deleteMany') {
        // Get the original data before deletion
        const originalData = await this.getOriginalData(params);
        
        const result = await next(params);
        
        // Log the deletion
        await this.auditLogger.logDelete({
          action: 'DELETE',
          entityType: params.model || 'Unknown',
          entityId: originalData?.id || originalData?.id?.toString() || 'unknown',
          entityName: this.getEntityName(params.model, originalData),
          oldValues: this.sanitizeData(originalData),
          severity: 'WARNING',
          category: 'BUSINESS',
          description: `${params.model} deleted`,
          context: await this.getAuditContext()
        });

        return result;
      }
      return next(params);
    });
  }

  private async getOriginalData(params: any) {
    try {
      if (params.action === 'update') {
        return await (this as any)[params.model].findUnique({
          where: params.where
        });
      } else if (params.action === 'delete') {
        return await (this as any)[params.model].findUnique({
          where: params.where
        });
      }
      return null;
    } catch (error) {
      console.error('Error getting original data for audit:', error);
      return null;
    }
  }

  private calculateChanges(oldData: any, newData: any): Record<string, { old: any; new: any }> {
    if (!oldData || !newData) return {};

    const changes: Record<string, { old: any; new: any }> = {};
    
    // Compare all fields
    for (const key in newData) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
      
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          old: oldData[key],
          new: newData[key]
        };
      }
    }

    return changes;
  }

  private getEntityName(model: string | undefined, data: any): string {
    if (!data) return 'Unknown';
    
    // Try to get a meaningful name based on the model
    switch (model) {
      case 'Customer':
        return `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email || 'Unknown Customer';
      case 'User':
        return `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email || 'Unknown User';
      case 'Product':
        return data.name || 'Unknown Product';
      case 'Order':
        return data.orderNumber || `Order ${data.id}`;
      case 'Merchant':
        return data.name || 'Unknown Merchant';
      case 'Outlet':
        return data.name || 'Unknown Outlet';
      default:
        return data.name || data.title || data.email || `Unknown ${model}`;
    }
  }

  private sanitizeData(data: any): any {
    if (!data) return null;
    
    // Remove sensitive fields
    const sanitized = { ...data };
    delete sanitized.password;
    delete sanitized.passwordHash;
    delete sanitized.token;
    delete sanitized.refreshToken;
    delete sanitized.secretKey;
    delete sanitized.apiKey;
    
    return sanitized;
  }

  private async getAuditContext() {
    // This would be populated from the current request context
    // For now, return basic context
    return {
      // These would be populated from the request context in a real implementation
      userId: 'system',
      userEmail: 'system@rentalshop.com',
      userRole: 'SYSTEM',
      ipAddress: '127.0.0.1',
      userAgent: 'AuditMiddleware',
      sessionId: 'system-session',
      requestId: `audit-${Date.now()}`,
      metadata: {
        source: 'database-middleware',
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Export a singleton instance
export const auditablePrisma = new AuditablePrismaClient();
