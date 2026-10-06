'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { RegisterForm, ShopAuthPage } from '@rentalshop/ui';
import { useAuthTranslations } from '@rentalshop/hooks';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useAuthTranslations();

  const handleRegister = async (data: unknown) => {
    // Registration is now handled directly by the RegisterForm component
    // using the centralized API. This function is kept for compatibility
    // but the actual registration logic is in the form component.
    console.log('Registration data received:', data);
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <ShopAuthPage termsLabel={t('termsOfService')} privacyLabel={t('privacyPolicy')} onNavigate={handleNavigate}>
      <RegisterForm
        appearance="shop"
        googleOAuthClientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}
        initialStep={(searchParams.get('step') === '2' ? 2 : 1) as 1 | 2}
        onNavigate={(path) => {
          // Allow external navigations to pass through
          if (path === '/login' || path === '/terms' || path === '/privacy' || path.startsWith('/email-verification')) {
            router.push(path);
            return;
          }
          // Map internal navigation to query param pattern
          if (path.includes('step-2')) router.push('/register?step=2');
          else router.push('/register?step=1');
        }}
        onRegister={handleRegister}
      />
    </ShopAuthPage>
  );
}
