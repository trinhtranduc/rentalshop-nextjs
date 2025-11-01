'use client';

import React, { useState, useEffect } from 'react';
import { Mail, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
// Import from relative paths to avoid circular dependency
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { useToast } from '../../ui/toast';
import { authApi } from '@rentalshop/utils';
import { useAuthTranslations } from '@rentalshop/hooks';

export interface CheckEmailVerificationProps {
  email: string;
  onBackToLogin?: () => void;
}

/**
 * Component hiển thị trang thông báo check email sau khi đăng ký
 * Có nút resend email với rate limiting và countdown
 */
export const CheckEmailVerification: React.FC<CheckEmailVerificationProps> = ({
  email,
  onBackToLogin
}) => {
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const { toastSuccess, toastError } = useToast();
  const t = useAuthTranslations();
  
  // Debug: Log translation to help troubleshoot
  useEffect(() => {
    console.log('🔍 CheckEmailVerification translation debug:', {
      'checkEmail.spamWarning': t('checkEmail.spamWarning'),
      'checkEmail.title': t('checkEmail.title'),
      'checkEmail.subtitle': t('checkEmail.subtitle'),
    });
  }, [t]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0 || isResending || !email) return;

    setIsResending(true);
    setResendSuccess(false);

    try {
      const result = await authApi.resendVerificationEmail(email);
      
      if (result.success) {
        setResendSuccess(true);
        setCountdown(300); // 5 phút
        toastSuccess(t('checkEmail.resendSuccess'), t('checkEmail.resendSuccessMessage'));
        setTimeout(() => setResendSuccess(false), 3000);
      } else {
        throw new Error(result.message || result.error || t('checkEmail.sendErrorMessage'));
      }
    } catch (error: any) {
      const errorMessage = error.message || '';
      if (errorMessage.includes('quá nhiều') || errorMessage.includes('rate limit') || errorMessage.toLowerCase().includes('too many')) {
        setCountdown(300);
        toastError(t('checkEmail.rateLimitError'), t('checkEmail.rateLimitMessage'));
      } else {
        toastError(t('checkEmail.sendError'), errorMessage || t('checkEmail.sendErrorMessage'));
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto relative z-10">
      <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4 pb-4">
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-10 h-10 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {t('checkEmail.title')}
          </CardTitle>
          <CardDescription className="text-gray-600 text-base">
            {t('checkEmail.subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Email Display */}
          {email && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                {t('checkEmail.emailSentTo')}
              </p>
              <p className="text-lg font-semibold text-gray-900 break-all">
                {email}
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm text-blue-800">
                <p className="font-medium text-blue-900 mb-2">{t('checkEmail.nextSteps')}</p>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>{t('checkEmail.step1')}</li>
                  <li>{t('checkEmail.step2')}</li>
                  <li>{t('checkEmail.step3')}</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Spam Warning */}
          <div className="flex items-start space-x-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-yellow-800">
              {t('checkEmail.spamWarning')}
            </p>
          </div>

          {/* Resend Link - Inline link to prevent rapid clicking */}
          {email && (
            <div className="text-center space-y-2">
              {isResending ? (
                <div className="text-sm text-gray-600 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t('checkEmail.sending')}
                </div>
              ) : countdown > 0 ? (
                <p className="text-sm text-gray-600">
                  {t('checkEmail.resendAfter', { minutes: Math.ceil(countdown / 60) })}
                </p>
              ) : resendSuccess ? (
                <div className="text-sm text-green-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {t('checkEmail.emailResent')}
                </div>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={isResending || countdown > 0}
                  className="text-sm text-blue-700 hover:text-blue-800 underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline transition-colors inline-flex items-center"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  {t('checkEmail.resendEmail')}
                </button>
              )}
            </div>
          )}

          {/* Back to Login */}
          <div className="pt-4 border-t border-gray-200">
            <Button
              onClick={onBackToLogin}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('checkEmail.backToLogin')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

