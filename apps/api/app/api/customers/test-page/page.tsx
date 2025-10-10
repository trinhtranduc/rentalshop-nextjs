'use client';

import React, { useState } from 'react';

export default function CustomerAPITestPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');

  const sampleCustomerData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    merchantId: 'test_merchant_123',
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'USA',
    idType: 'passport' as const,
    idNumber: 'AB123456',
    notes: 'Test customer'
  };

  const testEndpoints = [
    {
      name: 'Test Validation',
      endpoint: '/api/customers/test',
      method: 'POST',
      description: 'Test customer creation payload validation'
    },
    {
      name: 'Debug Payload',
      endpoint: '/api/customers/debug',
      method: 'POST',
      description: 'Debug customer creation payload with detailed analysis'
    },
    {
      name: 'Create Customer',
      endpoint: '/api/customers',
      method: 'POST',
      description: 'Actually create a customer (use with caution)'
    },
    {
      name: 'Get Customers',
      endpoint: '/api/customers',
      method: 'GET',
      description: 'Get customers list'
    }
  ];

  const runTest = async (endpoint: string, method: string, data?: any) => {
    if (!token) {
      // Toast notification would be handled by parent component
      return;
    }

    setLoading(true);
    setTestResults(null);

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      const result = await response.json();
      
      setTestResults({
        endpoint,
        method,
        status: response.status,
        statusText: response.statusText,
        response: result,
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setTestResults({
        endpoint,
        method,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const runValidationTest = () => {
    runTest('/api/customers/test', 'POST', sampleCustomerData);
  };

  const runDebugTest = () => {
    runTest('/api/customers/debug', 'POST', sampleCustomerData);
  };

  const runCreateTest = () => {
    if (confirm('This will actually create a customer. Continue?')) {
      runTest('/api/customers', 'POST', sampleCustomerData);
    }
  };

  const runGetTest = () => {
    runTest('/api/customers', 'GET');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Customer API Test Page</h1>
      
      {/* Configuration */}
      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="http://localhost:3000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">JWT Token</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Enter your JWT token"
            />
          </div>
        </div>
      </div>

      {/* Sample Data */}
      <div className="bg-blue-50 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">Sample Customer Data</h2>
        <pre className="bg-white p-4 rounded border overflow-x-auto text-sm">
          {JSON.stringify(sampleCustomerData, null, 2)}
        </pre>
      </div>

      {/* Test Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <button
          onClick={runValidationTest}
          disabled={loading}
          className="bg-green-500 text-white p-4 rounded-lg hover:bg-green-600 disabled:opacity-50"
        >
          Test Validation
        </button>
        <button
          onClick={runDebugTest}
          disabled={loading}
          className="bg-blue-500 text-white p-4 rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          Debug Payload
        </button>
        <button
          onClick={runCreateTest}
          disabled={loading}
          className="bg-orange-500 text-white p-4 rounded-lg hover:bg-orange-600 disabled:opacity-50"
        >
          Create Customer
        </button>
        <button
          onClick={runGetTest}
          disabled={loading}
          className="bg-purple-500 text-white p-4 rounded-lg hover:bg-purple-600 disabled:opacity-50"
        >
          Get Customers
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Running test...</p>
        </div>
      )}

      {/* Test Results */}
      {testResults && (
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <strong>Endpoint:</strong> {testResults.endpoint}
            </div>
            <div>
              <strong>Method:</strong> {testResults.method}
            </div>
            {testResults.status && (
              <div>
                <strong>Status:</strong> {testResults.status} {testResults.statusText}
              </div>
            )}
            <div>
              <strong>Timestamp:</strong> {testResults.timestamp}
            </div>
          </div>

          {testResults.error ? (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <strong>Error:</strong> {testResults.error}
            </div>
          ) : (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
              <strong>Success!</strong> Request completed
            </div>
          )}

          {testResults.response && (
            <div>
              <h3 className="text-lg font-medium mb-2">Response:</h3>
              <pre className="bg-white p-4 rounded border overflow-x-auto text-sm">
                {JSON.stringify(testResults.response, null, 2)}
              </pre>
            </div>
          )}

          {testResults.headers && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Response Headers:</h3>
              <pre className="bg-white p-4 rounded border overflow-x-auto text-sm">
                {JSON.stringify(testResults.headers, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* API Documentation Link */}
      <div className="mt-8 text-center">
        <a
          href="/api/customers/docs"
          className="text-blue-500 hover:text-blue-700 underline"
        >
          View Full API Documentation
        </a>
      </div>
    </div>
  );
}
