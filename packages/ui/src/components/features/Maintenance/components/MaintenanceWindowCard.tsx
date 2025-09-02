import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Calendar, Clock, Bell, BellOff } from 'lucide-react';

export interface MaintenanceWindow {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  description: string;
  affectedServices: string[];
  notifications: {
    users: boolean;
    admins: boolean;
    customers: boolean;
  };
}

interface MaintenanceWindowCardProps {
  window: MaintenanceWindow;
  onEdit?: (window: MaintenanceWindow) => void;
  onCancel?: (windowId: string) => void;
  onViewDetails?: (window: MaintenanceWindow) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800';
    case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
    case 'COMPLETED': return 'bg-gray-100 text-gray-800';
    case 'CANCELLED': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'ACTIVE': return Clock;
    case 'SCHEDULED': return Calendar;
    case 'COMPLETED': return Calendar;
    case 'CANCELLED': return Calendar;
    default: return Calendar;
  }
};

export default function MaintenanceWindowCard({ 
  window, 
  onEdit, 
  onCancel, 
  onViewDetails 
}: MaintenanceWindowCardProps) {
  const StatusIcon = getStatusIcon(window.status);
  const startDate = new Date(window.startTime);
  const endDate = new Date(window.endTime);
  const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <StatusIcon className="h-4 w-4 text-text-tertiary" />
          <CardTitle className="text-sm font-medium text-text-primary">
            {window.name}
          </CardTitle>
        </div>
        <Badge className={getStatusColor(window.status)}>
          {window.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary mb-3">
          {window.description}
        </p>
        
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-tertiary">Start Time:</span>
            <span className="text-text-primary">{startDate.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-tertiary">End Time:</span>
            <span className="text-text-primary">{endDate.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-tertiary">Duration:</span>
            <span className="text-text-primary">{duration} hours</span>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-xs text-text-tertiary mb-1">Affected Services:</p>
          <div className="flex flex-wrap gap-1">
            {window.affectedServices.map((service, index) => (
              <span key={index} className="text-xs bg-bg-secondary px-2 py-1 rounded">
                {service}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <p className="text-xs text-text-tertiary mb-1">Notifications:</p>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              {window.notifications.users ? (
                <Bell className="h-3 w-3 text-green-500" />
              ) : (
                <BellOff className="h-3 w-3 text-gray-400" />
              )}
              <span className="text-xs">Users</span>
            </div>
            <div className="flex items-center space-x-1">
              {window.notifications.admins ? (
                <Bell className="h-3 w-3 text-green-500" />
              ) : (
                <BellOff className="h-3 w-3 text-gray-400" />
              )}
              <span className="text-xs">Admins</span>
            </div>
            <div className="flex items-center space-x-1">
              {window.notifications.customers ? (
                <Bell className="h-3 w-3 text-green-500" />
              ) : (
                <BellOff className="h-3 w-3 text-gray-400" />
              )}
              <span className="text-xs">Customers</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(window)}
              >
                View Details
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            {window.status === 'SCHEDULED' && onEdit && (
              <Button
                size="sm"
                onClick={() => onEdit(window)}
              >
                Edit
              </Button>
            )}
            
            {(window.status === 'SCHEDULED' || window.status === 'ACTIVE') && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(window.id)}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
