/**
 * Sync Session Operations
 * Temporary implementation for sync-standalone endpoint
 * TODO: Implement proper sync session tracking with database model
 */

import { prisma } from './client';

export interface SyncSession {
  id: number;
  type: 'sync' | 'import'; // Add type to distinguish sync vs import sessions
  merchantId: number;
  entities: string[];
  config: {
    endpoint?: string;
    token?: string;
    fileName?: string; // For import sessions
    fileSize?: number; // For import sessions
    options?: {
      skipDuplicates?: boolean;
      validateOnly?: boolean;
    };
  };
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PARTIALLY_COMPLETED';
  stats?: any;
  errorLog?: any[];
  progress?: {
    currentEntity?: string;
    currentEntityIndex?: number;
    entityProgress?: {
      customers?: { processed: number; total: number; lastProcessedIndex: number; errors?: number };
      products?: { processed: number; total: number; lastProcessedIndex: number; errors?: number };
      orders?: { processed: number; total: number; lastProcessedIndex: number; errors?: number };
    };
    lastError?: {
      entity: string;
      index: number;
      error: string;
      timestamp: Date;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionInput {
  type?: 'sync' | 'import'; // Default to 'sync' for backward compatibility
  merchantId: number;
  entities: string[];
  config: {
    endpoint?: string;
    token?: string;
    fileName?: string;
    fileSize?: number;
    options?: {
      skipDuplicates?: boolean;
      validateOnly?: boolean;
    };
  };
}

export interface UpdateStatusInput {
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PARTIALLY_COMPLETED';
  stats?: any;
  errorLog?: any[];
  progress?: {
    currentEntity?: string;
    currentEntityIndex?: number;
    entityProgress?: {
      customers?: { processed: number; total: number; lastProcessedIndex: number };
      products?: { processed: number; total: number; lastProcessedIndex: number };
      orders?: { processed: number; total: number; lastProcessedIndex: number };
    };
    lastError?: {
      entity: string;
      index: number;
      error: string;
      timestamp: Date;
    };
  };
}

export interface AddRecordInput {
  syncSessionId: number;
  entityType: 'customer' | 'product' | 'order';
  entityId: number;
  oldServerId: string;
  status: 'created' | 'updated' | 'failed';
  logMessage?: string;
}

export interface CreatedRecord {
  entityType: 'customer' | 'product' | 'order';
  entityId: number;
  oldServerId: string;
}

/**
 * Simplified sync operations
 * Note: This is a temporary implementation. 
 * For production, consider creating a SyncSession model in Prisma schema.
 */
const simplifiedSync = {
  /**
   * Track created records for rollback
   */
  createdRecords: new Map<number, CreatedRecord[]>(),
  
  /**
   * Store sync sessions in memory (temporary)
   */
  sessions: new Map<number, SyncSession>(),

  /**
   * Add created record to tracking
   */
  trackRecord(sessionId: number, record: CreatedRecord): void {
    if (!this.createdRecords.has(sessionId)) {
      this.createdRecords.set(sessionId, []);
    }
    this.createdRecords.get(sessionId)!.push(record);
  },

  /**
   * Rollback all created records for a session
   */
  async rollback(sessionId: number): Promise<{ deleted: number; errors: string[] }> {
    const records = this.createdRecords.get(sessionId) || [];
    const errors: string[] = [];
    let deleted = 0;

    console.log(`🔄 Rolling back ${records.length} records for session ${sessionId}`);

    // Delete in reverse order (orders -> products -> customers)
    // Orders must be deleted first (with their orderItems), then products, then customers
    const orders = records.filter(r => r.entityType === 'order');
    const products = records.filter(r => r.entityType === 'product');
    const customers = records.filter(r => r.entityType === 'customer');

    // Delete orders first (with orderItems)
    for (const record of orders) {
      try {
        // Delete orderItems first (foreign key constraint)
        await prisma.orderItem.deleteMany({ 
          where: { orderId: record.entityId } 
        }).catch(() => {
          // OrderItems might not exist
        });
        
        // Then delete the order
        await prisma.order.delete({ 
          where: { id: record.entityId } 
        }).catch(() => {
          // Order might have been deleted or doesn't exist
        });
        
        deleted++;
      } catch (error: any) {
        errors.push(`Failed to delete order ${record.entityId}: ${error.message}`);
      }
    }

    // Delete products (may have outletStock relations)
    for (const record of products) {
      try {
        // Delete outletStock first if exists
        await prisma.outletStock.deleteMany({ 
          where: { productId: record.entityId } 
        }).catch(() => {
          // OutletStock might not exist
        });
        
        // Then delete the product
        await prisma.product.delete({ 
          where: { id: record.entityId } 
        }).catch(() => {
          // Product might have been deleted or doesn't exist
        });
        
        deleted++;
      } catch (error: any) {
        errors.push(`Failed to delete product ${record.entityId}: ${error.message}`);
      }
    }

    // Delete customers last (may have orders, but we already deleted orders)
    for (const record of customers) {
      try {
        await prisma.customer.delete({ 
          where: { id: record.entityId } 
        }).catch(() => {
          // Customer might have been deleted or doesn't exist
        });
        
        deleted++;
      } catch (error: any) {
        errors.push(`Failed to delete customer ${record.entityId}: ${error.message}`);
      }
    }

    // Clear tracking
    this.createdRecords.delete(sessionId);

    console.log(`✅ Rollback completed: ${deleted} records deleted, ${errors.length} errors`);

    return { deleted, errors };
  },

  /**
   * Clear tracking for a session (after successful completion)
   */
  clearTracking(sessionId: number): void {
    this.createdRecords.delete(sessionId);
  },
  /**
   * Create a sync session
   * TODO: Store in database when SyncSession model is created
   */
  async createSession(input: CreateSessionInput): Promise<SyncSession> {
    // Temporary in-memory implementation
    // In production, this should create a record in the database
    const session: SyncSession = {
      id: Date.now(), // Temporary ID
      type: input.type || 'sync', // Default to 'sync' for backward compatibility
      merchantId: input.merchantId,
      entities: input.entities,
      config: input.config,
      status: 'PENDING',
      progress: {
        entityProgress: {}
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store in memory
    this.sessions.set(session.id, session);

    console.log('📝 Sync session created (temporary):', {
      id: session.id,
      merchantId: session.merchantId,
      entities: session.entities
    });

    return session;
  },
  
  /**
   * Get sync session by ID
   */
  async getSession(sessionId: number): Promise<SyncSession | null> {
    return this.sessions.get(sessionId) || null;
  },

  /**
   * Update sync session status
   * TODO: Update database record when SyncSession model is created
   */
  async updateStatus(
    sessionId: number,
    input: UpdateStatusInput
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`⚠️ Sync session ${sessionId} not found`);
      return;
    }

    // Update session in memory
    session.status = input.status;
    session.updatedAt = new Date();
    if (input.stats) {
      session.stats = input.stats;
    }
    if (input.errorLog) {
      session.errorLog = input.errorLog;
    }
    if (input.progress) {
      session.progress = {
        ...session.progress,
        ...input.progress,
        entityProgress: {
          ...session.progress?.entityProgress,
          ...input.progress.entityProgress
        }
      };
    }

    // Store updated session
    this.sessions.set(sessionId, session);

    console.log('📊 Sync session status updated:', {
      sessionId,
      status: input.status,
      hasStats: !!input.stats,
      hasErrorLog: !!input.errorLog,
      progress: input.progress
    });

    // In production, update the database record:
    // await prisma.syncSession.update({
    //   where: { id: sessionId },
    //   data: {
    //     status: input.status,
    //     stats: input.stats ? JSON.stringify(input.stats) : undefined,
    //     errorLog: input.errorLog ? JSON.stringify(input.errorLog) : undefined,
    //     progress: input.progress ? JSON.stringify(input.progress) : undefined,
    //     updatedAt: new Date()
    //   }
    // });
  },

  /**
   * Add a sync record
   * TODO: Store in database when SyncRecord model is created
   */
  async addRecord(input: AddRecordInput): Promise<void> {
    // Temporary implementation - just log
    console.log('📋 Sync record added (temporary):', {
      syncSessionId: input.syncSessionId,
      entityType: input.entityType,
      entityId: input.entityId,
      oldServerId: input.oldServerId,
      status: input.status,
      logMessage: input.logMessage
    });

    // In production, create a database record:
    // await prisma.syncRecord.create({
    //   data: {
    //     syncSessionId: input.syncSessionId,
    //     entityType: input.entityType,
    //     entityId: input.entityId,
    //     oldServerId: input.oldServerId,
    //     status: input.status,
    //     logMessage: input.logMessage,
    //     createdAt: new Date()
    //   }
    // });
  }
};

export { simplifiedSync };

