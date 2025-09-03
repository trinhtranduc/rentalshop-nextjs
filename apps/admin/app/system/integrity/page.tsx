'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Button,
  Badge,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent
} from '@rentalshop/ui';
import { 
  ShieldCheck, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Database,
  Users,
  ShoppingCart,
  CreditCard,
  Package,
  FileText,
  Activity
} from 'lucide-react';

interface IntegrityCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface IntegrityReport {
  overall: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  checks: IntegrityCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export default function DataIntegrityPage() {
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const runIntegrityCheck = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/system/integrity');
      const data = await response.json();
      
      if (data.overall) {
        setReport(data);
        setLastChecked(new Date());
      } else {
        setError('Failed to get integrity report');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run integrity check');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runIntegrityCheck();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-green-100 text-green-800">Pass</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'fail':
        return <Badge className="bg-red-100 text-red-800">Fail</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'low':
        return <Badge className="bg-blue-100 text-blue-800">Low</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getOverallStatusIcon = (overall: string) => {
    switch (overall) {
      case 'healthy':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-8 h-8 text-yellow-500" />;
      case 'critical':
        return <XCircle className="w-8 h-8 text-red-500" />;
      default:
        return <Info className="w-8 h-8 text-gray-500" />;
    }
  };

  const getOverallStatusBadge = (overall: string) => {
    switch (overall) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800">Degraded</Badge>;
      case 'critical':
        return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getCheckIcon = (name: string) => {
    switch (name) {
      case 'order_customer_integrity':
        return <ShoppingCart className="w-4 h-4" />;
      case 'order_product_integrity':
        return <Package className="w-4 h-4" />;
      case 'user_outlet_integrity':
        return <Users className="w-4 h-4" />;
      case 'product_stock_consistency':
        return <Database className="w-4 h-4" />;
      case 'payment_order_integrity':
        return <CreditCard className="w-4 h-4" />;
      case 'audit_log_completeness':
        return <FileText className="w-4 h-4" />;
      case 'data_consistency':
        return <Activity className="w-4 h-4" />;
      case 'orphaned_records':
        return <Database className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const formatCheckName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <PageWrapper maxWidth="7xl" padding="md" spacing="md">
      <PageHeader>
        <div className="flex items-center justify-between">
          <div>
            <PageTitle subtitle="Monitor data consistency and relationship integrity">
              Data Integrity
            </PageTitle>
            {lastChecked && (
              <p className="text-sm text-gray-500 mt-1">
                Last checked: {lastChecked.toLocaleString()}
              </p>
            )}
          </div>
          <Button
            onClick={runIntegrityCheck}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Run Check
          </Button>
        </div>
      </PageHeader>

      <PageContent>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Status */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getOverallStatusIcon(report.overall)}
              Overall Data Integrity Status
              {getOverallStatusBadge(report.overall)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{report.summary.passed}</p>
                <p className="text-sm text-gray-600">Passed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{report.summary.warnings}</p>
                <p className="text-sm text-gray-600">Warnings</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{report.summary.failed}</p>
                <p className="text-sm text-gray-600">Failed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{report.summary.total}</p>
                <p className="text-sm text-gray-600">Total Checks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && !report && (
        <Card>
          <CardContent className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-2">Running integrity checks...</p>
          </CardContent>
        </Card>
      )}

      {/* Integrity Checks */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Integrity Checks ({report.checks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.checks.map((check, index) => (
                <div key={index} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex items-start space-x-3 flex-1">
                    {getCheckIcon(check.name)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{formatCheckName(check.name)}</h4>
                        {getStatusBadge(check.status)}
                        {getSeverityBadge(check.severity)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{check.message}</p>
                      
                      {check.details && (
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          {check.name === 'order_customer_integrity' && check.details.invalidOrders && (
                            <div>
                              <p className="font-medium">Invalid Orders:</p>
                              <ul className="mt-1">
                                {check.details.invalidOrders.slice(0, 3).map((order: any, i: number) => (
                                  <li key={i}>Order {order.orderNumber} (ID: {order.customerId})</li>
                                ))}
                                {check.details.invalidOrders.length > 3 && (
                                  <li>... and {check.details.invalidOrders.length - 3} more</li>
                                )}
                              </ul>
                            </div>
                          )}
                          
                          {check.name === 'product_stock_consistency' && check.details.negativeStock && (
                            <div>
                              <p className="font-medium">Products with Negative Stock:</p>
                              <ul className="mt-1">
                                {check.details.negativeStock.slice(0, 3).map((product: any, i: number) => (
                                  <li key={i}>{product.name} (Stock: {product.stock})</li>
                                ))}
                                {check.details.negativeStock.length > 3 && (
                                  <li>... and {check.details.negativeStock.length - 3} more</li>
                                )}
                              </ul>
                            </div>
                          )}
                          
                          {check.name === 'audit_log_completeness' && check.details && (
                            <div>
                              <p>Operations: {check.details.operationsCount}, Audit Logs: {check.details.auditLogsCount}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    {getStatusIcon(check.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {!loading && !report && !error && (
        <Card>
          <CardContent className="text-center py-8">
            <ShieldCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No integrity report available</p>
            <p className="text-sm text-gray-400 mt-1">
              Click "Run Check" to perform data integrity verification
            </p>
          </CardContent>
        </Card>
      )}
      </PageContent>
    </PageWrapper>
  );
}
