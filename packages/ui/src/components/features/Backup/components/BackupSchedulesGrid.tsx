import React from 'react';
import { BackupScheduleCard, BackupSchedule } from './BackupScheduleCard';

interface BackupSchedulesGridProps {
  schedules: BackupSchedule[];
  onPauseSchedule?: (scheduleId: string) => void;
  onResumeSchedule?: (scheduleId: string) => void;
  onEditSchedule?: (schedule: BackupSchedule) => void;
  onDeleteSchedule?: (scheduleId: string) => void;
  onViewScheduleDetails?: (schedule: BackupSchedule) => void;
  loading?: boolean;
}

export default function BackupSchedulesGrid({ 
  schedules, 
  onPauseSchedule, 
  onResumeSchedule, 
  onEditSchedule, 
  onDeleteSchedule, 
  onViewScheduleDetails,
  loading = false 
}: BackupSchedulesGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-64 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-tertiary">No backup schedules found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {schedules.map((schedule) => (
        <BackupScheduleCard
          key={schedule.id}
          schedule={schedule}
          onPause={onPauseSchedule}
          onResume={onResumeSchedule}
          onEdit={onEditSchedule}
          onDelete={onDeleteSchedule}
          onViewDetails={onViewScheduleDetails}
        />
      ))}
    </div>
  );
}
