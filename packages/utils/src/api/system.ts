import { authenticatedFetch, parseApiResponse } from '../core/server';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../core/server';

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
  }
};
