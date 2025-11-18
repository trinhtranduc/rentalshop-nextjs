import React from 'react';
import Link from 'next/link';
import { Button } from '@rentalshop/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Store Not Found</h1>
          <p className="text-gray-600 mb-6">
            The store you're looking for could not be found. Please check the URL or contact the store owner.
          </p>
          <div className="space-y-3">
            <Link href="/">
              <Button className="w-full">
                Go to Homepage
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

