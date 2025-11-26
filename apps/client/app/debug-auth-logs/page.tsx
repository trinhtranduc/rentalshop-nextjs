'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@rentalshop/ui';
import { Button } from '@rentalshop/ui';

export default function DebugAuthLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loginTime, setLoginTime] = useState<string | null>(null);
  const [allLogs, setAllLogs] = useState<any>({});

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = () => {
    try {
      const logsData = localStorage.getItem('auth_error_logs');
      const loginTimeData = localStorage.getItem('last_login_time');
      
      // Load all debug data
      const debugData: any = {
        authErrorLogs: logsData ? JSON.parse(logsData) : [],
        lastLoginTime: loginTimeData ? new Date(parseInt(loginTimeData, 10)).toISOString() : null,
        currentTime: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A',
        url: typeof window !== 'undefined' ? window.location.href : 'N/A',
      };
      
      // Try to get auth data (without exposing token)
      try {
        const authData = localStorage.getItem('authData');
        if (authData) {
          const parsed = JSON.parse(authData);
          debugData.authData = {
            hasToken: !!parsed.token,
            tokenLength: parsed.token ? parsed.token.length : 0,
            userEmail: parsed.user?.email,
            userRole: parsed.user?.role,
            expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt).toISOString() : null,
            isExpired: parsed.expiresAt ? Date.now() > parsed.expiresAt : null,
          };
        }
      } catch (e) {
        console.warn('Could not parse authData:', e);
      }
      
      setAllLogs(debugData);
      
      if (logsData) {
        setLogs(JSON.parse(logsData));
      }
      
      if (loginTimeData) {
        const time = parseInt(loginTimeData, 10);
        setLoginTime(new Date(time).toISOString());
      }
    } catch (e) {
      console.error('Failed to load logs:', e);
    }
  };

  const clearLogs = () => {
    if (confirm('Are you sure you want to clear all logs?')) {
      localStorage.removeItem('auth_error_logs');
      setLogs([]);
      setAllLogs({});
    }
  };

  const exportLogs = () => {
    try {
      const exportData = {
        ...allLogs,
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auth-debug-logs-${new Date().toISOString().replace(/:/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('✅ Logs exported successfully');
    } catch (e) {
      console.error('Failed to export logs:', e);
      alert('Failed to export logs: ' + e);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Auth Error Logs (Debug)</CardTitle>
          <div className="flex gap-2 mt-2">
            <Button onClick={loadLogs}>Refresh</Button>
            <Button variant="outline" onClick={exportLogs}>Export to File</Button>
            <Button variant="destructive" onClick={clearLogs}>Clear Logs</Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Debug Info Section */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold mb-2">Debug Information</h3>
            <div className="text-sm space-y-1">
              {allLogs.lastLoginTime && (
                <div><strong>Last Login Time:</strong> {allLogs.lastLoginTime}</div>
              )}
              <div><strong>Current Time:</strong> {allLogs.currentTime}</div>
              {allLogs.authData && (
                <div className="mt-2 p-2 bg-white rounded">
                  <strong>Auth Data:</strong>
                  <pre className="text-xs mt-1">{JSON.stringify(allLogs.authData, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
          
          {/* Error Logs Section */}
          <div>
            <h3 className="font-bold mb-2">Error Logs ({logs.length})</h3>
            {logs.length === 0 ? (
              <p className="text-gray-500">No error logs found.</p>
            ) : (
              <div className="space-y-4">
                {logs.map((log, index) => (
                  <div key={index} className="p-4 border rounded bg-red-50">
                    <div className="font-bold mb-2 text-red-700">Error #{logs.length - index}</div>
                    <div className="text-sm space-y-1">
                      <div><strong>Time:</strong> {log.timestamp}</div>
                      <div><strong>URL:</strong> <span className="font-mono text-xs break-all">{log.url}</span></div>
                      <div><strong>Method:</strong> {log.method}</div>
                      <div><strong>Token:</strong> {log.token}</div>
                      {log.headers && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-blue-600">Request Headers</summary>
                          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                            {JSON.stringify(log.headers, null, 2)}
                          </pre>
                        </details>
                      )}
                      {log.stackTrace && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-blue-600">Stack Trace</summary>
                          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                            {log.stackTrace}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

