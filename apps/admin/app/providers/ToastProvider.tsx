'use client';

import React from 'react';
import { ToastProvider as UIToastProvider } from '@rentalshop/ui/base';

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <UIToastProvider>
      {children}
    </UIToastProvider>
  );
}
