import React from 'react';
import { Input, Button } from '@rentalshop/ui/base';
import { useOutletsTranslations, useCommonTranslations } from '@rentalshop/hooks';

interface OutletSearchProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

/**
 * ✅ COMPACT OUTLET SEARCH (Following Orders pattern)
 */
export function OutletSearch({ value, onChange, onClear }: OutletSearchProps) {
  const t = useOutletsTranslations();
  const tc = useCommonTranslations();
  
  return (
    <>
      {/* Search Field */}
      <div className="flex-1 min-w-[280px]">
        <div className="relative">
          <Input
            type="text"
            placeholder={t('search.placeholder')}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pl-9 h-10"
          />
          <svg 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
        </div>
      </div>

      {/* Clear Button */}
      {value && (
        <Button
          onClick={onClear}
          variant="outline"
          size="sm"
          className="h-10"
        >
          {tc('buttons.clear')}
        </Button>
      )}
    </>
  );
}

