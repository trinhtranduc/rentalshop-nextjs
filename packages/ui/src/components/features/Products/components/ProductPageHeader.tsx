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
      
      {/* Title and Subtitle */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
        
        {/* Action Buttons */}
        {children && (
          <div className="flex gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
