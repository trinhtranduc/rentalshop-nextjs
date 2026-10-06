'use client';

import { useRouter } from 'next/navigation';
import { RegisterForm, ShopAuthPage } from '@rentalshop/ui';
import { useAuthTranslations } from '@rentalshop/hooks';

export default function RegisterStep1Page() {
  const router = useRouter();
  const t = useAuthTranslations();

  const handleNavigate = (path: string) => router.push(path);
  const handleRegister = async () => {};

  return (
    <ShopAuthPage termsLabel={t('termsOfService')} privacyLabel={t('privacyPolicy')} onNavigate={handleNavigate}>
      <RegisterForm appearance="shop" initialStep={1} onNavigate={handleNavigate} onRegister={handleRegister} />
    </ShopAuthPage>
  );
}
