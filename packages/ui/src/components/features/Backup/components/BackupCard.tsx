import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { 
  Database, 
  Download, 
  Play, 
  Trash2, 
  Clock, 
  Calendar,
  User,
  HardDrive,
  Cloud,
  Archive,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

export interface Backup {
  id: string;
  name: string;
  type: 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL';
  status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED' | 'SCHEDULED';
  size: string;
  createdAt: string;
  completedAt?: string;
  duration?: string;
  location: 'LOCAL' | 'CLOUD' | 'BOTH';
  description: string;
  createdBy: string;
}

interface BackupCardProps {
  backup: Backup;
  onDownload?: (backupId: string) => void;
  onRestore?: (backupId: string) => void;
  onDelete?: (backupId: string) => void;
  onViewDetails?: (backup: Backup) => void;
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'FULL': return 'bg-blue-100 text-blue-800';
    case 'INCREMENTAL': return 'bg-green-100 text-green-800';
    case 'DIFFERENTIAL': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED': return 'bg-green-100 text-green-800';
    case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
    case 'FAILED': return 'bg-red-100 text-red-800';
    case 'SCHEDULED': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'COMPLETED': return CheckCircle;
    case 'IN_PROGRESS': return Clock;
    case 'FAILED': return XCircle;
    case 'SCHEDULED': return AlertTriangle;
    default: return Clock;
  }
};

const getLocationIcon = (location: string) => {
  switch (location) {
    case 'CLOUD': return Cloud;
    case 'LOCAL': return HardDrive;
    case 'BOTH': return Archive;
    default: return Database;
  }
};

function BackupCard({ 
  backup, 
  onDownload, 
  onRestore, 
  onDelete, 
  onViewDetails 
}: BackupCardProps) {
  const StatusIcon = getStatusIcon(backup.status);
  const LocationIcon = getLocationIcon(backup.location);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Database className="h-4 w-4 text-text-tertiary" />
          <CardTitle className="text-sm font-medium text-text-primary">
            {backup.name}
          </CardTitle>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getTypeColor(backup.type)}>
            {backup.type}
          </Badge>
          <Badge className={getStatusColor(backup.status)}>
            {backup.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary mb-3">
          {backup.description}
        </p>
        
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-tertiary">Size:</span>
            <span className="text-text-primary">{backup.size}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-tertiary">Created:</span>
            <span className="text-text-primary">{new Date(backup.createdAt).toLocaleDateString()}</span>
          </div>
          {backup.completedAt && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">Completed:</span>
              <span className="text-text-primary">{new Date(backup.completedAt).toLocaleDateString()}</span>
            </div>
          )}
          {backup.duration && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">Duration:</span>
              <span className="text-text-primary">{backup.duration}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <StatusIcon className="h-4 w-4 text-text-tertiary" />
            <span className="text-xs text-text-tertiary">
              {backup.status.replace('_', ' ')}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <LocationIcon className="h-3 w-3 text-text-tertiary" />
            <span className="text-xs text-text-tertiary">{backup.location}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-text-tertiary mb-3">
          <div className="flex items-center space-x-1">
            <User className="h-3 w-3" />
            <span>{backup.createdBy}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(backup)}
              >
                View Details
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            {backup.status === 'COMPLETED' && onDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(backup.id)}
                className="flex items-center space-x-1"
              >
                <Download className="h-3 w-3" />
                <span>Download</span>
              </Button>
            )}
            
            {backup.status === 'COMPLETED' && onRestore && (
              <Button
                size="sm"
                onClick={() => onRestore(backup.id)}
                className="flex items-center space-x-1"
              >
                <Play className="h-3 w-3" />
                <span>Restore</span>
              </Button>
            )}
            
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(backup.id)}
                className="flex items-center space-x-1"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { BackupCard };
export default BackupCard;
