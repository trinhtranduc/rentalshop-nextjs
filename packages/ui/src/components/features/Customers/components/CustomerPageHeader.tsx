'use client'

import React from 'react';
import { Button } from '@rentalshop/ui';

interface CustomerPageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backText?: string;
  backUrl?: string;
  children?: React.ReactNode;
}

export const CustomerPageHeader: React.FC<CustomerPageHeaderProps> = ({
  title,
  subtitle,
  onBack,
  backText = 'Back to Customers',
  backUrl,
  children
}) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      window.location.href = backUrl;
    }
  };

  return (
    <div className="mb-6">
      {/* Back Button */}
      {(onBack || backUrl) && (
        <Button 
          onClick={handleBack} 
          variant="outline" 
          className="mb-4"
        >
          ← {backText}
        </Button>
      )}
    </div>
  );
};
