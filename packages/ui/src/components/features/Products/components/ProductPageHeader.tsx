'use client'

import React from 'react';
import { Button } from '../../../ui/button';

interface ProductPageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backText?: string;
  backUrl?: string;
  children?: React.ReactNode;
}

export const ProductPageHeader: React.FC<ProductPageHeaderProps> = ({
  title,
  subtitle,
  onBack,
  backText = 'Back to Products',
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
          ←{backText}
        </Button>
      )}
    </div>
  );
};
