'use client';

// ============================================================================
// CURRENCY HOOK
// ============================================================================

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { 
  CurrencyCode, 
  CurrencySettings, 
  Currency 
} from '@rentalshop/types';
import { 
  DEFAULT_CURRENCY_SETTINGS, 
  getCurrency, 
  getCurrentCurrency 
} from '@rentalshop/utils';

// ============================================================================
// CURRENCY CONTEXT
// ============================================================================

interface CurrencyContextType {
  /** Current currency settings */
  settings: CurrencySettings;
  /** Current currency configuration */
  currentCurrency: Currency;
  /** Change the current currency */
  setCurrency: (currency: CurrencyCode) => void;
  /** Toggle currency symbol visibility */
  toggleSymbol: () => void;
  /** Toggle currency code visibility */
  toggleCode: () => void;
  /** Get currency by code */
  getCurrencyByCode: (code: CurrencyCode) => Currency | undefined;
  /** Convert amount between currencies */
  convertAmount: (amount: number, from: CurrencyCode, to: CurrencyCode) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// ============================================================================
// CURRENCY PROVIDER
// ============================================================================

interface CurrencyProviderProps {
  children: ReactNode;
  /** Initial currency settings (optional) */
  initialSettings?: Partial<CurrencySettings>;
}

export function CurrencyProvider({ 
  children, 
  initialSettings = {} 
}: CurrencyProviderProps) {
  // Initialize settings with defaults and any overrides
  const [settings, setSettings] = useState<CurrencySettings>({
    ...DEFAULT_CURRENCY_SETTINGS,
    ...initialSettings,
  });

  // Get current currency configuration
  const currentCurrency = getCurrentCurrency(settings);

  // Change current currency
  const setCurrency = useCallback((currencyCode: CurrencyCode) => {
    setSettings(prev => ({
      ...prev,
      currentCurrency: currencyCode,
    }));
    
    // Save to localStorage for persistence
    localStorage.setItem('rentalshop-currency', currencyCode);
  }, []);

  // Toggle currency symbol visibility
  const toggleSymbol = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      showSymbol: !prev.showSymbol,
    }));
    
    // Save to localStorage for persistence
    localStorage.setItem('rentalshop-show-symbol', (!settings.showSymbol).toString());
  }, [settings.showSymbol]);

  // Toggle currency code visibility
  const toggleCode = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      showCode: !prev.showCode,
    }));
    
    // Save to localStorage for persistence
    localStorage.setItem('rentalshop-show-code', (!settings.showCode).toString());
  }, [settings.showCode]);

  // Get currency by code
  const getCurrencyByCode = useCallback((code: CurrencyCode) => {
    return getCurrency(code);
  }, []);

  // Convert amount between currencies
  const convertAmount = useCallback((amount: number, from: CurrencyCode, to: CurrencyCode) => {
    if (from === to) return amount;
    
    const fromCurrency = getCurrency(from);
    const toCurrency = getCurrency(to);
    
    if (!fromCurrency || !toCurrency) {
      throw new Error(`Invalid currency code: ${from} or ${to}`);
    }
    
    // Convert to base currency (USD) first, then to target currency
    const amountInUSD = amount / fromCurrency.exchangeRate;
    return amountInUSD * toCurrency.exchangeRate;
  }, []);

  // Load saved settings from localStorage on mount
  useEffect(() => {
    try {
      const savedCurrency = localStorage.getItem('rentalshop-currency') as CurrencyCode;
      const savedShowSymbol = localStorage.getItem('rentalshop-show-symbol');
      const savedShowCode = localStorage.getItem('rentalshop-show-code');
      
      if (savedCurrency && isValidCurrencyCode(savedCurrency)) {
        setSettings(prev => ({ ...prev, currentCurrency: savedCurrency }));
      }
      
      if (savedShowSymbol !== null) {
        setSettings(prev => ({ ...prev, showSymbol: savedShowSymbol === 'true' }));
      }
      
      if (savedShowCode !== null) {
        setSettings(prev => ({ ...prev, showCode: savedShowCode === 'true' }));
      }
    } catch (error) {
      console.warn('Failed to load currency settings from localStorage:', error);
    }
  }, []);

  const contextValue: CurrencyContextType = {
    settings,
    currentCurrency,
    setCurrency,
    toggleSymbol,
    toggleCode,
    getCurrencyByCode,
    convertAmount,
  };

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
}

// ============================================================================
// CURRENCY HOOK
// ============================================================================

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  
  return context;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function isValidCurrencyCode(code: string): code is CurrencyCode {
  return ['USD', 'VND'].includes(code as CurrencyCode);
}
