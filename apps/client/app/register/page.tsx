'use client';

import { useRouter } from 'next/navigation';
import { RegisterForm, LanguageSwitcher } from '@rentalshop/ui';

export default function RegisterPage() {
  const router = useRouter();

  const handleRegister = async (data: any) => {
    // Registration is now handled directly by the RegisterForm component
    // using the centralized API. This function is kept for compatibility
    // but the actual registration logic is in the form component.
    console.log('Registration data received:', data);
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 relative">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="compact" />
      </div>

      <RegisterForm 
        onNavigate={handleNavigate}
        onRegister={handleRegister}
      />
    </div>
  );
} 