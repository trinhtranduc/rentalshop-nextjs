import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { 
  Key, 
  Copy, 
  Eye, 
  EyeOff, 
  Trash2, 
  XCircle,
  Clock,
  User,
  Activity
} from 'lucide-react';

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  type: 'READ' | 'WRITE' | 'ADMIN' | 'WEBHOOK';
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'REVOKED';
  permissions: string[];
  lastUsed?: string;
  createdAt: string;
  expiresAt?: string;
  createdBy: string;
  description: string;
  usage: {
    requests: number;
    limit: number;
    resetDate: string;
  };
}

interface ApiKeyCardProps {
  apiKey: ApiKey;
  onCopy?: (key: string) => void;
  onRevoke?: (keyId: string) => void;
  onDelete?: (keyId: string) => void;
  onViewDetails?: (apiKey: ApiKey) => void;
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'READ': return 'bg-blue-100 text-blue-800';
    case 'WRITE': return 'bg-green-100 text-green-800';
    case 'ADMIN': return 'bg-red-100 text-red-800';
    case 'WEBHOOK': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800';
    case 'INACTIVE': return 'bg-yellow-100 text-yellow-800';
    case 'EXPIRED': return 'bg-red-100 text-red-800';
    case 'REVOKED': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

function ApiKeyCard({ 
  apiKey, 
  onCopy, 
  onRevoke, 
  onDelete, 
  onViewDetails 
}: ApiKeyCardProps) {
  const [showKey, setShowKey] = useState(false);

  const toggleKeyVisibility = () => {
    setShowKey(!showKey);
  };

  const handleCopy = () => {
    if (onCopy) {
      onCopy(apiKey.key);
    } else {
      navigator.clipboard.writeText(apiKey.key);
    }
  };

  const usagePercentage = (apiKey.usage.requests / apiKey.usage.limit) * 100;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Key className="h-4 w-4 text-text-tertiary" />
          <CardTitle className="text-sm font-medium text-text-primary">
            {apiKey.name}
          </CardTitle>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getTypeColor(apiKey.type)}>
            {apiKey.type}
          </Badge>
          <Badge className={getStatusColor(apiKey.status)}>
            {apiKey.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary mb-3">
          {apiKey.description}
        </p>
        
        <div className="mb-3">
          <div className="flex items-center space-x-2 mb-2">
            <code className="text-xs bg-bg-secondary px-2 py-1 rounded font-mono flex-1">
              {showKey ? apiKey.key : '••••••••••••••••••••••••'}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleKeyVisibility}
              className="h-6 w-6 p-0"
            >
              {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-6 w-6 p-0"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-tertiary">Usage:</span>
            <span className="text-text-primary">
              {apiKey.usage.requests.toLocaleString()} / {apiKey.usage.limit.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                usagePercentage > 90 ? 'bg-red-500' : 
                usagePercentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-tertiary">Created:</span>
            <span className="text-text-primary">{new Date(apiKey.createdAt).toLocaleDateString()}</span>
          </div>
          {apiKey.lastUsed && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">Last Used:</span>
              <span className="text-text-primary">{new Date(apiKey.lastUsed).toLocaleDateString()}</span>
            </div>
          )}
          {apiKey.expiresAt && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">Expires:</span>
              <span className="text-text-primary">{new Date(apiKey.expiresAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="mb-3">
          <p className="text-xs text-text-tertiary mb-1">Permissions:</p>
          <div className="flex flex-wrap gap-1">
            {apiKey.permissions.map((permission, index) => (
              <span key={index} className="text-xs bg-bg-secondary px-2 py-1 rounded">
                {permission}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-text-tertiary mb-3">
          <div className="flex items-center space-x-1">
            <User className="h-3 w-3" />
            <span>{apiKey.createdBy}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(apiKey)}
              >
                View Details
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            {apiKey.status === 'ACTIVE' && onRevoke && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRevoke(apiKey.id)}
                className="flex items-center space-x-1"
              >
                <XCircle className="h-3 w-3" />
                <span>Revoke</span>
              </Button>
            )}
            
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(apiKey.id)}
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

export { ApiKeyCard };
export default ApiKeyCard;
