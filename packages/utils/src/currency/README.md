# Centralized Currency System

This package provides a comprehensive currency management system for the Rental Shop application, supporting USD and VND currencies with easy extensibility for future currencies.

## 🎯 Features

- **Multi-Currency Support**: USD ($) and VND (đ) with proper formatting
- **Centralized Configuration**: Single source of truth for all currency settings
- **Automatic Formatting**: Proper locale-specific number formatting
- **Currency Conversion**: Real-time conversion between supported currencies
- **User Preferences**: Allow users to change their preferred currency
- **Persistence**: Settings saved to localStorage
- **Type Safety**: Full TypeScript support with proper interfaces

## 🚀 Quick Start

### 1. Setup Currency Provider

Wrap your application with the `CurrencyProvider`:

```tsx
import { CurrencyProvider } from '@rentalshop/hooks';

function App() {
  return (
    <CurrencyProvider>
      <YourApp />
    </CurrencyProvider>
  );
}
```

### 2. Use Currency Hook

Access currency functionality in your components:

```tsx
import { useCurrency } from '@rentalshop/hooks';

function MyComponent() {
  const { 
    currentCurrency, 
    setCurrency, 
    settings 
  } = useCurrency();
  
  return (
    <div>
      <p>Current Currency: {currentCurrency}</p>
      <button onClick={() => setCurrency('USD')}>
        Switch to USD
      </button>
    </div>
  );
}
```

### 3. Format Currency Amounts

Use the formatting utilities:

```tsx
import { formatCurrency, formatCurrencyAdvanced } from '@rentalshop/utils';

// Basic formatting
formatCurrency(1000, 'USD');        // "$1,000.00"
formatCurrency(1000000, 'VND');     // "1.000.000đ"

// Advanced formatting with options
formatCurrencyAdvanced(1000, {
  currency: 'USD',
  showSymbol: true,
  showCode: false
}); // "$1,000.00"
```

## 📚 API Reference

### Currency Types

```typescript
type CurrencyCode = 'USD' | 'VND';

interface Currency {
  code: CurrencyCode;
  symbol: string;           // '$' or 'đ'
  name: string;             // 'US Dollar' or 'Vietnamese Dong'
  locale: string;           // 'en-US' or 'vi-VN'
  minFractionDigits: number;
  maxFractionDigits: number;
  symbolBefore: boolean;    // true for USD, false for VND
  exchangeRate: number;     // Rate relative to USD
}

interface CurrencySettings {
  currentCurrency: CurrencyCode;
  baseCurrency: CurrencyCode;        // Always 'USD'
  availableCurrencies: Currency[];
  showSymbol: boolean;
  showCode: boolean;
}
```

### Currency Utilities

#### `formatCurrency(amount, currency?, locale?)`
Basic currency formatting with backward compatibility.

```typescript
formatCurrency(1000, 'USD');        // "$1,000.00"
formatCurrency(1000000, 'VND');     // "1.000.000đ"
```

#### `formatCurrencyAdvanced(amount, options, settings?)`
Advanced formatting with full control over display options.

```typescript
formatCurrencyAdvanced(1000, {
  currency: 'USD',
  showSymbol: true,
  showCode: true,
  fractionDigits: 2
}); // "$1,000.00 USD"
```

#### `convertCurrency(amount, fromCurrency, toCurrency)`
Convert amounts between currencies using exchange rates.

```typescript
convertCurrency(1000, 'USD', 'VND'); // 24500000
convertCurrency(24500000, 'VND', 'USD'); // 1000
```

#### `getCurrency(code)`
Get currency configuration by code.

```typescript
const usdCurrency = getCurrency('USD');
console.log(usdCurrency.symbol); // "$"
```

#### `parseCurrency(currencyString, currency)`
Parse formatted currency strings back to numbers.

```typescript
parseCurrency('$1,000.00', 'USD'); // 1000
parseCurrency('1.000.000đ', 'VND'); // 1000000
```

### React Hooks

#### `useCurrency()`
Main hook for accessing currency functionality.

```typescript
const {
  settings,           // Current currency settings
  currentCurrency,    // Currently selected currency
  setCurrency,        // Function to change currency
  toggleSymbol,       // Toggle symbol visibility
  toggleCode,         // Toggle code visibility
  getCurrencyByCode,  // Get currency by code
  convertAmount       // Convert between currencies
} = useCurrency();
```

#### `CurrencyProvider`
Context provider for currency management.

```typescript
<CurrencyProvider initialSettings={{ currentCurrency: 'USD' }}>
  <YourApp />
</CurrencyProvider>
```

## 🎨 UI Components

### CurrencySelector
Dropdown component for selecting currencies.

