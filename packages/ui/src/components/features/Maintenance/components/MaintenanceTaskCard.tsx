import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { 
  Wrench, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar,
  User,
  AlertTriangle
} from 'lucide-react';

export interface MaintenanceTask {
  id: string;
  name: string;
  type: 'SCHEDULED' | 'EMERGENCY' | 'ROUTINE' | 'UPDATE';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: string;
  description: string;
  createdBy: string;
  affectedServices: string[];
  estimatedDuration: string;
  actualDuration?: string;
}

interface MaintenanceTaskCardProps {
  task: MaintenanceTask;
  onStart?: (taskId: string) => void;
  onComplete?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
  onViewDetails?: (task: MaintenanceTask) => void;
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
    case 'EMERGENCY': return 'bg-red-100 text-red-800';
    case 'ROUTINE': return 'bg-green-100 text-green-800';
    case 'UPDATE': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING': return 'bg-yellow-100 text-yellow-800';
    case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
    case 'COMPLETED': return 'bg-green-100 text-green-800';
    case 'FAILED': return 'bg-red-100 text-red-800';
    case 'CANCELLED': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'LOW': return 'bg-gray-100 text-gray-800';
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
    case 'HIGH': return 'bg-orange-100 text-orange-800';
    case 'CRITICAL': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'PENDING': return Clock;
    case 'IN_PROGRESS': return Play;
    case 'COMPLETED': return CheckCircle;
    case 'FAILED': return XCircle;
    case 'CANCELLED': return XCircle;
    default: return Clock;
  }
};

function MaintenanceTaskCard({ 
  task, 
  onStart, 
  onComplete, 
  onCancel, 
  onViewDetails 
}: MaintenanceTaskCardProps) {
  const StatusIcon = getStatusIcon(task.status);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Wrench className="h-4 w-4 text-text-tertiary" />
          <CardTitle className="text-sm font-medium text-text-primary">
            {task.name}
          </CardTitle>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getPriorityColor(task.priority)}>
            {task.priority}
          </Badge>
          <Badge className={getTypeColor(task.type)}>
            {task.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary mb-3">
          {task.description}
        </p>
        
        <div className="flex items-center space-x-4 text-xs text-text-tertiary mb-3">
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>{new Date(task.scheduledAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{task.estimatedDuration}</span>
          </div>
          <div className="flex items-center space-x-1">
            <User className="h-3 w-3" />
            <span>{task.createdBy}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <StatusIcon className="h-4 w-4 text-text-tertiary" />
            <Badge className={getStatusColor(task.status)}>
              {task.status.replace('_', ' ')}
            </Badge>
          </div>
          
          {task.actualDuration && (
            <span className="text-xs text-text-tertiary">
              Actual: {task.actualDuration}
            </span>
          )}
        </div>

        <div className="mb-3">
          <p className="text-xs text-text-tertiary mb-1">Affected Services:</p>
          <div className="flex flex-wrap gap-1">
            {task.affectedServices.map((service, index) => (
              <span key={index} className="text-xs bg-bg-secondary px-2 py-1 rounded">
                {service}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(task)}
              >
                View Details
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            {task.status === 'PENDING' && onStart && (
              <Button
                size="sm"
                onClick={() => onStart(task.id)}
                className="flex items-center space-x-1"
              >
                <Play className="h-3 w-3" />
                <span>Start</span>
              </Button>
            )}
            
            {task.status === 'IN_PROGRESS' && onComplete && (
              <Button
                size="sm"
                onClick={() => onComplete(task.id)}
                className="flex items-center space-x-1"
              >
                <CheckCircle className="h-3 w-3" />
                <span>Complete</span>
              </Button>
            )}
            
            {(task.status === 'PENDING' || task.status === 'IN_PROGRESS') && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(task.id)}
                className="flex items-center space-x-1"
              >
                <XCircle className="h-3 w-3" />
                <span>Cancel</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { MaintenanceTaskCard };
export default MaintenanceTaskCard;
