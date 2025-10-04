import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const orderSearchDuration = new Trend('order_search_duration');
const orderCreationDuration = new Trend('order_creation_duration');
const orderFilterDuration = new Trend('order_filter_duration');

// Test configuration
export const options = {
  stages: [
    // Warm-up
    { duration: '1m', target: 10 },
    // Ramp up
    { duration: '2m', target: 50 },
    // Sustained load
    { duration: '5m', target: 50 },
    // Peak load
    { duration: '3m', target: 100 },
    // Ramp down
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests must complete below 1s
    http_req_failed: ['rate<0.1'],     // Error rate must be below 10%
    errors: ['rate<0.1'],              // Custom error rate must be below 10%
  },
};

// Test data
const BASE_URL = 'http://localhost:3000';
const ORDER_IDS = [1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const CUSTOMER_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const OUTLET_IDS = [1, 2, 3, 4, 5];
const PRODUCT_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function setup() {
  console.log('🚀 Starting k6 Order Stress Test');
  console.log('📊 Target: 1 Million Orders Dataset');
  
  // Warm up the database
  const warmupResponse = http.get(`${BASE_URL}/api/orders?limit=1`);
  check(warmupResponse, {
    'warmup successful': (r) => r.status === 200,
  });
  
  return {
    startTime: new Date().toISOString(),
  };
}

export default function(data) {
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    // 40% - Order Search Performance
    testOrderSearch();
  } else if (scenario < 0.6) {
    // 20% - Order Creation Performance
    testOrderCreation();
  } else if (scenario < 0.85) {
    // 25% - Order Filtering Performance
    testOrderFiltering();
  } else {
    // 15% - Complex Search Performance
    testComplexSearch();
  }
  
  sleep(Math.random() * 2 + 0.5); // Random sleep between 0.5-2.5 seconds
}

function testOrderSearch() {
  const startTime = Date.now();
  
  // Random pagination
  const limit = Math.floor(Math.random() * 50) + 10; // 10-60
  const offset = Math.floor(Math.random() * 1000);   // 0-1000
  
  const response = http.get(`${BASE_URL}/api/orders?limit=${limit}&offset=${offset}`);
  
  const duration = Date.now() - startTime;
  orderSearchDuration.add(duration);
  
  const success = check(response, {
    'order search status is 200': (r) => r.status === 200,
    'order search has data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.success && Array.isArray(data.data?.orders);
      } catch {
        return false;
      }
    },
    'order search response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!success);
  
  if (!success) {
    console.log(`❌ Order search failed: ${response.status} - ${response.body.substring(0, 200)}`);
  }
}

function testOrderCreation() {
  const startTime = Date.now();
  
  const orderData = {
    orderType: Math.random() > 0.5 ? 'RENT' : 'SALE',
    outletId: OUTLET_IDS[Math.floor(Math.random() * OUTLET_IDS.length)],
    customerId: CUSTOMER_IDS[Math.floor(Math.random() * CUSTOMER_IDS.length)],
    totalAmount: Math.floor(Math.random() * 900) + 100, // 100-1000
    depositAmount: Math.floor(Math.random() * 200) + 50, // 50-250
    orderItems: [
      {
        productId: PRODUCT_IDS[Math.floor(Math.random() * PRODUCT_IDS.length)],
        quantity: Math.floor(Math.random() * 4) + 1, // 1-5
        unitPrice: Math.floor(Math.random() * 150) + 50, // 50-200
        totalPrice: Math.floor(Math.random() * 900) + 100, // 100-1000
      }
    ]
  };
  
  const response = http.post(`${BASE_URL}/api/orders`, JSON.stringify(orderData), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token', // You'll need to implement auth
    },
  });
  
  const duration = Date.now() - startTime;
  orderCreationDuration.add(duration);
  
  const success = check(response, {
    'order creation status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'order creation response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!success);
  
  if (!success) {
    console.log(`❌ Order creation failed: ${response.status} - ${response.body.substring(0, 200)}`);
  }
}

function testOrderFiltering() {
  const startTime = Date.now();
  
  const statuses = ['RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED'];
  const orderTypes = ['RENT', 'SALE'];
  
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const orderType = orderTypes[Math.floor(Math.random() * orderTypes.length)];
  const limit = Math.floor(Math.random() * 30) + 10; // 10-40
  
  const response = http.get(
    `${BASE_URL}/api/orders?status=${status}&orderType=${orderType}&limit=${limit}`
  );
  
  const duration = Date.now() - startTime;
  orderFilterDuration.add(duration);
  
  const success = check(response, {
    'order filter status is 200': (r) => r.status === 200,
    'order filter has filtered data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.success && Array.isArray(data.data?.orders);
      } catch {
        return false;
      }
    },
    'order filter response time < 1500ms': (r) => r.timings.duration < 1500,
  });
  
  errorRate.add(!success);
  
  if (!success) {
    console.log(`❌ Order filtering failed: ${response.status} - ${response.body.substring(0, 200)}`);
  }
}

function testComplexSearch() {
  const startTime = Date.now();
  
  // Complex search with multiple filters
  const params = {
    q: 'ORD',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    limit: Math.floor(Math.random() * 40) + 20, // 20-60
    offset: Math.floor(Math.random() * 50),    // 0-50
  };
  
  const queryString = Object.keys(params)
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const response = http.get(`${BASE_URL}/api/orders?${queryString}`);
  
  const duration = Date.now() - startTime;
  orderSearchDuration.add(duration);
  
  const success = check(response, {
    'complex search status is 200': (r) => r.status === 200,
    'complex search has results': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.success;
      } catch {
        return false;
      }
    },
    'complex search response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!success);
  
  if (!success) {
    console.log(`❌ Complex search failed: ${response.status} - ${response.body.substring(0, 200)}`);
  }
}

export function teardown(data) {
  console.log('🏁 k6 Order Stress Test Completed');
  console.log(`📊 Test started at: ${data.startTime}`);
  console.log(`📊 Test ended at: ${new Date().toISOString()}`);
}
