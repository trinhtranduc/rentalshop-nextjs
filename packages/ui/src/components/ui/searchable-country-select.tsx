'use client';

import * as React from 'react';
import { cn } from '../../lib/cn';
import { ChevronDown, X } from 'lucide-react';
import { Button } from './button';

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

export interface SearchableCountrySelectProps {
  value?: string;
  onChange?: (value: string) => void;
  options: CountryOption[];
  placeholder?: string;
  className?: string;
  emptyMessage?: string;
}

export const SearchableCountrySelect: React.FC<SearchableCountrySelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select country...',
  className,
  emptyMessage = 'No countries found',
}) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  // Filter countries based on search query
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return options;
    }
    return options.filter((country) => 
      country.name.toLowerCase().includes(q) || 
      country.code.toLowerCase().includes(q)
    );
  }, [query, options]);

  const selected = options.find((o) => o.name === value);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (open && !el.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);

    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  const handleSelect = (country: CountryOption) => {
    console.log('🌍 Country selected:', country.name);
    onChange?.(country.name);
    setQuery('');
    // Close after a short delay to ensure click is processed
    setTimeout(() => {
      setOpen(false);
    }, 100);
  };

  const handleClear = () => {
    onChange?.('');
    setQuery('');
    setOpen(false);
  };

  return (
    <div className={cn('relative', className)} ref={rootRef}>
      {/* Input field */}
      <div className="relative">
        <input
          value={open ? query : (selected ? `${selected.flag} ${selected.name}` : query)}
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
          className={cn(
            'h-11 w-full rounded-lg border border-gray-300 bg-white pl-4 pr-20 text-sm transition-all duration-200',
            'focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:ring-offset-0',
            'hover:border-gray-400'
          )}
        />
        
        {/* Clear button */}
        {value && !query && (
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={handleClear}
            className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        
        {/* Dropdown toggle */}
        <Button
          variant="ghost"
          size="icon"
          type="button"
          aria-label="Toggle options"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 h-6 w-6 p-0"
          onMouseDown={(e) => {
            e.preventDefault();
            setOpen((o) => !o);
          }}
        >
          <ChevronDown className={cn('h-5 w-5 transition-transform', open && 'rotate-180')} />
        </Button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[9999] mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="max-h-64 overflow-auto py-2">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                <div className="w-8 h-8 mx-auto mb-2 text-gray-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>{emptyMessage}</div>
              </div>
            ) : (
              <>
                {filtered.map((country) => (
                  <button
                    type="button"
                    key={country.code}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur
                      handleSelect(country);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 hover:text-gray-900 transition-all cursor-pointer',
                      value === country.name && 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    )}
                  >
                    {/* Flag */}
                    <span className="text-2xl flex-shrink-0">{country.flag}</span>
                    
                    {/* Country name and code */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{country.name}</div>
                      <div className="text-xs text-gray-500">{country.code}</div>
                    </div>
                    
                    {/* Selection indicator */}
                    {value === country.name && (
                      <div className="flex-shrink-0 w-5 h-5 text-blue-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableCountrySelect;

