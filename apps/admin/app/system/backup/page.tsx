'use client';

import React, { useState, useEffect } from 'react';
import { systemApi } from '@rentalshop/utils';
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
  Database, 
  Download, 
  Upload, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  HardDrive,
  Shield,
  Play,
  Pause,
  Trash2,
  Eye,
  Settings
} from 'lucide-react';

interface Backup {
  filename: string;
  size: number;
  created: string;
  modified: string;
}

interface BackupSchedule {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'schema-only';
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  retention: number;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  status: 'active' | 'paused' | 'error';
}

interface BackupVerification {
  backupId: string;
  status: 'verified' | 'failed' | 'corrupted';
  fileSize: number;
  canRestore: boolean;
  tableCount: number;
  recordCount: number;
  errors: string[];
  warnings: string[];
}

export default function BackupManagementPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'backups' | 'schedules' | 'verification'>('backups');
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [verification, setVerification] = useState<BackupVerification | null>(null);

  const fetchBackups = async () => {
    try {
      const result = await systemApi.getBackups();
      
      if (result.success) {
        setBackups(result.data?.backups || []);
      } else {
        setError(result.error || 'Failed to fetch backups');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch backups');
    }
  };

  const fetchSchedules = async () => {
    try {
      const result = await systemApi.getBackupSchedules();
      
      if (result.success) {
        setSchedules(result.data?.schedules || []);
      } else {
        setError(result.error || 'Failed to fetch schedules');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schedules');
    }
  };

  const createBackup = async (type: 'full' | 'incremental' | 'schema-only' = 'full') => {
    try {
      setLoading(true);
      const result = await systemApi.createBackup(type as 'full' | 'incremental');
      
      if (result.success) {
        await fetchBackups();
        setError(null);
      } else {
        setError(result.error || 'Failed to create backup');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const verifyBackup = async (backupId: string) => {
    try {
      setLoading(true);
      const result = await systemApi.verifyBackup(backupId);
      
      if (result.success) {
        setVerification(result.data);
        setActiveTab('verification');
      } else {
        setError(result.error || 'Failed to verify backup');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify backup');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchBackups(), fetchSchedules()]);
      setLoading(false);
    };
    
    loadData();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'corrupted':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'corrupted':
        return <Badge className="bg-yellow-100 text-yellow-800">Corrupted</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  return (
    <PageWrapper maxWidth="7xl" padding="md" spacing="md">
      <PageHeader>
        <div className="flex items-center justify-between">
          <div>
            <PageTitle subtitle="Manage database backups and restore operations">
              Backup Management
            </PageTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => createBackup('full')}
              disabled={loading}
            >
              <Database className="w-4 h-4 mr-2" />
              Create Full Backup
            </Button>
            <Button
              variant="outline"
              onClick={() => createBackup('schema-only')}
              disabled={loading}
            >
              <Shield className="w-4 h-4 mr-2" />
              Schema Only
            </Button>
          </div>
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

      {/* Tabs */}
      <div className="flex space-x-2 border-b">
        <Button
          variant={activeTab === 'backups' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('backups')}
        >
          <Database className="w-4 h-4 mr-2" />
          Backups
        </Button>
        <Button
          variant={activeTab === 'schedules' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('schedules')}
        >
          <Clock className="w-4 h-4 mr-2" />
          Schedules
        </Button>
        <Button
          variant={activeTab === 'verification' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('verification')}
        >
          <Shield className="w-4 h-4 mr-2" />
          Verification
        </Button>
      </div>

      {/* Backups Tab */}
      {activeTab === 'backups' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Database Backups ({backups.length})</span>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBackups}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                <p className="text-gray-500 mt-2">Loading backups...</p>
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-8">
                <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No backups found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Create your first backup to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {backups.map((backup, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Database className="w-8 h-8 text-blue-500" />
                      <div>
                        <h4 className="font-medium">{backup.filename}</h4>
                        <p className="text-sm text-gray-600">
                          {formatFileSize(backup.size)} • Created {formatDate(backup.created)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => verifyBackup(backup.filename.replace('.sql', '').replace('.gz', ''))}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Verify
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schedules Tab */}
      {activeTab === 'schedules' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Backup Schedules ({schedules.length})</span>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSchedules}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No backup schedules configured</p>
                <p className="text-sm text-gray-400 mt-1">
                  Set up automated backups to protect your data
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Clock className="w-8 h-8 text-green-500" />
                      <div>
                        <h4 className="font-medium">{schedule.name}</h4>
                        <p className="text-sm text-gray-600">
                          {schedule.type} backup • {schedule.frequency} at {schedule.time}
                        </p>
                        <p className="text-xs text-gray-500">
                          Next run: {schedule.nextRun ? formatDate(schedule.nextRun) : 'Not scheduled'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={schedule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {schedule.enabled ? 'Active' : 'Paused'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Verification Tab */}
      {activeTab === 'verification' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Backup Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!verification ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No verification results</p>
                <p className="text-sm text-gray-400 mt-1">
                  Select a backup and click "Verify" to check its integrity
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(verification.status)}
                    <span className="font-medium">{verification.backupId}</span>
                    {getStatusBadge(verification.status)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatFileSize(verification.fileSize)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Tables</p>
                    <p className="text-lg font-semibold">{verification.tableCount}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Records</p>
                    <p className="text-lg font-semibold">{verification.recordCount.toLocaleString()}</p>
                  </div>
                </div>

                {verification.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-2">Errors</h4>
                    <ul className="space-y-1">
                      {verification.errors.map((error, index) => (
                        <li key={index} className="text-sm text-red-600 flex items-center">
                          <XCircle className="w-3 h-3 mr-2" />
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {verification.warnings.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-700 mb-2">Warnings</h4>
                    <ul className="space-y-1">
                      {verification.warnings.map((warning, index) => (
                        <li key={index} className="text-sm text-yellow-600 flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-2" />
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      </PageContent>
    </PageWrapper>
  );
}
