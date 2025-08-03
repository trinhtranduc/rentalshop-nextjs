'use client'

import React from 'react';
import { Button } from '../button';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  variant = 'default' 
}) => {
  const handleLanguageChange = (language: string) => {
    // This will be handled by the consuming app
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: language }));
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleLanguageChange('en')}
          className="text-xs px-2 py-1"
        >
          EN
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleLanguageChange('vi')}
          className="text-xs px-2 py-1"
        >
          VI
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-text-tertiary" />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleLanguageChange('en')}
      >
        EN
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleLanguageChange('vi')}
      >
        VI
      </Button>
    </div>
  );
}; 