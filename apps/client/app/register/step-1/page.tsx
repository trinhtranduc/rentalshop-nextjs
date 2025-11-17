'use client';

import { useRouter } from 'next/navigation';
import { RegisterForm, LanguageSwitcher } from '@rentalshop/ui';

export default function RegisterStep1Page() {
  const router = useRouter();

  const handleNavigate = (path: string) => router.push(path);
  const handleRegister = async () => {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="compact" />
      </div>
      <div className="relative z-10 w-full">
        <RegisterForm initialStep={1} onNavigate={handleNavigate} onRegister={handleRegister} />
      </div>
    </div>
  );
}


