'use client';

import { useRouter } from 'next/navigation';
import { RegisterForm } from '@rentalshop/ui';

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
    <RegisterForm 
      onNavigate={handleNavigate}
      onRegister={handleRegister}
    />
  );
} 