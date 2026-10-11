'use client';

import React from 'react';
import { ToastProvider as UIToastProvider } from '@rentalshop/ui';
// #807: dialog and form styles in the portal look (admin only; the file is global CSS)
import '../forms.css';

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
