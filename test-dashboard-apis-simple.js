#!/usr/bin/env node

/**
 * Simplified Dashboard APIs Test Script
 * Tests all APIs used in dashboard with different time periods
 * Shows API responses for debugging
 */

// Test configuration
const BASE_URL = process.env.API_URL || 'https://dev-apis-development.up.railway.app';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMDIsImVtYWlsIjoibWVyY2hhbnQxQGV4YW1wbGUuY29tIiwicm9sZSI6Ik1FUkNIQU5UIiwibWVyY2hhbnRJZCI6MSwib3V0bGV0SWQiOm51bGwsImlhdCI6MTc2MDExMTczOCwiZXhwIjoxNzYwNzE2NTM4fQ.obr82QXiwoipo3Nai6Q-cVNO-YwhWhjGf2dIxK0bSZ8';

// Time periods
const TIME_PERIODS = {
  year2024: {
    name: '2024 Year',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    groupBy: 'month'
  },
  year2025: {
    name: '2025 Year',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    groupBy: 'month'
  }
};

// Dashboard APIs list
const DASHBOARD_APIS = [
  {
    name: 'Enhanced Dashboard Summary',
    endpoint: '/api/analytics/enhanced-dashboard',
    params: ['startDate', 'endDate', 'groupBy']
  },
  {
    name: 'Growth Metrics',
    endpoint: '/api/analytics/growth-metrics',
    params: ['startDate', 'endDate']
  },
  {
    name: 'Income Analytics',
    endpoint: '/api/analytics/income',
    params: ['startDate', 'endDate', 'groupBy']
  },
  {
    name: 'Order Analytics',
    endpoint: '/api/analytics/orders',
    params: ['startDate', 'endDate', 'groupBy']
  },
  {
    name: 'Top Products',
    endpoint: '/api/analytics/top-products',
    params: ['startDate', 'endDate']
  },
  {
    name: 'Top Customers',
    endpoint: '/api/analytics/top-customers',
    params: ['startDate', 'endDate']
  }
];

async function callAPI(api, period) {
  let url = `${BASE_URL}${api.endpoint}?`;
  const params = [];
  
  api.params.forEach(param => {
    if (period[param]) {
      params.push(`${param}=${period[param]}`);
    }
  });
  
  url += params.join('&');
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data,
      url
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      url
    };
  }
}

async function runTests() {
  console.log('\n🧪 ===== DASHBOARD APIs TEST =====\n');
  console.log(`📍 Base URL: ${BASE_URL}\n`);
  
  for (const [periodKey, period] of Object.entries(TIME_PERIODS)) {
    console.log(`\n📊 ===== Period: ${period.name} =====`);
    console.log(`   Date Range: ${period.startDate} → ${period.endDate}\n`);
    
    for (const api of DASHBOARD_APIS) {
      console.log(`\n   🔍 Testing: ${api.name}`);
      
      const result = await callAPI(api, period);
      
      console.log(`      URL: ${result.url}`);
      console.log(`      Status: ${result.status}`);
      
      if (result.success) {
        console.log(`      ✅ Success`);
        
        // Extract key metrics from response
        if (api.name === 'Enhanced Dashboard Summary') {
          const data = result.data?.data;
          console.log(`      📊 Response:`, JSON.stringify({
            today: data?.today,
            thisMonth: data?.thisMonth,
            activeRentals: data?.activeRentals,
            growth: data?.growth
          }, null, 2));
        } else if (api.name === 'Growth Metrics') {
          console.log(`      📊 Response:`, JSON.stringify(result.data?.data, null, 2));
        } else if (api.name === 'Income Analytics') {
          const data = result.data?.data;
          console.log(`      📊 Data Points: ${data?.length || 0}`);
          if (data && data.length > 0) {
            console.log(`      📊 First: ${JSON.stringify(data[0])}`);
            console.log(`      📊 Last: ${JSON.stringify(data[data.length - 1])}`);
          }
        } else if (api.name === 'Order Analytics') {
          const data = result.data?.data;
          console.log(`      📊 Data Points: ${data?.length || 0}`);
        } else if (api.name === 'Top Products') {
          const data = result.data?.data;
          console.log(`      📊 Products: ${data?.length || 0}`);
          if (data && data.length > 0) {
            console.log(`      📊 Top 3:`, data.slice(0, 3).map(p => ({
              name: p.name,
              rentals: p.rentalCount,
              revenue: p.totalRevenue
            })));
          }
        } else if (api.name === 'Top Customers') {
          const data = result.data?.data;
          console.log(`      📊 Customers: ${data?.length || 0}`);
          if (data && data.length > 0) {
            console.log(`      📊 Top 3:`, data.slice(0, 3).map(c => ({
              name: c.name,
              orders: c.orderCount,
              spent: c.totalSpent
            })));
          }
        }
      } else {
        console.log(`      ❌ Failed: ${result.error || result.data?.error || 'Unknown'}`);
        if (result.data) {
          console.log(`      📊 Response:`, JSON.stringify(result.data, null, 2));
        }
      }
    }
  }
  
  console.log('\n\n✅ Test Complete!\n');
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

