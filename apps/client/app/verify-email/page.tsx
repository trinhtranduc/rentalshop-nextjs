'use client';

/**
 * Xác thực email (#582) on the /login 4A look. Same params as before: `?token=` is verified with
 * `authApi.verifyEmail`; `?success=true&token=` (API redirect) and `?error=` are shown as they come.
 * Success goes to /login after 2 s; the token is not stored (the user logs in).
 */
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShopAuthHeading } from '@rentalshop/ui';
import { authApi } from '@rentalshop/utils';
import { AuthBadge, AuthFrame, AuthSpinner, authOutlineBtn, authPrimaryBtn } from '../components/auth/shop-auth';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('auth.verifyEmail');

  const token = searchParams.get('token');
  const success = searchParams.get('success');
  const error = searchParams.get('error');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const verified = () => {
      setStatus('success');
      setMessage(t('successMessage'));
      timer = setTimeout(() => router.push('/login'), 2000);
    };
    const verifyToken = async (verificationToken: string) => {
      try {
        setStatus('loading');
        const result = await authApi.verifyEmail(verificationToken);
        if (result.success && result.data?.token) {
          verified();
        } else {
          setStatus('error');
          setMessage(result.message || result.error || t('tokenInvalid'));
        }
      } catch (err: unknown) {
        setStatus('error');
        setMessage((err as Error)?.message || t('failed'));
      }
    };

    if (token && !success && !error) {
      void verifyToken(token);
    } else if (success === 'true' && token) {
      // Token already verified by the API redirect
      verified();
    } else if (error) {
      setStatus('error');
      let text = error;
      try {
        text = decodeURIComponent(error);
      } catch {
        // keep the raw text
      }
      setMessage(text);
    } else {
      setStatus('error');
      setMessage(t('invalidLink'));
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
    // t is stable per locale; re-running on it would verify the token twice
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, success, error, router]);

  if (status === 'loading') {
    return (
      <AuthFrame>
        <div className="flex flex-col items-center gap-4 py-6" role="status">
          <AuthSpinner light={false} />
          <p className="m-0 text-base text-slate-600">{t('verifying')}</p>
        </div>
      </AuthFrame>
    );
  }

  if (status === 'success') {
    return (
      <AuthFrame>
        <AuthBadge tone="success" />
        <ShopAuthHeading title={t('successTitle')} subtitle={message} />
        <button type="button" onClick={() => router.push('/login')} className={authPrimaryBtn}>
          {t('goToLogin')}
        </button>
        <p className="m-0 text-center text-sm text-slate-500">{t('redirecting')}</p>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <AuthBadge tone="error" />
      <ShopAuthHeading title={t('failedTitle')} subtitle={message} />
      <button type="button" onClick={() => router.push('/email-verification')} className={authPrimaryBtn}>
        {t('resend')}
      </button>
      <button type="button" onClick={() => router.push('/login')} className={authOutlineBtn}>
        {t('login')}
      </button>
    </AuthFrame>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
