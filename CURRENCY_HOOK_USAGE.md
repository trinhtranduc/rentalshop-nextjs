# Currency Hook & Component Usage Guide

## 🎯 Tại sao sử dụng Hook thay vì Props?

### Vấn đề khi dùng Props:
```typescript
// ❌ Phải pass currency qua nhiều tầng component
<Parent currency={currency}>
  <Child currency={currency}>
    <GrandChild currency={currency}>
      {formatCurrency(amount, currency)}  // Dùng ở đây!
    </GrandChild>
  </Child>
</Parent>
```

### Giải pháp với Hook:
```typescript
// ✅ Chỉ wrap ở root, component nào cần thì dùng hook
<CurrencyProvider merchantCurrency={merchant.currency}>
  <Parent>
    <Child>
      <GrandChild>
        {formatMoney(amount)}  // Tự động lấy currency!
      </GrandChild>
    </Child>
  </Parent>
</CurrencyProvider>
```

## 🚀 Cách Sử Dụng

### 1. Wrap App/Page với CurrencyProvider

```typescript
// Ở page level
import { CurrencyProvider } from '@rentalshop/ui';

export default function OrderPage() {
  const merchant = useMerchant();  // Get merchant data
  
  return (
    <CurrencyProvider merchantCurrency={merchant.currency}>
      <YourComponents />
    </CurrencyProvider>
  );
}
```

### 2. Sử dụng Hook trong Component

#### Option A: useFormatCurrency (Recommended)
```typescript
import { useFormatCurrency } from '@rentalshop/ui';

function OrderSummary({ total, deposit }) {
  const formatMoney = useFormatCurrency();  // Tự động lấy currency
  
  return (
    <div>
      <div>Total: {formatMoney(total)}</div>
      <div>Deposit: {formatMoney(deposit)}</div>
    </div>
  );
}
```

#### Option B: Money Component  
```typescript
import { Money } from '@rentalshop/ui';

function OrderSummary({ total, deposit }) {
  return (
    <div>
      <div>Total: <Money amount={total} /></div>
      <div>Deposit: <Money amount={deposit} inline /></div>
    </div>
  );
}
```

#### Option C: useCurrency (Low-level)
```typescript
import { useCurrency } from '@rentalshop/ui';
import { formatCurrency } from '@rentalshop/utils';

function OrderSummary({ total }) {
  const { currency, symbol } = useCurrency();
  
  return (
    <div>
      <div>Currency: {symbol} ({currency})</div>
      <div>Total: {formatCurrency(total, currency)}</div>
    </div>
  );
}
```

## 📚 API Reference

### CurrencyProvider
```typescript
<CurrencyProvider 
  merchantCurrency="USD" | "VND"  // Required
  initialCurrency="USD"            // Optional, fallback
>
  {children}
</CurrencyProvider>
```

### useFormatCurrency()
```typescript
const formatMoney = useFormatCurrency();

// Returns: (amount: number) => string
formatMoney(100)        // "$100.00" or "100,000đ"
formatMoney(qty * price) // Calculate & format
```

### Money Component
```typescript
<Money 
  amount={100}                    // Required
  className="text-lg font-bold"  // Optional
  inline={true}                  // Optional (span vs div)
/>

// Variants
<MoneyBold amount={100} />      // Bold text
<MoneyLarge amount={100} />     // Larger text
```

### useCurrency()
```typescript
const { 
  currency,     // "USD" | "VND"
  setCurrency,  // (currency) => void
  symbol,       // "$" | "đ"
  name          // "US Dollar" | "Vietnamese Dong"
} = useCurrency();
```

## 💡 Best Practices

### ✅ DO:
```typescript
// 1. Wrap at page level
<CurrencyProvider merchantCurrency={merchant.currency}>
  <OrderForm />
</CurrencyProvider>

// 2. Use hook in child components
const formatMoney = useFormatCurrency();
return <div>{formatMoney(amount)}</div>;

// 3. Use Money component for simple display
return <Money amount={total} />;
```

### ❌ DON'T:
```typescript
// 1. Don't pass currency as props anymore
<OrderForm currency={currency} /> // Old way

// 2. Don't call formatCurrency with currency param
formatCurrency(amount, currency)  // Old way

// 3. Don't create multiple providers
<CurrencyProvider>
  <CurrencyProvider>  // ❌ Nested!
    ...
  </CurrencyProvider>
</CurrencyProvider>
```

## 🎨 Examples

### Example 1: Order Summary
```typescript
import { useFormatCurrency } from '@rentalshop/ui';

export function OrderSummary({ order }) {
  const formatMoney = useFormatCurrency();
  
  return (
    <div>
      <div>Subtotal: {formatMoney(order.subtotal)}</div>
      <div>Tax: {formatMoney(order.tax)}</div>
      <div>Total: {formatMoney(order.total)}</div>
    </div>
  );
}
```

### Example 2: Product Card
```typescript
import { Money } from '@rentalshop/ui';

export function ProductCard({ product }) {
  return (
    <div>
      <h3>{product.name}</h3>
      <div>
        Price: <Money amount={product.price} inline />
      </div>
      <div>
        Deposit: <Money amount={product.deposit} inline />
      </div>
    </div>
  );
}
```

### Example 3: Calculation Display
```typescript
import { useFormatCurrency } from '@rentalshop/ui';

export function OrderItem({ item }) {
  const formatMoney = useFormatCurrency();
  
  return (
    <div>
      {item.quantity} × {formatMoney(item.price)} 
      = {formatMoney(item.quantity * item.price)}
    </div>
  );
}
```

## 🔄 Migration Guide

### Old Code (Props):
```typescript
// Parent
<OrderSummary currency={currency} total={100} />

// Child Component
function OrderSummary({ currency, total }) {
  return <div>{formatCurrency(total, currency)}</div>;
}
```

### New Code (Hook):
```typescript
// Parent
<CurrencyProvider merchantCurrency={merchant.currency}>
  <OrderSummary total={100} />
</CurrencyProvider>

// Child Component  
function OrderSummary({ total }) {
  const formatMoney = useFormatCurrency();
  return <div>{formatMoney(total)}</div>;
}
```

## 🎯 Benefits

1. **Cleaner Code**: Không cần pass currency qua props
2. **Less Boilerplate**: Ít code hơn
3. **Type-Safe**: Full TypeScript support
4. **Centralized**: Currency logic ở một nơi
5. **Flexible**: Dễ thay đổi currency cho toàn bộ app
6. **Performance**: Tránh re-render không cần thiết

## ✅ Checklist

Khi implement currency trong component mới:

- [ ] Wrap page với `<CurrencyProvider>`
- [ ] Dùng `useFormatCurrency()` hook thay vì `formatCurrency(amount, currency)`
- [ ] Hoặc dùng `<Money amount={} />` component cho simple display
- [ ] Remove currency props khỏi component interfaces
- [ ] Test với cả USD và VND

---

**Happy Coding!** 🚀
