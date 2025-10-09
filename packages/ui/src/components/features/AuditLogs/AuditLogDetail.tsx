"use client";

import React, { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@rentalshop/ui';
import { 
  User,
  Calendar,
  MapPin,
  Monitor,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';

// Types
interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
  merchant?: {
    id: number;
    name: string;
  };
  outlet?: {
    id: number;
    name: string;
  };
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changes?: Record<string, { old: any; new: any }>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  category: 'GENERAL' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' | 'COMPLIANCE';
  description?: string;
  createdAt: string;
}

interface AuditLogDetailProps {
  log: AuditLog | null;
  isOpen: boolean;
  onClose: () => void;
}

// Severity badge component
function SeverityBadge({ severity }: { severity: string }) {
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'ERROR':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      case 'INFO':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <XCircle className="w-3 h-3" />;
      case 'ERROR':
        return <XCircle className="w-3 h-3" />;
      case 'WARNING':
        return <AlertTriangle className="w-3 h-3" />;
      case 'INFO':
        return <Info className="w-3 h-3" />;
      default:
        return <Info className="w-3 h-3" />;
    }
  };

  return (
    <Badge className={`inline-flex items-center gap-1 ${getSeverityStyle(severity)}`}>
      {getSeverityIcon(severity)}
      {severity}
    </Badge>
  );
}

// Action badge component
function ActionBadge({ action }: { action: string }) {
  const getActionStyle = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'LOGIN':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800';
      case 'LOGOUT':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
      case 'VIEW':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
    }
  };

  return (
    <Badge className={getActionStyle(action)}>
      {action}
    </Badge>
  );
}

// JSON viewer component
function JsonViewer({ data, title }: { data: any; title: string }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-text-secondary text-sm">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          {title}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre className={`text-xs font-mono bg-bg-secondary p-3 rounded-lg overflow-auto ${
          isExpanded ? 'max-h-96' : 'max-h-32'
        }`}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}

// Changes viewer component
function ChangesViewer({ changes }: { changes?: Record<string, { old: any; new: any }> }) {
  if (!changes || Object.keys(changes).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-text-secondary text-sm">No changes detected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Changes ({Object.keys(changes).length} fields)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(changes).map(([field, change]) => (
            <div key={field} className="border rounded-lg p-3">
              <div className="font-medium text-sm mb-2">{field}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-text-secondary mb-1">Old Value</div>
                  <div className="text-xs font-mono bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    {change.old === null ? 'null' : JSON.stringify(change.old)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-secondary mb-1">New Value</div>
                  <div className="text-xs font-mono bg-green-50 dark:bg-green-900/20 p-2 rounded">
                    {change.new === null ? 'null' : JSON.stringify(change.new)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Main audit log detail component
export function AuditLogDetail({ log, isOpen, onClose }: AuditLogDetailProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'changes' | 'context' | 'raw'>('overview');
  
  if (!log) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'SECURITY':
        return <AlertTriangle className="w-4 h-4" />;
      case 'BUSINESS':
        return <Activity className="w-4 h-4" />;
      case 'SYSTEM':
        return <Monitor className="w-4 h-4" />;
      case 'COMPLIANCE':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Audit Log Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Information */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <ActionBadge action={log.action} />
                <SeverityBadge severity={log.severity} />
                <Badge variant="outline" className="flex items-center gap-1">
                  {getCategoryIcon(log.category)}
                  {log.category}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {log.entityType}: {log.entityName || log.entityId}
                </h3>
                {log.description && (
                  <p className="text-text-secondary">{log.description}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tab navigation */}
          <div className="space-y-4">
            <div className="flex space-x-2 border-b">
              <Button
                variant={activeTab === 'overview' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('overview')}
                size="sm"
              >
                Overview
              </Button>
              <Button
                variant={activeTab === 'changes' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('changes')}
                size="sm"
              >
                Changes
              </Button>
              <Button
                variant={activeTab === 'context' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('context')}
                size="sm"
              >
                Context
              </Button>
              <Button
                variant={activeTab === 'raw' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('raw')}
                size="sm"
              >
                Raw Data
              </Button>
            </div>

            {activeTab === 'overview' && (
              <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="w-4 h-4" />
                      User Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {log.user ? (
                      <>
                        <div>
                          <div className="text-xs text-text-secondary">Name</div>
                          <div className="text-sm font-medium">{log.user.name}</div>
                        </div>
                        <div>
                          <div className="text-xs text-text-secondary">Email</div>
                          <div className="text-sm">{log.user.email}</div>
                        </div>
                        <div>
                          <div className="text-xs text-text-secondary">Role</div>
                          <div className="text-sm">{log.user.role}</div>
                        </div>
                      </>
                    ) : (
                      <p className="text-text-secondary text-sm">No user information available</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Event Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <div className="text-xs text-text-secondary">Timestamp</div>
                      <div className="text-sm">{formatDate(log.createdAt)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-text-secondary">Action</div>
                      <div className="text-sm">{log.action}</div>
                    </div>
                    <div>
                      <div className="text-xs text-text-secondary">Entity Type</div>
                      <div className="text-sm">{log.entityType}</div>
                    </div>
                    <div>
                      <div className="text-xs text-text-secondary">Entity ID</div>
                      <div className="text-sm font-mono">{log.entityId}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {log.merchant && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Merchant Context</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-text-secondary">Merchant Name</div>
                        <div className="text-sm font-medium">{log.merchant.name}</div>
                      </div>
                      <div>
                        <div className="text-xs text-text-secondary">Merchant ID</div>
                        <div className="text-sm font-mono">{log.merchant.id}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {log.outlet && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Outlet Context</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-text-secondary">Outlet Name</div>
                        <div className="text-sm font-medium">{log.outlet.name}</div>
                      </div>
                      <div>
                        <div className="text-xs text-text-secondary">Outlet ID</div>
                        <div className="text-sm font-mono">{log.outlet.id}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              </div>
            )}

            {activeTab === 'changes' && (
              <div className="space-y-4">
                <ChangesViewer changes={log.changes} />
              </div>
            )}

            {activeTab === 'context' && (
              <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Network Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <div className="text-xs text-text-secondary">IP Address</div>
                      <div className="text-sm font-mono">{log.ipAddress || 'Unknown'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-text-secondary">Session ID</div>
                      <div className="text-sm font-mono">{log.sessionId || 'Unknown'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-text-secondary">Request ID</div>
                      <div className="text-sm font-mono">{log.requestId || 'Unknown'}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      User Agent
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs font-mono bg-bg-secondary p-2 rounded break-all">
                      {log.userAgent || 'Unknown'}
                    </div>
                  </CardContent>
                </Card>
              </div>
              </div>
            )}

            {activeTab === 'raw' && (
              <div className="space-y-4">
                <JsonViewer data={log.oldValues} title="Old Values" />
                <JsonViewer data={log.newValues} title="New Values" />
                <JsonViewer data={log.metadata} title="Metadata" />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
