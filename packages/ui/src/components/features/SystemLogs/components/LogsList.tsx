import React from 'react';
import { LogEntryCard, SystemLog } from './LogEntryCard';

interface LogsListProps {
  logs: SystemLog[];
  onViewLogDetails?: (log: SystemLog) => void;
  loading?: boolean;
  maxItems?: number;
  showFullDetails?: boolean;
}

export default function LogsList({ 
  logs, 
  onViewLogDetails, 
  loading = false,
  maxItems = 50,
  showFullDetails = false
}: LogsListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-32 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const displayLogs = logs.slice(0, maxItems);

  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-tertiary">No logs found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayLogs.map((log) => (
        <LogEntryCard
          key={log.id}
          log={log}
          onViewDetails={onViewLogDetails}
          showFullDetails={showFullDetails}
        />
      ))}
      
      {logs.length > maxItems && (
        <div className="text-center py-4">
          <p className="text-sm text-text-tertiary">
            Showing {maxItems} of {logs.length} logs
          </p>
        </div>
      )}
    </div>
  );
}
