import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { 
  FileText, 
  Eye, 
  Clock,
  User,
  Globe,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  AlertCircle
} from 'lucide-react';

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  source: 'API' | 'DATABASE' | 'AUTH' | 'PAYMENT' | 'SYSTEM' | 'CLIENT';
  message: string;
  details?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  stackTrace?: string;
  metadata?: Record<string, any>;
}

interface LogEntryCardProps {
  log: SystemLog;
  onViewDetails?: (log: SystemLog) => void;
  showFullDetails?: boolean;
}

const getLevelColor = (level: string) => {
  switch (level) {
    case 'DEBUG': return 'bg-gray-100 text-gray-800';
    case 'INFO': return 'bg-blue-100 text-blue-800';
    case 'WARN': return 'bg-yellow-100 text-yellow-800';
    case 'ERROR': return 'bg-red-100 text-red-800';
    case 'FATAL': return 'bg-red-200 text-red-900';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getSourceColor = (source: string) => {
  switch (source) {
    case 'API': return 'bg-blue-100 text-blue-800';
    case 'DATABASE': return 'bg-green-100 text-green-800';
    case 'AUTH': return 'bg-purple-100 text-purple-800';
    case 'PAYMENT': return 'bg-orange-100 text-orange-800';
    case 'SYSTEM': return 'bg-gray-100 text-gray-800';
    case 'CLIENT': return 'bg-cyan-100 text-cyan-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getLevelIcon = (level: string) => {
  switch (level) {
    case 'DEBUG': return Info;
    case 'INFO': return CheckCircle;
    case 'WARN': return AlertTriangle;
    case 'ERROR': return XCircle;
    case 'FATAL': return AlertCircle;
    default: return Info;
  }
};

function LogEntryCard({ 
  log, 
  onViewDetails, 
  showFullDetails = false 
}: LogEntryCardProps) {
  const LevelIcon = getLevelIcon(log.level);
  const logDate = new Date(log.timestamp);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <LevelIcon className="h-4 w-4 text-text-tertiary" />
          <CardTitle className="text-sm font-medium text-text-primary">
            {log.message}
          </CardTitle>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getLevelColor(log.level)}>
            {log.level}
          </Badge>
          <Badge className={getSourceColor(log.source)}>
            {log.source}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {log.details && (
          <p className="text-sm text-text-secondary mb-3">
            {log.details}
          </p>
        )}
        
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-tertiary">Timestamp:</span>
            <span className="text-text-primary font-mono">{logDate.toLocaleString()}</span>
          </div>
          {log.userId && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">User ID:</span>
              <span className="text-text-primary">{log.userId}</span>
            </div>
          )}
          {log.requestId && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">Request ID:</span>
              <span className="text-text-primary font-mono">{log.requestId}</span>
            </div>
          )}
          {log.ipAddress && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">IP Address:</span>
              <span className="text-text-primary font-mono">{log.ipAddress}</span>
            </div>
          )}
        </div>

        {showFullDetails && log.stackTrace && (
          <div className="mb-3">
            <p className="text-xs text-text-tertiary mb-1">Stack Trace:</p>
            <pre className="text-xs text-text-primary bg-bg-secondary p-2 rounded overflow-auto max-h-32">
              {log.stackTrace}
            </pre>
          </div>
        )}

        {showFullDetails && log.metadata && (
          <div className="mb-3">
            <p className="text-xs text-text-tertiary mb-1">Metadata:</p>
            <pre className="text-xs text-text-primary bg-bg-secondary p-2 rounded overflow-auto max-h-32">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs text-text-tertiary">
            {log.userId && (
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span>{log.userId}</span>
              </div>
            )}
            {log.ipAddress && (
              <div className="flex items-center space-x-1">
                <Globe className="h-3 w-3" />
                <span>{log.ipAddress}</span>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(log)}
                className="flex items-center space-x-1"
              >
                <Eye className="h-3 w-3" />
                <span>View Details</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { LogEntryCard };
export default LogEntryCard;
