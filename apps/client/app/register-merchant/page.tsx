'use client';

import React, { useState } from 'react';
import { MerchantRegistrationForm } from '@rentalshop/ui';
import { useRouter } from 'next/navigation';
import { useToastHandler } from '@rentalshop/hooks';
import { merchantsApi } from '@rentalshop/utils';

interface MerchantRegistrationData {
  merchantName: string;
  merchantEmail: string;
  merchantPhone: string;
  merchantDescription: string;
  userEmail: string;
  userPassword: string;
  userFirstName: string;
  userLastName: string;
  userPhone: string;
  outletName: string;
  outletAddress: string;
  outletDescription: string;
}

export default function RegisterMerchantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToastHandler();

  const handleSubmit = async (data: MerchantRegistrationData) => {
    setLoading(true);
    
    try {
      const result = await merchantsApi.register(data);

      if (result.success) {
        showSuccess('Registration Successful!', `Welcome to RentalShop! Your 14-day free trial has started.`);

        // Redirect to login or dashboard
        router.push('/login?message=registration-success');
      } else {
        showError('Registration Failed', result.message || 'Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showError('Registration Failed', 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Start Your Rental Business
          </h1>
          <p className="text-lg text-gray-600">
            Join thousands of successful rental businesses with our 14-day free trial
          </p>
        </div>

        {/* Registration Form */}
        <MerchantRegistrationForm
          onSubmit={handleSubmit}
          loading={loading}
        />

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
