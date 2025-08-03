'use client';

import { useRouter } from 'next/navigation';
import { RegisterForm } from '@rentalshop/ui';

export default function RegisterPage() {
  const router = useRouter();

  const handleRegister = async (data: any) => {
    try {
      // TODO: Replace with your actual registration API call
      console.log('Registration data:', data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Handle success
      console.log('Registration successful!');
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <RegisterForm
      onRegister={handleRegister}
      onNavigate={handleNavigate}
    />
  );
} 