import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { 
  Globe, 
  Settings, 
  Clock,
  User,
  Activity
} from 'lucide-react';

export interface ApiEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  status: 'ACTIVE' | 'DEPRECATED' | 'MAINTENANCE';
  version: string;
  description: string;
  rateLimit: {
    requests: number;
    window: string;
  };
  lastModified: string;
  modifiedBy: string;
}

interface ApiEndpointCardProps {
  endpoint: ApiEndpoint;
  onEdit?: (endpoint: ApiEndpoint) => void;
  onViewDetails?: (endpoint: ApiEndpoint) => void;
}

const getMethodColor = (method: string) => {
  switch (method) {
    case 'GET': return 'bg-green-100 text-green-800';
    case 'POST': return 'bg-blue-100 text-blue-800';
    case 'PUT': return 'bg-yellow-100 text-yellow-800';
    case 'DELETE': return 'bg-red-100 text-red-800';
    case 'PATCH': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800';
    case 'DEPRECATED': return 'bg-yellow-100 text-yellow-800';
    case 'MAINTENANCE': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

function ApiEndpointCard({ 
  endpoint, 
  onEdit, 
  onViewDetails 
}: ApiEndpointCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Globe className="h-4 w-4 text-text-tertiary" />
          <CardTitle className="text-sm font-medium text-text-primary font-mono">
            {endpoint.path}
          </CardTitle>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getMethodColor(endpoint.method)}>
            {endpoint.method}
          </Badge>
          <Badge className={getStatusColor(endpoint.status)}>
            {endpoint.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary mb-3">
          {endpoint.description}
        </p>
        
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-tertiary">Version:</span>
            <span className="text-text-primary">{endpoint.version}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-tertiary">Rate Limit:</span>
            <span className="text-text-primary">
              {endpoint.rateLimit.requests} requests per {endpoint.rateLimit.window}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-tertiary">Last Modified:</span>
            <span className="text-text-primary">{new Date(endpoint.lastModified).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-text-tertiary mb-3">
          <div className="flex items-center space-x-1">
            <User className="h-3 w-3" />
            <span>Modified by {endpoint.modifiedBy}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(endpoint)}
              >
                View Details
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            {onEdit && (
              <Button
                size="sm"
                onClick={() => onEdit(endpoint)}
                className="flex items-center space-x-1"
              >
                <Settings className="h-3 w-3" />
                <span>Edit</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { ApiEndpointCard };
export default ApiEndpointCard;
