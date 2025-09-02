import React from 'react';
import { MaintenanceTaskCard, MaintenanceTask } from './MaintenanceTaskCard';

interface MaintenanceTasksGridProps {
  tasks: MaintenanceTask[];
  onStartTask?: (taskId: string) => void;
  onCompleteTask?: (taskId: string) => void;
  onCancelTask?: (taskId: string) => void;
  onViewTaskDetails?: (task: MaintenanceTask) => void;
  loading?: boolean;
}

export default function MaintenanceTasksGrid({ 
  tasks, 
  onStartTask, 
  onCompleteTask, 
  onCancelTask, 
  onViewTaskDetails,
  loading = false 
}: MaintenanceTasksGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-64 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-tertiary">No maintenance tasks found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tasks.map((task) => (
        <MaintenanceTaskCard
          key={task.id}
          task={task}
          onStart={onStartTask}
          onComplete={onCompleteTask}
          onCancel={onCancelTask}
          onViewDetails={onViewTaskDetails}
        />
      ))}
    </div>
  );
}
