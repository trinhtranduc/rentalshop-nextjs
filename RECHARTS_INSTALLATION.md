# Recharts Installation and Usage Guide

## Overview

Recharts has been successfully installed in the `@rentalshop/ui` package to provide professional, interactive charts for the rental shop application. This replaces the previous custom CSS-based charts with more powerful and feature-rich charting capabilities.

## Installation Details

- **Package**: `recharts@2.15.4`
- **Location**: `packages/ui/package.json`
- **Dependencies**: React 18+ compatible

## Updated Chart Components

### 1. IncomeChart (Bar Chart)
- **Type**: Bar Chart
- **Features**: 
  - Dual bars for Real vs Future Income
  - Interactive tooltips with currency formatting
  - Responsive design
  - Custom color scheme (blue/green)

```typescript
import { IncomeChart } from '@rentalshop/ui';

const data = [
  { month: 'Jan', year: 2024, realIncome: 15000, futureIncome: 18000 },
  { month: 'Feb', year: 2024, realIncome: 22000, futureIncome: 25000 },
  // ...
];

<IncomeChart data={data} loading={false} />
```

### 2. OrderChart (Line Chart)
- **Type**: Line Chart with dual Y-axes
- **Features**:
  - Shows both order count and revenue trends
  - Dual Y-axes for different metrics
  - Smooth line interpolation
  - Interactive data points

```typescript
import { OrderChart } from '@rentalshop/ui';

const data = [
  { date: '2024-01-01', orders: 45, revenue: 12500 },
  { date: '2024-01-02', orders: 52, revenue: 14200 },
  // ...
];

<OrderChart data={data} loading={false} />
```

### 3. TopProducts (Pie Chart)
- **Type**: Pie Chart
- **Features**:
  - Revenue distribution by product
  - Custom color palette
  - Percentage labels
  - Detailed legend with revenue and order counts

```typescript
import { TopProducts } from '@rentalshop/ui';

const data = [
  { name: 'Laptop', revenue: 8500, orders: 12 },
  { name: 'Camera', revenue: 6200, orders: 8 },
  // ...
];

<TopProducts data={data} loading={false} />
```

## Key Features

### Responsive Design
All charts use `ResponsiveContainer` to automatically adapt to their container size.

### Interactive Elements
- **Tooltips**: Hover to see detailed information
- **Legends**: Click to show/hide data series
- **Data Points**: Interactive points on line charts

### Custom Styling
- Consistent color scheme matching the rental shop theme
- Professional typography and spacing
- Smooth animations and transitions

### Data Formatting
- Currency formatting for monetary values
- Percentage formatting for pie charts
- Abbreviated values (e.g., $15k instead of $15,000)

## Usage Examples

### Basic Usage
```typescript
import { IncomeChart, OrderChart, TopProducts } from '@rentalshop/ui';

function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <IncomeChart data={incomeData} />
      <OrderChart data={orderData} />
      <TopProducts data={productData} />
    </div>
  );
}
```

### With Loading States
```typescript
function Dashboard({ loading }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <IncomeChart data={incomeData} loading={loading} />
      <OrderChart data={orderData} loading={loading} />
    </div>
  );
}
```

### Custom Data Transformation
```typescript
// Transform API data to chart format
const transformIncomeData = (apiData) => {
  return apiData.map(item => ({
    month: item.month,
    year: item.year,
    realIncome: parseFloat(item.realIncome),
    futureIncome: parseFloat(item.futureIncome)
  }));
};

<IncomeChart data={transformIncomeData(apiData)} />
```

## Performance Considerations

### Bundle Size
- Recharts adds approximately 200KB to the bundle size
- Tree-shaking is supported for optimal bundle size
- Only import the components you need

### Rendering Performance
- Charts are optimized for React 18
- Use `loading` prop to prevent rendering during data fetching
- Consider virtualizing large datasets

## Customization

### Colors
You can customize chart colors by modifying the color constants in each component:

```typescript
// In TopProducts.tsx
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
```

### Styling
Charts inherit Tailwind CSS classes and can be styled using the Card components:

```typescript
<Card className="border-2 border-blue-200">
  <CardHeader className="bg-blue-50">
    <CardTitle>Custom Styled Chart</CardTitle>
  </CardHeader>
  <CardContent>
    <IncomeChart data={data} />
  </CardContent>
</Card>
```

## Migration from Custom Charts

The previous custom CSS-based charts have been replaced with Recharts components. The main benefits include:

1. **Better Interactivity**: Hover effects, tooltips, and legends
2. **Professional Appearance**: Smooth animations and polished design
3. **Accessibility**: Built-in accessibility features
4. **Maintainability**: Standard charting library with good documentation
5. **Performance**: Optimized rendering and memory usage

## Troubleshooting

### Common Issues

1. **Charts not rendering**: Ensure data is in the correct format
2. **Responsive issues**: Check container width and height
3. **Performance**: Use loading states and avoid re-rendering unnecessarily

### Debug Tips

```typescript
// Add console.log to debug data
console.log('Chart data:', data);

// Check if data is properly formatted
if (!data || data.length === 0) {
  console.warn('No data provided to chart');
}
```

## Next Steps

1. Update API endpoints to provide data in the expected format
2. Add more chart types as needed (AreaChart, ComposedChart, etc.)
3. Implement real-time data updates
4. Add chart export functionality
5. Create dashboard layouts using the new chart components

## Resources

- [Recharts Documentation](https://recharts.org/)
- [Recharts Examples](https://recharts.org/en-US/examples)
- [Chart Types Reference](https://recharts.org/en-US/api) 