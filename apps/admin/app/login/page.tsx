'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@rentalshop/ui';
import { Eye, EyeOff, Mail, Lock, Store } from 'lucide-react';
import { authApi, storeAuthData } from '@rentalshop/utils';
import { useAuth } from '../providers/AuthProvider';

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginFormProps {
  onLogin?: (data: LoginFormData) => Promise<void>;
  onNavigate?: (path: string) => void;
  error?: string | null;
  loading?: boolean;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [viewPass, setViewPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Use centralized auth API
      const response = await authApi.login(formData);

      if (response.success && response.data) {
        // Store auth data using centralized function
        storeAuthData(response.data.token, response.data.user);
        // Update the auth context
        login(response.data.user, response.data.token);
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-gradient-to-br from-action-primary to-brand-primary rounded-lg flex items-center justify-center">
            <Store className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-text-primary">
            Admin Sign In
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            Sign in to access the admin panel
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-action-danger/10 border border-action-danger/20 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-action-danger">
                    Login Error
                  </h3>
                  <div className="mt-2 text-sm text-action-danger">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-text-tertiary" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-border rounded-lg placeholder-text-tertiary text-text-primary bg-bg-card focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-transparent focus:z-10 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-text-tertiary" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={viewPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="appearance-none relative block w-full pl-10 pr-10 py-2 border border-border rounded-lg placeholder-text-tertiary text-text-primary bg-bg-card focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-transparent focus:z-10 sm:text-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setViewPass(!viewPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {viewPass ? (
                    <EyeOff className="h-5 w-5 text-text-tertiary hover:text-text-secondary" />
                  ) : (
                    <Eye className="h-5 w-5 text-text-tertiary hover:text-text-secondary" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-text-inverted bg-action-primary hover:bg-action-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-action-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>

          <div className="text-center">
            <a
              href="/forget-password"
              className="font-medium text-action-primary hover:text-action-primary/80 text-sm"
            >
              Forgot your password?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
} 