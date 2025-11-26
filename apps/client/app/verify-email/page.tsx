'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@rentalshop/ui';
import { authApi, storeAuthData } from '@rentalshop/utils';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const token = searchParams.get('token');
  const success = searchParams.get('success');
  const error = searchParams.get('error');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    // If token is provided in URL, verify it via API
    if (token && !success && !error) {
      verifyToken(token);
    } else if (success === 'true' && token) {
      // Token already verified by API redirect, just save it
      handleVerifiedToken(token);
    } else if (error) {
      // Error from API redirect
      setStatus('error');
      setMessage(decodeURIComponent(error));
    } else {
      // No token, success, or error - invalid state
      setStatus('error');
      setMessage('Link xác thực không hợp lệ. Vui lòng kiểm tra lại email.');
    }
  }, [token, success, error]);

  const verifyToken = async (verificationToken: string) => {
    try {
      setStatus('loading');
      const result = await authApi.verifyEmail(verificationToken);
      
      if (result.success && result.data?.token) {
        // Save token and user data
        handleVerifiedToken(result.data.token, result.data.user);
      } else {
        setStatus('error');
        setMessage(result.message || result.error || 'Token không hợp lệ hoặc đã hết hạn');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Lỗi xác thực email');
    }
  };

  const handleVerifiedToken = (jwtToken: string, user?: any) => {
    // Don't save token - user will need to login
    // Email is verified, now redirect to login page
    
    setStatus('success');
    setMessage('Email đã được xác thực thành công!');
    
    // Redirect to login after 2 seconds
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <p className="text-gray-600">Đang xác thực email...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Xác thực thành công!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-gray-600">{message}</p>
            <p className="text-center text-sm text-gray-500">
              Đang chuyển hướng đến trang đăng nhập...
            </p>
            <Button
              onClick={() => router.push('/login')}
              className="w-full"
            >
              Đi tới Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Xác thực thất bại
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-600">{message}</p>
          <div className="flex gap-3">
            <Button
              onClick={() => router.push('/login')}
              variant="outline"
              className="flex-1"
            >
              Đăng nhập
            </Button>
            <Button
              onClick={() => router.push('/email-verification')}
              className="flex-1"
            >
              Gửi lại email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

