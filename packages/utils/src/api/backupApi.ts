// ============================================================================
// BACKUP API CLIENT - Centralized backup management functions
// ============================================================================

export interface BackupOptions {
  type: 'full' | 'incremental' | 'schema-only';
  includeData?: boolean;
  compress?: boolean;
  tables?: string[];
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  filename: string;
  size: number;
  duration: number;
  timestamp: string;
  error?: string;
}

export interface BackupFile {
  filename: string;
  size: number;
  created: string;
  modified: string;
}

export interface BackupListResponse {
  success: boolean;
  backups: BackupFile[];
  total: number;
  totalSize: number;
  error?: string;
}

export interface RestoreOptions {
  backupId: string;
  dryRun?: boolean;
  tables?: string[];
  confirmDataLoss?: boolean;
}

export interface RestoreResult {
  success: boolean;
  backupId: string;
  dryRun?: boolean;
  analysis?: any;
  currentCounts?: any;
  duration: number;
  timestamp: string;
  error?: string;
}

export interface BackupVerification {
  success: boolean;
  backupId: string;
  isValid: boolean;
  checksum: string;
  size: number;
  tables: string[];
  warnings: string[];
  error?: string;
}

export interface BackupSchedule {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'schema-only';
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  retention: number;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  backupId?: string;
  error?: string;
}

// ============================================================================
// BACKUP MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Create a new backup
 */
export async function createBackup(options: BackupOptions): Promise<BackupResult> {
  const response = await fetch('/api/system/backup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create backup');
  }

  return response.json();
}

/**
 * List all available backups
 */
export async function listBackups(): Promise<BackupListResponse> {
  const response = await fetch('/api/system/backup', {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list backups');
  }

  return response.json();
}

/**
 * Restore from a backup
 */
export async function restoreBackup(options: RestoreOptions): Promise<RestoreResult> {
  const response = await fetch('/api/system/backup/restore', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to restore backup');
  }

  return response.json();
}

/**
 * Verify backup integrity
 */
export async function verifyBackup(backupId: string): Promise<BackupVerification> {
  const response = await fetch('/api/system/backup/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ backupId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to verify backup');
  }

  return response.json();
}

/**
 * Get backup schedules
 */
export async function getBackupSchedules(): Promise<BackupSchedule[]> {
  const response = await fetch('/api/system/backup/schedule', {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get backup schedules');
  }

  const result = await response.json();
  return result.schedules || [];
}

/**
 * Create backup schedule
 */
export async function createBackupSchedule(schedule: Omit<BackupSchedule, 'id'>): Promise<BackupSchedule> {
  const response = await fetch('/api/system/backup/schedule', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(schedule),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create backup schedule');
  }

  return response.json();
}

/**
 * Update backup schedule
 */
export async function updateBackupSchedule(id: string, schedule: Partial<BackupSchedule>): Promise<BackupSchedule> {
  const response = await fetch(`/api/system/backup/schedule/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(schedule),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update backup schedule');
  }

  return response.json();
}

/**
 * Delete backup schedule
 */
export async function deleteBackupSchedule(id: string): Promise<void> {
  const response = await fetch(`/api/system/backup/schedule/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete backup schedule');
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format date in human readable format
 */
export function formatBackupDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get backup type display name
 */
export function getBackupTypeDisplay(type: string): string {
  switch (type) {
    case 'full': return 'Full Backup';
    case 'incremental': return 'Incremental';
    case 'schema-only': return 'Schema Only';
    default: return type;
  }
}

/**
 * Get backup type color
 */
export function getBackupTypeColor(type: string): string {
  switch (type) {
    case 'full': return 'bg-blue-100 text-blue-800';
    case 'incremental': return 'bg-green-100 text-green-800';
    case 'schema-only': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}
