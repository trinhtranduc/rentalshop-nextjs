'use client';

import { useState } from 'react';

export default function AuthHelperPage() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.data.token);
        // Use consolidated storeAuthData function
        const { storeAuthData } = await import('@rentalshop/utils');
        storeAuthData(data.data.token, data.data.user);
        setMessage('✅ Login successful! Token saved to localStorage.');
      } else {
        setMessage(`❌ Login failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setMessage(`❌ Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password, 
          name: 'Test User' 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.data.token);
        // Use consolidated storeAuthData function
        const { storeAuthData } = await import('@rentalshop/utils');
        storeAuthData(data.data.token, data.data.user);
        setMessage('✅ Registration successful! Token saved to localStorage.');
      } else {
        setMessage(`❌ Registration failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setMessage(`❌ Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setMessage('✅ Token copied to clipboard!');
  };

  const clearToken = () => {
    setToken('');
    localStorage.removeItem('authToken');
    setMessage('✅ Token cleared from localStorage.');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">🔐 API Authentication Helper</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="test@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="password123"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Login'}
            </button>
            <button
              onClick={handleRegister}
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Register'}
            </button>
          </div>

          {message && (
            <div className={`p-3 rounded-md text-sm ${
              message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {token && (
            <div className="border border-gray-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">JWT Token:</h3>
              <div className="bg-gray-100 p-2 rounded text-xs font-mono break-all">
                {token}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={copyToken}
                  className="bg-gray-600 text-white py-1 px-3 rounded text-sm hover:bg-gray-700"
                >
                  Copy Token
                </button>
                <button
                  onClick={clearToken}
                  className="bg-red-600 text-white py-1 px-3 rounded text-sm hover:bg-red-700"
                >
                  Clear Token
                </button>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">💡 How to use:</h3>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Login or Register to get a JWT token</li>
              <li>2. The token will be automatically saved to localStorage</li>
              <li>3. Go to <a href="/docs" className="underline">API Documentation</a></li>
              <li>4. Click "Authorize" and paste your token</li>
              <li>5. Test the protected endpoints!</li>
            </ol>
          </div>

          <div className="text-center">
            <a
              href="/docs"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              🚀 Go to API Documentation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 