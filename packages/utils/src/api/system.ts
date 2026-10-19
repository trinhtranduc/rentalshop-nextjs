import { authenticatedFetch, parseApiResponse } from '../core';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../core';

// ============================================================================
// TYPES
// ============================================================================

export interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
  type: 'full' | 'incremental';
  status: 'completed' | 'failed' | 'in_progress';
}

export interface BackupSchedule {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

export interface BackupVerification {
  id: string;
  backupId: string;
  status: 'verified' | 'failed' | 'pending';
  checksum: string;
  verifiedAt?: string;
  error?: string;
}

export interface SystemStats {
  totalBackups: number;
  totalSize: number;
  lastBackup?: string;
  nextScheduledBackup?: string;
  diskUsage: {
    used: number;
    available: number;
    total: number;
  };
}

/** #1017: GET /api/admin/embedding-backfill */
export interface EmbeddingBackfillStatus {
  merchantId: number | null;
  products: { withImages: number; missingEmbedding: number; withEmbedding: number };
  jobs: Record<'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED', number>;
  topMerchants: Array<{ id: number; name: string; missingEmbedding: number }>;
}

/** #1017: POST /api/admin/embedding-backfill */
export interface EmbeddingBackfillResult {
  merchantId: number | null;
  dryRun: boolean;
  merchants: number;
  products: number;
  queued: number;
  skippedAlreadyQueued: number;
  skippedFailed: number;
  /** #1087: true when every product with photos was taken (re-index); optional for an older API */
  all?: boolean;
  /** #1087: waiting jobs turned into forced re-embeds (`all`) */
  upgradedPending?: number;
}

// ============================================================================
// SYSTEM API CLIENT
// ============================================================================

/**
 * System API client for system administration operations
 */
export const systemApi = {
  /**
   * Get all backups
   */
  async getBackups(): Promise<ApiResponse<{ backups: BackupInfo[] }>> {
    const response = await authenticatedFetch(apiUrls.system?.backup || '/api/system/backup');
    return await parseApiResponse<{ backups: BackupInfo[] }>(response);
  },

  /**
   * Create a new backup
   */
  async createBackup(type: 'full' | 'incremental' = 'full'): Promise<ApiResponse<{ backupId: string }>> {
    const response = await authenticatedFetch(apiUrls.system?.backup || '/api/system/backup', {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
    return await parseApiResponse<{ backupId: string }>(response);
  },

  /**
   * Download a backup
   */
  async downloadBackup(backupId: string): Promise<Response> {
    return await authenticatedFetch(`${apiUrls.system?.backup || '/api/system/backup'}/${backupId}/download`);
  },

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`${apiUrls.system?.backup || '/api/system/backup'}/${backupId}`, {
      method: 'DELETE',
    });
    return await parseApiResponse<{ message: string }>(response);
  },

  /**
   * Get backup schedules
   */
  async getBackupSchedules(): Promise<ApiResponse<{ schedules: BackupSchedule[] }>> {
    const response = await authenticatedFetch(apiUrls.system?.backupSchedule || '/api/system/backup/schedule');
    return await parseApiResponse<{ schedules: BackupSchedule[] }>(response);
  },

  /**
   * Create a backup schedule
   */
  async createBackupSchedule(schedule: Omit<BackupSchedule, 'id'>): Promise<ApiResponse<{ scheduleId: string }>> {
    const response = await authenticatedFetch(apiUrls.system?.backupSchedule || '/api/system/backup/schedule', {
      method: 'POST',
      body: JSON.stringify(schedule),
    });
    return await parseApiResponse<{ scheduleId: string }>(response);
  },

  /**
   * Update a backup schedule
   */
  async updateBackupSchedule(scheduleId: string, schedule: Partial<BackupSchedule>): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`${apiUrls.system?.backupSchedule || '/api/system/backup/schedule'}/${scheduleId}`, {
      method: 'PUT',
      body: JSON.stringify(schedule),
    });
    return await parseApiResponse<{ message: string }>(response);
  },

  /**
   * Delete a backup schedule
   */
  async deleteBackupSchedule(scheduleId: string): Promise<ApiResponse<{ message: string }>> {
    const response = await authenticatedFetch(`${apiUrls.system?.backupSchedule || '/api/system/backup/schedule'}/${scheduleId}`, {
      method: 'DELETE',
    });
    return await parseApiResponse<{ message: string }>(response);
  },

  /**
   * Verify a backup
   */
  async verifyBackup(backupId: string): Promise<ApiResponse<BackupVerification>> {
    const response = await authenticatedFetch(`${apiUrls.system?.backupVerify || '/api/system/backup/verify'}`, {
      method: 'POST',
      body: JSON.stringify({ backupId }),
    });
    return await parseApiResponse<BackupVerification>(response);
  },

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<ApiResponse<SystemStats>> {
    const response = await authenticatedFetch(apiUrls.system?.stats || '/api/system/stats');
    return await parseApiResponse<SystemStats>(response);
  },

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<ApiResponse<{
    status: 'healthy' | 'warning' | 'critical';
    services: Array<{
      name: string;
      status: 'up' | 'down' | 'degraded';
      lastCheck: string;
    }>;
    uptime: number;
  }>> {
    const response = await authenticatedFetch(apiUrls.system?.health || '/api/system/health');
    return await parseApiResponse<{
      status: 'healthy' | 'warning' | 'critical';
      services: Array<{
        name: string;
        status: 'up' | 'down' | 'degraded';
        lastCheck: string;
      }>;
      uptime: number;
    }>(response);
  },

  /**
   * Get system logs
   */
  async getSystemLogs(page: number = 1, limit: number = 50, level?: string): Promise<ApiResponse<{
    logs: Array<{
      id: string;
      level: string;
      message: string;
      timestamp: string;
      source: string;
    }>;
    total: number;
    page: number;
    limit: number;
  }>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (level) params.append('level', level);

    const response = await authenticatedFetch(`${apiUrls.system?.logs || '/api/system/logs'}?${params.toString()}`);
    return await parseApiResponse<{
      logs: Array<{
        id: string;
        level: string;
        message: string;
        timestamp: string;
        source: string;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(response);
  },

  /** #1017: image-search embedding counts (ADMIN only) */
  async getEmbeddingBackfillStatus(merchantId?: number): Promise<ApiResponse<EmbeddingBackfillStatus>> {
    const query = merchantId ? `?merchantId=${merchantId}` : '';
    const response = await authenticatedFetch(`${apiUrls.system.embeddingBackfill}${query}`);
    return await parseApiResponse<EmbeddingBackfillStatus>(response);
  },

  /** #1017: queue missing image-search embeddings (ADMIN only); `dryRun` only counts; #1087 `all` re-indexes all */
  async runEmbeddingBackfill(body: {
    merchantId?: number;
    includeFailed?: boolean;
    dryRun?: boolean;
    all?: boolean;
  }): Promise<ApiResponse<EmbeddingBackfillResult>> {
    const response = await authenticatedFetch(apiUrls.system.embeddingBackfill, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return await parseApiResponse<EmbeddingBackfillResult>(response);
  },
};
