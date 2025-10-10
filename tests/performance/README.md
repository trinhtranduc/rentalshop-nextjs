# Performance Test Suite

This directory contains comprehensive performance tests for the RentalShop application, specifically designed to test performance with large datasets (100k+ orders) and Vercel deployment compatibility.

## 📁 Test Files

### 1. `order-performance.test.js`
Tests optimized order queries and database performance:
- ✅ Optimized order search functions
- ✅ Cursor-based pagination
- ✅ Order details optimization
- ✅ Database index effectiveness
- ✅ Old vs new query comparison
- ✅ Vercel compatibility check

### 2. `database-stress.test.js`
Tests database performance under high load:
- 🔄 Concurrent user simulation
- 📊 Record limit testing
- 💾 Memory usage monitoring
- 🔄 Transaction performance
- ⏰ Query timeout scenarios

### 3. `vercel-compatibility.test.js`
Tests specific Vercel limitations:
- ⏰ Function timeout limits
- 💾 Memory usage limits
- ❄️ Cold start performance
- 🔄 Concurrent request handling
- 💡 Deployment recommendations

### 4. `run-all-tests.js`
Master script to run all tests:
- 🔍 Prerequisites checking
- 🧪 Sequential test execution
- 📈 Comprehensive reporting
- 💡 Deployment readiness assessment

## 🚀 Quick Start

### Run All Tests
```bash
# Run complete test suite
node tests/performance/run-all-tests.js
```

### Run Individual Tests
```bash
# Order performance tests
node tests/performance/order-performance.test.js

# Database stress tests
node tests/performance/database-stress.test.js

# Vercel compatibility tests
node tests/performance/vercel-compatibility.test.js
```

## 📊 Test Data Requirements

### Minimum Requirements
- **Orders**: 100+ (basic testing)
- **Merchants**: 2+ 
- **Customers**: 100+
- **Products**: 50+

### Recommended for Full Testing
- **Orders**: 100,000+ (comprehensive stress testing)
- **Merchants**: 10+
- **Customers**: 10,000+
- **Products**: 1,000+

### Generate Test Data
```bash
# Generate 100k orders for comprehensive testing
node scripts/generate-large-test-data.js
```

## 🎯 Test Scenarios

### Order Performance Tests
- **Basic Search**: Simple order queries
- **Status Filtering**: Filter by order status
- **Date Range**: Filter by creation date
- **Text Search**: Search by order number/customer
- **Complex Filters**: Multiple filter combinations

### Stress Test Scenarios
- **Concurrent Users**: 1, 5, 10, 20, 50 users
- **Query Volumes**: 100, 500, 1000, 5000, 10000 queries
- **Record Limits**: 10, 50, 100, 500, 1000 records
- **Memory Testing**: Large result sets and deep nesting

### Vercel Compatibility
- **Timeout Limits**: 
  - Hobby: 10 seconds
  - Pro: 60 seconds
  - Enterprise: 900 seconds
- **Memory Limits**:
  - Hobby/Pro: 1GB
  - Enterprise: 3GB
- **Cold Start**: Connection and first query performance

## 📈 Performance Benchmarks

### Expected Performance (with optimizations)
- **Basic queries**: < 100ms
- **Complex queries**: < 500ms
- **Large datasets (10k records)**: < 1000ms
- **Memory usage**: < 500MB for most queries
- **Cold start**: < 1000ms

### Vercel Plan Compatibility
- **Hobby Plan**: ✅ For datasets < 10k orders
- **Pro Plan**: ✅ For datasets < 100k orders
- **Enterprise Plan**: ✅ For any dataset size

## 🛠️ Optimization Features Tested

### Database Optimizations
- ✅ **Indexes**: 7 new performance indexes added
- ✅ **Query Optimization**: Select vs Include optimization
- ✅ **Pagination**: Cursor-based pagination
- ✅ **Connection Pooling**: Efficient connection management

### Application Optimizations
- ✅ **Performance Monitoring**: Real-time query monitoring
- ✅ **Memory Management**: Efficient data loading
- ✅ **Error Handling**: Graceful failure handling
- ✅ **Caching Strategy**: Query result caching (planned)

## 📋 Test Results Interpretation

### ✅ Success Indicators
- All queries complete within expected time limits
- Memory usage stays within plan limits
- No timeout errors
- Consistent performance across test runs

### ⚠️ Warning Indicators
- Some queries take longer than expected
- Memory usage approaching limits
- Occasional timeout errors
- Performance degradation under load

### ❌ Failure Indicators
- Frequent timeout errors
- Memory usage exceeds limits
- Database connection failures
- Inconsistent performance

## 🔧 Troubleshooting

### Common Issues

#### "No orders found"
```bash
# Generate test data
node scripts/generate-large-test-data.js
```

#### "Database connection failed"
```bash
# Check database connection
npx prisma db push
npx prisma generate
```

#### "Timeout errors"
- Check database indexes
- Optimize query structure
- Consider upgrading Vercel plan
- Implement query caching

#### "Memory errors"
- Optimize query selects
- Implement pagination
- Reduce concurrent operations
- Upgrade Vercel plan

### Performance Optimization Tips

1. **Database Indexes**
   ```sql
   -- Ensure these indexes exist
   @@index([createdAt])
   @@index([status, outletId])
   @@index([outletId, createdAt])
   ```

2. **Query Optimization**
   ```typescript
   // Use select instead of include
   select: { id: true, orderNumber: true }
   // Instead of
   include: { customer: true, outlet: true }
   ```

3. **Pagination**
   ```typescript
   // Use cursor-based pagination for large datasets
   const result = await searchOrdersWithCursor({
     cursor: '2024-01-01T00:00:00Z',
     limit: 50
   });
   ```

4. **Memory Management**
   ```typescript
   // Limit result sets
   take: 100  // Instead of loading all records
   ```

## 📚 Additional Resources

- [Database Schema](./../../prisma/schema.prisma)
- [Performance Monitoring](./../../packages/utils/src/performance.ts)
- [Optimized Queries](./../../packages/database/src/order-optimized.ts)
- [Vercel Limits](https://vercel.com/docs/limits)

## 🎯 Next Steps After Testing

1. **Review Results**: Analyze test outputs for performance issues
2. **Optimize Queries**: Address any slow queries identified
3. **Choose Vercel Plan**: Select plan based on test results
4. **Set Up Monitoring**: Implement production performance monitoring
5. **Deploy**: Deploy to Vercel with confidence

---

**Note**: These tests are designed for the RentalShop application with Prisma and SQLite. Adjust configurations as needed for your specific setup.
