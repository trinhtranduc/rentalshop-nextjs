'use client';

import React from 'react';
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
  CardTitle,
} from '@rentalshop/ui';
import { Copy, Check } from 'lucide-react';
import type { RequestLog } from '@rentalshop/utils';

interface RequestLogDetailProps {
  log: RequestLog;
  open: boolean;
  onClose: () => void;
}

/**
 * Request Log Detail Modal
 */
export function RequestLogDetail({ log, open, onClose }: RequestLogDetailProps) {
  const [copied, setCopied] = React.useState(false);

  const copyCorrelationId = async () => {
    try {
      await navigator.clipboard.writeText(log.correlationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatJSON = (data: any) => {
    if (!data) return '—';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'success';
    if (statusCode >= 300 && statusCode < 400) return 'warning';
    if (statusCode >= 400) return 'destructive';
    return 'default';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Request Log Details</span>
            <Button
              variant="outline"
              size="sm"
              onClick={copyCorrelationId}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Correlation ID
                </>
              )}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Correlation ID
                  </label>
                  <p className="font-mono text-sm">{log.correlationId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Method
                  </label>
                  <p>
                    <Badge variant="outline">{log.method}</Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Path
                  </label>
                  <p className="text-sm break-all">{log.path}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status Code
                  </label>
                  <p>
                    <Badge variant={getStatusColor(log.statusCode)}>
                      {log.statusCode}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Duration
                  </label>
                  <p className="text-sm">{log.duration}ms</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Created At
                  </label>
                  <p className="text-sm">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Info */}
          {(log.user || log.merchant || log.ipAddress) && (
            <Card>
              <CardHeader>
                <CardTitle>User & Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  {log.user && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          User
                        </label>
                        <p className="text-sm">{log.user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.user.email} ({log.user.role})
                        </p>
                      </div>
                    </>
                  )}
                  {log.merchant && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Merchant
                      </label>
                      <p className="text-sm">{log.merchant.name}</p>
                    </div>
                  )}
                  {log.ipAddress && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        IP Address
                      </label>
                      <p className="text-sm font-mono">{log.ipAddress}</p>
                    </div>
                  )}
                  {log.userAgent && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        User Agent
                      </label>
                      <p className="text-sm break-all">{log.userAgent}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Query Params */}
          {log.queryParams && (
            <Card>
              <CardHeader>
                <CardTitle>Query Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded overflow-auto">
                  {formatJSON(log.queryParams)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Request Body */}
          {log.requestBody && (
            <Card>
              <CardHeader>
                <CardTitle>Request Body</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-64">
                  {formatJSON(log.requestBody)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Response Body */}
          {log.responseBody && (
            <Card>
              <CardHeader>
                <CardTitle>Response Body</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-64">
                  {formatJSON(log.responseBody)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {log.errorMessage && (
            <Card>
              <CardHeader>
                <CardTitle>Error Message</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-destructive break-all">
                  {log.errorMessage}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
