'use client';

/**
 * Kiểm tra email sau khi tạo cửa hàng (#582) on the /login 4A look. Same behaviour as the shared
 * CheckEmailVerification it replaces: `?email=`, resend with `authApi.resendVerificationEmail`,
 * a 5-minute countdown after a resend or a rate limit, and back to /login.
 */
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { ShopAuthHeading, useToast } from '@rentalshop/ui';
import { authApi } from '@rentalshop/utils';
import { AuthBadge, AuthFrame, AuthNotice, authLinkBtn, authOutlineBtn } from '../components/auth/shop-auth';

const RESEND_WAIT_SECONDS = 300;

function EmailVerificationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('auth.checkEmail');
  const { toastSuccess, toastError } = useToast();
  const email = searchParams.get('email') || '';

  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0 || isResending || !email) return;
    setIsResending(true);
    setResendSuccess(false);
    try {
      const result = await authApi.resendVerificationEmail(email);
      if (result.success) {
        setResendSuccess(true);
        setCountdown(RESEND_WAIT_SECONDS);
        toastSuccess(t('resendSuccess'), t('resendSuccessMessage'));
        setTimeout(() => setResendSuccess(false), 3000);
      } else {
        throw new Error(result.message || result.error || t('sendErrorMessage'));
      }
    } catch (err: unknown) {
      const errorMessage = (err as Error)?.message || '';
      if (errorMessage.includes('quá nhiều') || errorMessage.includes('rate limit') || errorMessage.toLowerCase().includes('too many')) {
        setCountdown(RESEND_WAIT_SECONDS);
        toastError(t('rateLimitError'), t('rateLimitMessage'));
      } else {
        toastError(t('sendError'), errorMessage || t('sendErrorMessage'));
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthFrame>
      <AuthBadge tone="info" />
      <ShopAuthHeading title={t('title')} subtitle={t('subtitle')} />

      {email && (
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-sm text-slate-600">{t('emailSentTo')}</span>
          <span className="break-all text-lg font-semibold text-slate-900">{email}</span>
        </div>
      )}

      <AuthNotice tone="info">
        <p className="m-0 font-semibold">{t('nextSteps')}</p>
        <ol className="m-0 mt-1 list-decimal pl-5">
          <li>{t('step1')}</li>
          <li>{t('step2')}</li>
          <li>{t('step3')}</li>
        </ol>
      </AuthNotice>
      <AuthNotice tone="warn">{t('spamWarning')}</AuthNotice>

      {email && (
        <div className="flex justify-center" aria-live="polite">
          {isResending ? (
            <span className="inline-flex items-center gap-1.5 text-[15px] text-slate-600">
              <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" />
              {t('sending')}
            </span>
          ) : countdown > 0 ? (
            <span className="text-[15px] text-slate-600">{t('resendAfter', { minutes: Math.ceil(countdown / 60) })}</span>
          ) : resendSuccess ? (
            <span className="text-[15px] font-semibold text-green-700">{t('emailResent')}</span>
          ) : (
            <button type="button" onClick={handleResend} className={authLinkBtn}>
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              {t('resendEmail')}
            </button>
          )}
        </div>
      )}

      <button type="button" onClick={() => router.push('/login')} className={authOutlineBtn}>
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {t('backToLogin')}
      </button>
    </AuthFrame>
  );
}

export default function EmailVerificationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <EmailVerificationContent />
    </Suspense>
  );
}
