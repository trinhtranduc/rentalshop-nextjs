'use client';

/**
 * Quên mật khẩu (#582) on the /login 4A look. Same call as before:
 * `authApi.requestPasswordReset(email)`. The sent card shows only when the API says success.
 */
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Mail } from 'lucide-react';
import { ShopAuthHeading } from '@rentalshop/ui';
import { authApi, isValidEmail } from '@rentalshop/utils';
import {
  AuthBadge,
  AuthFrame,
  AuthNotice,
  AuthSpinner,
  authFieldClass,
  authIconClass,
  authLabelClass,
  authLinkBtn,
  authOutlineBtn,
  authPrimaryBtn,
} from '../components/auth/shop-auth';

export default function ForgetPasswordPage() {
  const router = useRouter();
  const t = useTranslations('auth');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useFormik<{ email: string }>({
    initialValues: { email: '' },
    validationSchema: Yup.object({
      email: Yup.string()
        .required(t('register.emailRequired'))
        .test('email-format', t('login.invalidEmail'), (value) => !!value && isValidEmail(value)),
    }),
    onSubmit: async ({ email }) => {
      try {
        setLoading(true);
        setError(null);
        const result = await authApi.requestPasswordReset(email);
        if (!result.success) {
          throw new Error(result.message || t('forgotPassword.failed'));
        }
        setSentTo(email);
      } catch (err: unknown) {
        console.error('Password reset failed:', err);
        setError((err as Error)?.message || t('forgotPassword.failed'));
      } finally {
        setLoading(false);
      }
    },
  });

  if (sentTo) {
    return (
      <AuthFrame>
        <AuthBadge tone="success" />
        <ShopAuthHeading title={t('forgotPassword.sentTitle')} />
        <AuthNotice tone="info">
          {t('forgotPassword.sentTo')} <strong className="break-all font-semibold">{sentTo}</strong>
        </AuthNotice>
        <p className="m-0 text-center text-[15px] leading-6 text-slate-600">{t('forgotPassword.emailInstructions')}</p>
        <button type="button" onClick={() => router.push('/login')} className={authPrimaryBtn}>
          {t('forgotPassword.backToLogin')}
        </button>
        <button
          type="button"
          onClick={() => {
            setSentTo(null);
            form.resetForm();
          }}
          className={authOutlineBtn}
        >
          {t('forgotPassword.useAnotherEmail')}
        </button>
      </AuthFrame>
    );
  }

  const emailError = form.touched.email ? form.errors.email : undefined;

  return (
    <AuthFrame>
      <ShopAuthHeading title={t('forgotPassword.title')} subtitle={t('forgotPassword.subtitle')} />
      <form onSubmit={form.handleSubmit} noValidate className="flex flex-col gap-4">
        {error && <AuthNotice tone="error">{error}</AuthNotice>}
        <div className="flex flex-col gap-2">
          <label htmlFor="forgot-email" className={authLabelClass}>
            {t('login.email')}
          </label>
          <div className="relative">
            <Mail aria-hidden="true" className={authIconClass} />
            <input
              id="forgot-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder={t('register.enterYourEmail')}
              className={authFieldClass(!!emailError)}
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? 'forgot-email-error' : undefined}
              onChange={(e) => {
                form.handleChange(e);
                setError(null);
              }}
              onBlur={form.handleBlur}
              value={form.values.email}
            />
          </div>
          {emailError && (
            <p id="forgot-email-error" className="m-0 text-sm text-red-600">
              {emailError}
            </p>
          )}
        </div>
        <button type="submit" className={authPrimaryBtn} disabled={loading}>
          {loading && <AuthSpinner />}
          {t('forgotPassword.sendButton')}
        </button>
      </form>
      <button type="button" onClick={() => router.push('/login')} className={`${authLinkBtn} self-center`}>
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {t('forgotPassword.backToLogin')}
      </button>
    </AuthFrame>
  );
}
