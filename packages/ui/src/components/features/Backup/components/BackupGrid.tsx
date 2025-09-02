import React from 'react';
import { BackupCard, Backup } from './BackupCard';

interface BackupGridProps {
  backups: Backup[];
  onDownloadBackup?: (backupId: string) => void;
  onRestoreBackup?: (backupId: string) => void;
  onDeleteBackup?: (backupId: string) => void;
  onViewBackupDetails?: (backup: Backup) => void;
  loading?: boolean;
}

export default function BackupGrid({ 
  backups, 
  onDownloadBackup, 
  onRestoreBackup, 
  onDeleteBackup, 
  onViewBackupDetails,
  loading = false 
}: BackupGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-80 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (backups.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-tertiary">No backups found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {backups.map((backup) => (
        <BackupCard
          key={backup.id}
          backup={backup}
          onDownload={onDownloadBackup}
          onRestore={onRestoreBackup}
          onDelete={onDeleteBackup}
          onViewDetails={onViewBackupDetails}
        />
      ))}
    </div>
  );
}
