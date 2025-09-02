import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { 
  Shield, 
  Eye, 
  Clock,
  User,
  Globe,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';

export interface SecurityEvent {
  id: string;
  type: 'LOGIN_ATTEMPT' | 'FAILED_LOGIN' | 'SUSPICIOUS_ACTIVITY' | 'DATA_BREACH' | 'UNAUTHORIZED_ACCESS';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
  source: string;
  description: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface SecurityEventCardProps {
  event: SecurityEvent;
  onViewDetails?: (event: SecurityEvent) => void;
  onResolve?: (eventId: string) => void;
  showFullDetails?: boolean;
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'LOGIN_ATTEMPT': return 'bg-blue-100 text-blue-800';
    case 'FAILED_LOGIN': return 'bg-yellow-100 text-yellow-800';
    case 'SUSPICIOUS_ACTIVITY': return 'bg-orange-100 text-orange-800';
    case 'DATA_BREACH': return 'bg-red-100 text-red-800';
    case 'UNAUTHORIZED_ACCESS': return 'bg-red-200 text-red-900';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'LOW': return 'bg-green-100 text-green-800';
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
    case 'HIGH': return 'bg-orange-100 text-orange-800';
    case 'CRITICAL': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'LOW': return Info;
    case 'MEDIUM': return AlertTriangle;
    case 'HIGH': return AlertTriangle;
    case 'CRITICAL': return XCircle;
    default: return Info;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'LOGIN_ATTEMPT': return CheckCircle;
    case 'FAILED_LOGIN': return XCircle;
    case 'SUSPICIOUS_ACTIVITY': return AlertTriangle;
    case 'DATA_BREACH': return XCircle;
    case 'UNAUTHORIZED_ACCESS': return XCircle;
    default: return Shield;
  }
};

function SecurityEventCard({ 
  event, 
  onViewDetails, 
  onResolve,
  showFullDetails = false 
}: SecurityEventCardProps) {
  const SeverityIcon = getSeverityIcon(event.severity);
  const TypeIcon = getTypeIcon(event.type);
  const eventDate = new Date(event.timestamp);

  return (
    <Card className={`hover:shadow-md transition-shadow ${event.severity === 'CRITICAL' ? 'border-l-4 border-l-red-500' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <TypeIcon className="h-4 w-4 text-text-tertiary" />
          <CardTitle className="text-sm font-medium text-text-primary">
            {event.description}
          </CardTitle>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getTypeColor(event.type)}>
            {event.type.replace('_', ' ')}
          </Badge>
          <Badge className={getSeverityColor(event.severity)}>
            {event.severity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary mb-3">
          {event.details}
        </p>
        
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-tertiary">Timestamp:</span>
            <span className="text-text-primary font-mono">{eventDate.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-tertiary">Source:</span>
            <span className="text-text-primary">{event.source}</span>
          </div>
          {event.userId && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">User ID:</span>
              <span className="text-text-primary">{event.userId}</span>
            </div>
          )}
          {event.ipAddress && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">IP Address:</span>
              <span className="text-text-primary font-mono">{event.ipAddress}</span>
            </div>
          )}
        </div>

        {showFullDetails && event.userAgent && (
          <div className="mb-3">
            <p className="text-xs text-text-tertiary mb-1">User Agent:</p>
            <p className="text-xs text-text-primary break-all">{event.userAgent}</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <SeverityIcon className="h-4 w-4 text-text-tertiary" />
            {event.resolved ? (
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="h-3 w-3" />
                <span className="text-xs">Resolved</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-orange-600">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-xs">Active</span>
              </div>
            )}
          </div>
          
          {event.resolved && event.resolvedAt && (
            <span className="text-xs text-text-tertiary">
              Resolved: {new Date(event.resolvedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs text-text-tertiary">
            {event.userId && (
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span>{event.userId}</span>
              </div>
            )}
            {event.ipAddress && (
              <div className="flex items-center space-x-1">
                <Globe className="h-3 w-3" />
                <span>{event.ipAddress}</span>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(event)}
                className="flex items-center space-x-1"
              >
                <Eye className="h-3 w-3" />
                <span>View Details</span>
              </Button>
            )}
            
            {!event.resolved && onResolve && (
              <Button
                size="sm"
                onClick={() => onResolve(event.id)}
                className="flex items-center space-x-1"
              >
                <CheckCircle className="h-3 w-3" />
                <span>Resolve</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { SecurityEventCard };
export default SecurityEventCard;
