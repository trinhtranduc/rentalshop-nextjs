import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { 
  Clock, 
  Play, 
  Pause, 
  Settings, 
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

export interface BackupSchedule {
  id: string;
  name: string;
  frequency: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  nextRun: string;
  lastRun?: string;
  status: 'ACTIVE' | 'PAUSED' | 'DISABLED';
  type: 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL';
  retention: number;
}

interface BackupScheduleCardProps {
  schedule: BackupSchedule;
  onPause?: (scheduleId: string) => void;
  onResume?: (scheduleId: string) => void;
  onEdit?: (schedule: BackupSchedule) => void;
  onDelete?: (scheduleId: string) => void;
  onViewDetails?: (schedule: BackupSchedule) => void;
}

const getFrequencyColor = (frequency: string) => {
  switch (frequency) {
    case 'HOURLY': return 'bg-green-100 text-green-800';
    case 'DAILY': return 'bg-blue-100 text-blue-800';
    case 'WEEKLY': return 'bg-purple-100 text-purple-800';
    case 'MONTHLY': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800';
    case 'PAUSED': return 'bg-yellow-100 text-yellow-800';
    case 'DISABLED': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'FULL': return 'bg-blue-100 text-blue-800';
    case 'INCREMENTAL': return 'bg-green-100 text-green-800';
    case 'DIFFERENTIAL': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'ACTIVE': return CheckCircle;
    case 'PAUSED': return Pause;
    case 'DISABLED': return XCircle;
    default: return AlertTriangle;
  }
};

function BackupScheduleCard({ 
  schedule, 
  onPause, 
  onResume, 
  onEdit, 
  onDelete, 
  onViewDetails 
}: BackupScheduleCardProps) {
  const StatusIcon = getStatusIcon(schedule.status);
  const nextRunDate = new Date(schedule.nextRun);
  const lastRunDate = schedule.lastRun ? new Date(schedule.lastRun) : null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-text-tertiary" />
          <CardTitle className="text-sm font-medium text-text-primary">
            {schedule.name}
          </CardTitle>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getFrequencyColor(schedule.frequency)}>
            {schedule.frequency}
          </Badge>
          <Badge className={getTypeColor(schedule.type)}>
            {schedule.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-tertiary">Next Run:</span>
            <span className="text-text-primary">{nextRunDate.toLocaleString()}</span>
          </div>
          {lastRunDate && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">Last Run:</span>
              <span className="text-text-primary">{lastRunDate.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-tertiary">Retention:</span>
            <span className="text-text-primary">{schedule.retention} days</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <StatusIcon className="h-4 w-4 text-text-tertiary" />
            <Badge className={getStatusColor(schedule.status)}>
              {schedule.status}
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(schedule)}
              >
                View Details
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            {schedule.status === 'ACTIVE' && onPause && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPause(schedule.id)}
                className="flex items-center space-x-1"
              >
                <Pause className="h-3 w-3" />
                <span>Pause</span>
              </Button>
            )}
            
            {schedule.status === 'PAUSED' && onResume && (
              <Button
                size="sm"
                onClick={() => onResume(schedule.id)}
                className="flex items-center space-x-1"
              >
                <Play className="h-3 w-3" />
                <span>Resume</span>
              </Button>
            )}
            
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(schedule)}
                className="flex items-center space-x-1"
              >
                <Settings className="h-3 w-3" />
                <span>Edit</span>
              </Button>
            )}
            
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(schedule.id)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { BackupScheduleCard };
export default BackupScheduleCard;
