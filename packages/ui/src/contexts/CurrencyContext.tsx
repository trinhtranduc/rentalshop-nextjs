'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { CurrencyCode } from '@rentalshop/types';

/**
 * Currency Context Interface
 * Provides currency information throughout the application
 */
interface CurrencyContextType {
  /** Current currency code */
  currency: CurrencyCode;
  /** Set currency (usually from merchant data) */
  setCurrency: (currency: CurrencyCode) => void;
  /** Currency symbol (e.g., '$', 'đ') */
  symbol: string;
  /** Currency name (e.g., 'US Dollar', 'Vietnamese Dong') */
  name: string;
}

/**
 * Currency configuration for supported currencies
 */
const CURRENCY_CONFIG: Record<CurrencyCode, { symbol: string; name: string }> = {
  USD: { symbol: '$', name: 'US Dollar' },
  VND: { symbol: 'đ', name: 'Vietnamese Dong' },
};

// Create context with default USD
const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  setCurrency: () => {},
  symbol: '$',
  name: 'US Dollar',
});

/**
 * Currency Provider Props
 */
interface CurrencyProviderProps {
  children: ReactNode;
  /** Initial currency (defaults to USD) */
  initialCurrency?: CurrencyCode;
  /** Merchant currency (if available) */
  merchantCurrency?: CurrencyCode;
}

/**
 * Currency Provider Component
 * 
 * Provides currency context to all child components.
 * Automatically uses merchant's currency if available.
 * 
 * @example
 * ```tsx
 * // Wrap your app with the provider
 * <CurrencyProvider merchantCurrency={merchant.currency}>
 *   <App />
 * </CurrencyProvider>
 * 
 * // Use the currency in any component
 * function MyComponent() {
 *   const { currency, symbol } = useCurrency();
 *   return <div>{formatCurrency(100, currency)}</div>;
 * }
 * ```
 */
export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({
  children,
  initialCurrency = 'USD',
  merchantCurrency,
}) => {
  // Initialize currency from localStorage, merchantCurrency, or language preference
  const getInitialCurrency = (): CurrencyCode => {
    // First, check localStorage for saved preference
    if (typeof window !== 'undefined') {
      const savedCurrency = localStorage.getItem('rentalshop-currency') as CurrencyCode;
      if (savedCurrency && (savedCurrency === 'USD' || savedCurrency === 'VND')) {
        return savedCurrency;
      }
      
      // If no saved currency, check language preference
      const languagePreference = localStorage.getItem('user_language_preference');
      if (languagePreference === 'vi') {
        return 'VND';
      }
    }
    
    // Fall back to merchant currency or initial currency
    return merchantCurrency || initialCurrency;
  };

  const [currency, setCurrency] = useState<CurrencyCode>(getInitialCurrency());

  // Update currency when merchant currency changes
  useEffect(() => {
    if (merchantCurrency && merchantCurrency !== currency) {
      setCurrency(merchantCurrency);
    }
  }, [merchantCurrency]);
  
  // Save currency to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rentalshop-currency', currency);
    }
  }, [currency]);

  // Get currency configuration
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;

  const value: CurrencyContextType = {
    currency,
    setCurrency,
    symbol: config.symbol,
    name: config.name,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

/**
 * useCurrency Hook
 * 
 * Access currency context in any component
 * 
 * @returns Currency context with current currency, symbol, and name
 * 
 * @example
 * ```tsx
 * function ProductPrice({ price }: { price: number }) {
 *   const { currency, symbol } = useCurrency();
 *   return (
 *     <div>
 *       {symbol}{price.toLocaleString()} {currency}
 *     </div>
 *   );
 * }
 * ```
 */
export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  
  return context;
};

/**
 * withCurrency HOC
 * 
 * Higher-order component to inject currency props
 * 
 * @param Component - Component to wrap
 * @returns Wrapped component with currency props
 * 
 * @example
 * ```tsx
 * interface Props {
 *   price: number;
 *   currency: CurrencyCode;
 * }
 * 
 * const ProductPrice = withCurrency<Props>(({ price, currency }) => {
 *   return <div>{formatCurrency(price, currency)}</div>;
 * });
 * ```
 */
export function withCurrency<P extends { currency?: CurrencyCode }>(
  Component: React.ComponentType<P>
): React.FC<Omit<P, 'currency'>> {
  return function CurrencyWrappedComponent(props: Omit<P, 'currency'>) {
    const { currency } = useCurrency();
    return <Component {...(props as P)} currency={currency} />;
  };
}

// Export context for advanced use cases
export { CurrencyContext };
export default CurrencyProvider;

