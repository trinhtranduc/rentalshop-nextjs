import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { AlertTriangle, CheckCircle, Clock, User } from 'lucide-react';

export interface PerformanceAlert {
  id: string;
  metric: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface PerformanceAlertCardProps {
  alert: PerformanceAlert;
  onResolve?: (alertId: string) => void;
  onViewDetails?: (alert: PerformanceAlert) => void;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'LOW': return 'bg-blue-100 text-blue-800';
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
    case 'HIGH': return 'bg-orange-100 text-orange-800';
    case 'CRITICAL': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'LOW': return AlertTriangle;
    case 'MEDIUM': return AlertTriangle;
    case 'HIGH': return AlertTriangle;
    case 'CRITICAL': return AlertTriangle;
    default: return AlertTriangle;
  }
};

function PerformanceAlertCard({ 
  alert, 
  onResolve, 
  onViewDetails 
}: PerformanceAlertCardProps) {
  const SeverityIcon = getSeverityIcon(alert.severity);

  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <SeverityIcon className="h-4 w-4 text-orange-500" />
          <CardTitle className="text-sm font-medium text-text-primary">
            {alert.metric}
          </CardTitle>
        </div>
        <Badge className={getSeverityColor(alert.severity)}>
          {alert.severity}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary mb-3">
          {alert.message}
        </p>
        
        <div className="flex items-center space-x-4 text-xs text-text-tertiary mb-3">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{new Date(alert.timestamp).toLocaleString()}</span>
          </div>
          {alert.resolved && alert.resolvedBy && (
            <div className="flex items-center space-x-1">
              <User className="h-3 w-3" />
              <span>Resolved by {alert.resolvedBy}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {alert.resolved ? (
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Resolved</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-orange-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Active</span>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(alert)}
              >
                View Details
              </Button>
            )}
            {!alert.resolved && onResolve && (
              <Button
                size="sm"
                onClick={() => onResolve(alert.id)}
              >
                Resolve
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { PerformanceAlertCard };
export default PerformanceAlertCard;
