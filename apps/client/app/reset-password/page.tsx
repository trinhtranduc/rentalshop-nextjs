'use client';

/**
 * Đặt lại mật khẩu (#582) on the /login 4A look. Same `?token=` handling and the same call:
 * `authApi.resetPassword(token, password, confirmPassword)`, then /login after 3 s. The done card shows
 * only when the API says success (the old shared form showed it on errors too).
 */
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
import { ShopAuthHeading } from '@rentalshop/ui';
import { authApi } from '@rentalshop/utils';
import {
  AuthBadge,
  AuthFrame,
  AuthNotice,
  AuthSpinner,
  authFieldClass,
  authIconClass,
  authLabelClass,
  authLinkBtn,
  authPrimaryBtn,
} from '../components/auth/shop-auth';

type Values = { password: string; confirmPassword: string };

function PasswordField({
  id,
  name,
  label,
  value,
  error,
  autoComplete,
  onChange,
  onBlur,
}: {
  id: string;
  name: keyof Values;
  label: string;
  value: string;
  error?: string;
  autoComplete: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={authLabelClass}>
        {label}
      </label>
      <div className="relative">
        <Lock aria-hidden="true" className={authIconClass} />
        <input
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          className={`${authFieldClass(!!error)} pr-12`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={label}
          aria-pressed={show}
          className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-slate-800"
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="m-0 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('auth');
  const token = searchParams.get('token');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const form = useFormik<Values>({
    initialValues: { password: '', confirmPassword: '' },
    validationSchema: Yup.object({
      password: Yup.string().min(6, t('resetPassword.passwordMinLength')).required(t('resetPassword.passwordRequired')),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], t('resetPassword.passwordMismatch'))
        .required(t('resetPassword.confirmPasswordRequired')),
    }),
    onSubmit: async ({ password, confirmPassword }) => {
      if (!token) return;
      try {
        setLoading(true);
        setError(null);
        const result = await authApi.resetPassword(token, password, confirmPassword);
        if (!result.success) {
          if (result.code === 'PASSWORD_RESET_TOKEN_INVALID' || result.code === 'PASSWORD_RESET_TOKEN_EXPIRED') {
            throw new Error(t('resetPassword.tokenInvalidLong'));
          } else if (result.code === 'PASSWORD_RESET_TOKEN_USED') {
            throw new Error(t('resetPassword.tokenUsedLong'));
          }
          throw new Error(result.message || t('resetPassword.failed'));
        }
        setDone(true);
        // Redirect to login after 3 seconds
        setTimeout(() => router.push('/login'), 3000);
      } catch (err: unknown) {
        console.error('Password reset failed:', err);
        setError((err as Error)?.message || t('resetPassword.failed'));
      } finally {
        setLoading(false);
      }
    },
  });

  if (!token) {
    return (
      <AuthFrame>
        <AuthBadge tone="error" />
        <ShopAuthHeading title={t('resetPassword.invalidLinkTitle')} subtitle={t('resetPassword.missingToken')} />
        <button type="button" onClick={() => router.push('/forget-password')} className={authPrimaryBtn}>
          {t('resetPassword.requestNew')}
        </button>
        <button type="button" onClick={() => router.push('/login')} className={`${authLinkBtn} self-center`}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {t('forgotPassword.backToLogin')}
        </button>
      </AuthFrame>
    );
  }

  if (done) {
    return (
      <AuthFrame>
        <AuthBadge tone="success" />
        <ShopAuthHeading title={t('resetPassword.success')} subtitle={t('resetPassword.successMessage')} />
        <button type="button" onClick={() => router.push('/login')} className={authPrimaryBtn}>
          {t('forgotPassword.backToLogin')}
        </button>
        <p className="m-0 text-center text-sm text-slate-500">{t('resetPassword.redirecting')}</p>
      </AuthFrame>
    );
  }

  const fieldError = (name: keyof Values) => (form.touched[name] ? form.errors[name] : undefined);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.handleChange(e);
    setError(null);
  };

  return (
    <AuthFrame>
      <ShopAuthHeading title={t('resetPassword.title')} subtitle={t('resetPassword.subtitle')} />
      <form onSubmit={form.handleSubmit} noValidate className="flex flex-col gap-4">
        {error && (
          <AuthNotice tone="error">
            {error}{' '}
            <button type="button" onClick={() => router.push('/forget-password')} className="font-semibold underline underline-offset-2">
              {t('resetPassword.requestNew')}
            </button>
          </AuthNotice>
        )}
        <PasswordField
          id="reset-password"
          name="password"
          label={t('resetPassword.password')}
          autoComplete="new-password"
          value={form.values.password}
          error={fieldError('password')}
          onChange={onChange}
          onBlur={form.handleBlur}
        />
        <PasswordField
          id="reset-confirm"
          name="confirmPassword"
          label={t('resetPassword.confirmPassword')}
          autoComplete="new-password"
          value={form.values.confirmPassword}
          error={fieldError('confirmPassword')}
          onChange={onChange}
          onBlur={form.handleBlur}
        />
        <button type="submit" className={authPrimaryBtn} disabled={loading}>
          {loading && <AuthSpinner />}
          {t('resetPassword.resetButton')}
        </button>
      </form>
      <button type="button" onClick={() => router.push('/login')} className={`${authLinkBtn} self-center`}>
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {t('forgotPassword.backToLogin')}
      </button>
    </AuthFrame>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
