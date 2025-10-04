# 🚀 RentalShop Stress Testing Suite

Comprehensive stress testing tools for testing performance with **1 Million Orders** dataset.

## 📊 Target Dataset

- **1,000,000 Orders** across multiple merchants and outlets
- **10,000 Stores** (outlets)
- **100,000 Users** (staff and admins)
- **1,000,000 Products** across all merchants
- **10,000 Customers** for order creation

## 🛠️ Stress Testing Tools

### 1. **Artillery.js** (Recommended)
```bash
# Install
npm install -g artillery

# Run tests
artillery run stress-tests/artillery-config.yml
```

**Features:**
- ✅ HTTP/HTTPS API testing
- ✅ WebSocket support
- ✅ Realistic user scenarios
- ✅ Detailed reporting
- ✅ CI/CD integration

### 2. **k6** (Advanced)
```bash
# Install (macOS)
brew install k6

# Run tests
k6 run stress-tests/k6-order-stress-test.js
```

**Features:**
- ✅ JavaScript-based scripting
- ✅ Real browser testing
- ✅ Advanced metrics
- ✅ Cloud testing
- ✅ Load testing at scale

### 3. **Autocannon** (Simple & Fast)
```bash
# Install
npm install -g autocannon

# Run tests
node stress-tests/autocannon-stress-test.js
```

**Features:**
- ✅ Fast and lightweight
- ✅ Simple configuration
- ✅ Real-time metrics
- ✅ Easy to use

## 🚀 Quick Start

### Option 1: Run All Tests (Recommended)
```bash
cd stress-tests
./run-stress-tests.sh
```

### Option 2: Run Individual Tests
```bash
# Generate test data first
node stress-tests/generate-test-data.js

# Run Artillery
artillery run stress-tests/artillery-config.yml

# Run k6
k6 run stress-tests/k6-order-stress-test.js

# Run Autocannon
node stress-tests/autocannon-stress-test.js
```

## 📈 Test Scenarios

### Order Search Performance (40% of traffic)
- Basic order listing with pagination
- Order details retrieval
- Performance with large datasets

### Order Creation Performance (20% of traffic)
- Creating new orders
- Order item management
- Customer assignment

### Order Filtering Performance (25% of traffic)
- Filter by status, type, date range
- Complex search queries
- Performance with filters

### Complex Search Performance (15% of traffic)
- Multi-field searches
- Date range queries
- Text search across orders

## 📊 Expected Performance Metrics

### With Database Optimizations
- **Basic queries**: 50-200ms ⚡
- **Complex queries**: 200-500ms ⚡
- **Large datasets (10k)**: 500-1000ms ⚡
- **Memory usage**: 200-500MB 💾

### Load Testing Targets
- **Concurrent Users**: 10-200
- **Requests per Second**: 50-500
- **Response Time (95th percentile)**: < 1000ms
- **Error Rate**: < 1%

## 🎯 Vercel Compatibility

### Plan Recommendations
| Dataset Size | Hobby Plan | Pro Plan | Enterprise Plan |
|-------------|------------|----------|-----------------|
| < 10K orders | ✅ Good | ✅ Excellent | ✅ Excellent |
| < 100K orders | ❌ Poor | ✅ Good | ✅ Excellent |
| < 1M orders | ❌ Poor | ⚠️ Limited | ✅ Excellent |
| 1M+ orders | ❌ Poor | ❌ Poor | ✅ Recommended |

### Vercel Limits
- **Hobby**: 10s timeout, 1GB memory
- **Pro**: 60s timeout, 1GB memory  
- **Enterprise**: 900s timeout, 3GB memory

## 📋 Test Configuration

### Artillery Configuration
```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 10
      rampTo: 50
      name: "Ramp up load"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 180
      arrivalRate: 100
      name: "Peak load"
```

### k6 Configuration
```javascript
export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '2m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '3m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.1'],
  },
};
```

## 📊 Understanding Results

### Performance Grades
- **A Grade**: < 500ms latency, < 2% error rate
- **B Grade**: 500-1000ms latency, 2-5% error rate
- **C Grade**: > 1000ms latency, > 5% error rate

### Key Metrics
- **Throughput**: Requests per second
- **Latency**: Response time (avg, p95, p99)
- **Error Rate**: Percentage of failed requests
- **Memory Usage**: RAM consumption during tests

## 🔧 Troubleshooting

### Common Issues

#### "Server not responding"
```bash
# Check if server is running
curl http://localhost:3000/api/orders

# Start server if needed
yarn dev
```

#### "High latency detected"
- Check database indexes
- Optimize query structure
- Implement caching
- Consider connection pooling

#### "High error rate"
- Check server logs
- Monitor memory usage
- Review API implementation
- Consider rate limiting

### Performance Optimization Tips

1. **Database Optimization**
   ```sql
   -- Ensure indexes exist
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
   // Use cursor-based pagination
   const result = await searchOrdersWithCursor({
     cursor: '2024-01-01T00:00:00Z',
     limit: 50
   });
   ```

## 📚 Additional Resources

- [Artillery Documentation](https://artillery.io/docs/)
- [k6 Documentation](https://k6.io/docs/)
- [Autocannon Documentation](https://github.com/mcollina/autocannon)
- [Database Schema](../prisma/schema.prisma)
- [Performance Monitoring](../packages/utils/src/performance.ts)

## 🎯 Next Steps

1. **Generate Test Data**
   ```bash
   node scripts/generate-massive-test-data.js
   ```

2. **Run Stress Tests**
   ```bash
   ./stress-tests/run-stress-tests.sh
   ```

3. **Analyze Results**
   - Review generated reports
   - Identify performance bottlenecks
   - Optimize based on findings

4. **Deploy with Confidence**
   - Choose appropriate Vercel plan
   - Set up monitoring
   - Implement alerting

---

**Note**: These stress tests are designed for the RentalShop application with Prisma and SQLite. Adjust configurations as needed for your specific setup.