```tsx
import { CurrencySelector } from '@rentalshop/ui';

function CurrencySettings() {
  return (
    <div>
      <label>Select Currency:</label>
      <CurrencySelector 
        showSymbols={true}
        showCodes={true}
        onCurrencyChange={(currency) => console.log('Changed to:', currency)}
      />
    </div>
  );
}
```

### CurrencyDemo
Complete demo component showcasing all currency features.

```tsx
import { CurrencyDemo } from '@rentalshop/ui';

function DemoPage() {
  return <CurrencyDemo />;
}
```

## ⚙️ Configuration

### Default Currencies

The system comes with pre-configured currencies:

```typescript
const DEFAULT_CURRENCIES = [
  {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    minFractionDigits: 2,
    maxFractionDigits: 2,
    symbolBefore: true,
    exchangeRate: 1, // Base currency
  },
  {
    code: 'VND',
    symbol: 'đ',
    name: 'Vietnamese Dong',
    locale: 'vi-VN',
    minFractionDigits: 0,
    maxFractionDigits: 0,
    symbolBefore: false,
    exchangeRate: 24500, // 1 USD ≈ 24,500 VND
  },
];
```

### Custom Settings

Override default settings when setting up the provider:

```tsx
<CurrencyProvider 
  initialSettings={{
    currentCurrency: 'USD',
    showSymbol: true,
    showCode: false
  }}
>
  <YourApp />
</CurrencyProvider>
```

## 🔄 Adding New Currencies

To add a new currency:

1. **Update the CurrencyCode type**:
```typescript
type CurrencyCode = 'USD' | 'VND' | 'EUR';
```

2. **Add currency configuration**:
```typescript
const DEFAULT_CURRENCIES: Currency[] = [
  // ... existing currencies
  {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'de-DE',
    minFractionDigits: 2,
    maxFractionDigits: 2,
    symbolBefore: true,
    exchangeRate: 0.85, // 1 USD ≈ 0.85 EUR
  },
];
```

3. **Update validation functions**:
```typescript
function isValidCurrencyCode(code: string): code is CurrencyCode {
  return ['USD', 'VND', 'EUR'].includes(code as CurrencyCode);
}
```

## 💾 Persistence

Currency settings are automatically saved to localStorage:

- `rentalshop-currency`: Selected currency code
- `rentalshop-show-symbol`: Whether to show currency symbols
- `rentalshop-show-code`: Whether to show currency codes

Settings persist across browser sessions and page reloads.

## 🌍 Locale Support

Each currency has its own locale for proper number formatting:

- **USD**: `en-US` (1,234.56)
- **VND**: `vi-VN` (1.234.567)

The system automatically uses the appropriate locale for each currency.

## 🔧 Migration Guide

### From Old formatCurrency

If you were using the old `formatCurrency` function:

```typescript
// OLD (deprecated)
import { formatCurrency } from '@rentalshop/ui';

// NEW (recommended)
import { formatCurrency } from '@rentalshop/utils';
```

The function signature remains the same for backward compatibility.

### From Hardcoded Currency

If you had hardcoded currency logic:

```typescript
// OLD (hardcoded)
const amount = user.role === 'ADMIN' ? '$100' : '100.000đ';

// NEW (dynamic)
const amount = formatCurrency(100, currentCurrency);
```

## 🧪 Testing

Test currency functionality:

```typescript
import { formatCurrency, convertCurrency } from '@rentalshop/utils';

describe('Currency Utils', () => {
  it('should format USD correctly', () => {
    expect(formatCurrency(1000, 'USD')).toBe('$1,000.00');
  });
  
  it('should format VND correctly', () => {
    expect(formatCurrency(1000000, 'VND')).toBe('1.000.000đ');
  });
  
  it('should convert between currencies', () => {
    expect(convertCurrency(1000, 'USD', 'VND')).toBe(24500000);
  });
});
```

## 🚨 Error Handling

The system includes comprehensive error handling:

```typescript
try {
  const amount = convertCurrency(1000, 'USD', 'INVALID');
} catch (error) {
  console.error('Currency conversion failed:', error.message);
  // Error: Invalid currency code: USD or INVALID
}
```

## 📱 Browser Support

- **Modern Browsers**: Full support for all features
- **LocalStorage**: Required for settings persistence
- **Intl API**: Required for number formatting (IE11+)

## 🤝 Contributing

When adding new currency features:

1. Follow the existing TypeScript patterns
2. Add comprehensive JSDoc comments
3. Include unit tests for new functionality
4. Update this documentation
5. Ensure backward compatibility

## 📄 License

This currency system is part of the Rental Shop monorepo and follows the same licensing terms.
