'use client';

import React, { useState } from 'react';
import { loginUser } from '../../lib/auth/auth';

export default function TestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await loginUser('client@rentalshop.com', 'client123');
      setResult(response);
      
      if (response.success) {
        console.log('Login successful:', response);
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err: any) {
      console.error('Test failed:', err);
      setError(err.message || 'Test failed');
    } finally {
      setLoading(false);
    }
  };

  const testApiConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/health/database');
      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        console.log('API connection successful:', data);
      } else {
        setError(data.message || 'API connection failed');
      }
    } catch (err: any) {
      console.error('API test failed:', err);
      setError(err.message || 'API test failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Client App Test Page</h1>
        
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test API Connection</h2>
            <button
              onClick={testApiConnection}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test API Connection'}
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Login</h2>
            <button
              onClick={testLogin}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Test Login'}
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}

          {result && (
            <div className="bg-gray-100 p-4 rounded">
              <h3 className="font-semibold mb-2">Result:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <div className="space-y-2 text-sm">
            <div><strong>API URL:</strong> {process.env.API_URL || 'http://localhost:3002'}</div>
            <div><strong>Client URL:</strong> {process.env.CLIENT_URL_LOCAL || 'http://localhost:3000'}</div>
            <div><strong>Node Environment:</strong> {process.env.NODE_ENV}</div>
          </div>
        </div>
      </div>
    </div>
  );
} 