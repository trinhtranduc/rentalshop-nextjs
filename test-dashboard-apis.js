#!/usr/bin/env node

/**
 * Dashboard APIs Test Script
 * Tests all APIs used in dashboard with different time periods
 * Compares API responses with actual database data
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// Test configuration
const BASE_URL = process.env.API_URL || 'https://dev-apis-development.up.railway.app';
const AUTH_TOKEN = process.env.TEST_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbHh5Z3R6YzAwMDA0N3V5cjB1Z2h5MDAiLCJlbWFpbCI6Im1lcmNoYW50MUBleGFtcGxlLmNvbSIsInJvbGUiOiJNRVJDSEFOVCIsIm1lcmNoYW50SWQiOjEsIm91dGxldElkIjpudWxsLCJpYXQiOjE3MzY3NjQ5NDYsImV4cCI6MTczNzM2OTc0Nn0.4oYJvRkzqVqQlWqQlWqQlWqQlWqQlWqQlWqQlWqQ';

// Time period configurations
const TIME_PERIODS = {
  today: {
    name: 'Today',
    getDateRange: () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      return { startDate: todayStr, endDate: todayStr, groupBy: 'day' };
    }
  },
  month: {
    name: 'Current Month',
    getDateRange: () => {
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return {
        startDate: monthStart.toISOString().split('T')[0],
        endDate: monthEnd.toISOString().split('T')[0],
        groupBy: 'day'
      };
    }
  },
  year: {
    name: 'Current Year',
    getDateRange: () => {
      const today = new Date();
      const yearStart = new Date(today.getFullYear(), 0, 1);
      const yearEnd = new Date(today.getFullYear(), 11, 31);
      return {
        startDate: yearStart.toISOString().split('T')[0],
        endDate: yearEnd.toISOString().split('T')[0],
        groupBy: 'month'
      };
    }
  },
  year2024: {
    name: '2024 Year',
    getDateRange: () => ({
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      groupBy: 'month'
    })
  }
};

// Dashboard APIs
const DASHBOARD_APIS = [
  {
    name: 'Enhanced Dashboard Summary',
    endpoint: '/api/analytics/enhanced-dashboard',
    requiresDateRange: true,
    requiresGroupBy: true,
    dbCheck: async (startDate, endDate) => {
      const start = new Date(startDate);
      const end = new Date(endDate + 'T23:59:59');
      
      const orders = await prisma.order.findMany({
        where: {
          createdAt: { gte: start, lte: end }
        }
      });
      
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      
      return {
        ordersCount: orders.length,
        totalRevenue,
        firstOrder: orders[0] ? {
          orderNumber: orders[0].orderNumber,
          createdAt: orders[0].createdAt,
          totalAmount: orders[0].totalAmount
        } : null
      };
    }
  },
  {
    name: 'Today Metrics',
    endpoint: '/api/analytics/today-metrics',
    requiresDateRange: false,
    requiresGroupBy: false,
    dbCheck: async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      const orders = await prisma.order.findMany({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay }
        }
      });
      
      return {
        ordersCount: orders.length,
        totalRevenue: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
      };
    }
  },
  {
    name: 'Growth Metrics',
    endpoint: '/api/analytics/growth-metrics',
    requiresDateRange: true,
    requiresGroupBy: false,
    dbCheck: async (startDate, endDate) => {
      const start = new Date(startDate);
      const end = new Date(endDate + 'T23:59:59');
      
      const currentOrders = await prisma.order.findMany({
        where: {
          createdAt: { gte: start, lte: end }
        }
      });
      
      return {
        ordersCount: currentOrders.length,
        totalRevenue: currentOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
      };
    }
  },
  {
    name: 'Income Analytics',
    endpoint: '/api/analytics/income',
    requiresDateRange: true,
    requiresGroupBy: true,
    dbCheck: async (startDate, endDate) => {
      const start = new Date(startDate);
      const end = new Date(endDate + 'T23:59:59');
      
      const payments = await prisma.payment.findMany({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: start, lte: end }
        }
      });
      
      return {
        paymentsCount: payments.length,
        totalAmount: payments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
      };
    }
  },
  {
    name: 'Order Analytics',
    endpoint: '/api/analytics/orders',
    requiresDateRange: true,
    requiresGroupBy: true,
    dbCheck: async (startDate, endDate) => {
      const start = new Date(startDate);
      const end = new Date(endDate + 'T23:59:59');
      
      const orders = await prisma.order.findMany({
        where: {
          createdAt: { gte: start, lte: end }
        },
        include: {
          _count: {
            select: { orderItems: true }
          }
        }
      });
      
      return {
        ordersCount: orders.length,
        totalItems: orders.reduce((sum, order) => sum + (order._count?.orderItems || 0), 0)
      };
    }
  },
  {
    name: 'Top Products',
    endpoint: '/api/analytics/top-products',
    requiresDateRange: true,
    requiresGroupBy: false,
    dbCheck: async (startDate, endDate) => {
      const start = new Date(startDate);
      const end = new Date(endDate + 'T23:59:59');
      
      const orderItems = await prisma.orderItem.findMany({
        where: {
          order: {
            createdAt: { gte: start, lte: end }
          }
        },
        include: {
          product: true
        }
      });
      
      // Group by product
      const productStats = {};
      orderItems.forEach(item => {
        const productId = item.productId;
        if (!productStats[productId]) {
          productStats[productId] = {
            name: item.product?.name || 'Unknown',
            count: 0,
            revenue: 0
          };
        }
        productStats[productId].count += item.quantity || 1;
        productStats[productId].revenue += item.totalPrice || 0;
      });
      
      return {
        uniqueProducts: Object.keys(productStats).length,
        topProduct: Object.values(productStats).sort((a, b) => b.count - a.count)[0]
      };
    }
  },
  {
    name: 'Top Customers',
    endpoint: '/api/analytics/top-customers',
    requiresDateRange: true,
    requiresGroupBy: false,
    dbCheck: async (startDate, endDate) => {
      const start = new Date(startDate);
      const end = new Date(endDate + 'T23:59:59');
      
      const orders = await prisma.order.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          customerId: { not: null }
        },
        include: {
          customer: true
        }
      });
      
      // Group by customer
      const customerStats = {};
      orders.forEach(order => {
        const customerId = order.customerId;
        if (customerId && !customerStats[customerId]) {
          customerStats[customerId] = {
            name: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Unknown',
            ordersCount: 0,
            totalSpent: 0
          };
        }
        if (customerId) {
          customerStats[customerId].ordersCount++;
          customerStats[customerId].totalSpent += order.totalAmount || 0;
        }
      });
      
      return {
        uniqueCustomers: Object.keys(customerStats).length,
        topCustomer: Object.values(customerStats).sort((a, b) => b.totalSpent - a.totalSpent)[0]
      };
    }
  },
  {
    name: 'Dashboard Summary',
    endpoint: '/api/analytics/dashboard',
    requiresDateRange: false,
    requiresGroupBy: false,
    dbCheck: async () => {
      const allOrders = await prisma.order.findMany();
      
      return {
        totalOrders: allOrders.length,
        totalRevenue: allOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
        activeOrders: allOrders.filter(order => order.status === 'PICKUPED').length
      };
    }
  }
];

// Helper function to make API call
async function callAPI(api, dateRange = {}) {
  const { startDate, endDate, groupBy } = dateRange;
  
  let url = `${BASE_URL}${api.endpoint}`;
  const params = [];
  
  if (api.requiresDateRange && startDate && endDate) {
    params.push(`startDate=${startDate}`);
    params.push(`endDate=${endDate}`);
  }
  
  if (api.requiresGroupBy && groupBy) {
    params.push(`groupBy=${groupBy}`);
  }
  
  if (params.length > 0) {
    url += '?' + params.join('&');
  }
  
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

// Test runner
async function runTests() {
  console.log('\n🧪 ===== DASHBOARD APIs TEST SUITE =====\n');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🔑 Auth Token: ${AUTH_TOKEN.substring(0, 20)}...`);
  console.log(`📅 Testing ${Object.keys(TIME_PERIODS).length} time periods`);
  console.log(`🔌 Testing ${DASHBOARD_APIS.length} APIs\n`);
  
  const results = [];
  
  for (const [periodKey, period] of Object.entries(TIME_PERIODS)) {
    console.log(`\n📊 ===== Testing Period: ${period.name} =====\n`);
    
    const dateRange = period.getDateRange();
    console.log(`   Date Range: ${dateRange.startDate} → ${dateRange.endDate}`);
    console.log(`   Group By: ${dateRange.groupBy}\n`);
    
    for (const api of DASHBOARD_APIS) {
      console.log(`   🔍 ${api.name}...`);
      
      // Call API
      const apiResponse = await callAPI(api, dateRange);
      
      // Check database
      let dbData = null;
      try {
        if (api.requiresDateRange) {
          dbData = await api.dbCheck(dateRange.startDate, dateRange.endDate);
        } else {
          dbData = await api.dbCheck();
        }
      } catch (error) {
        console.log(`      ❌ DB Check Error: ${error.message}`);
      }
      
      // Compare results
      const result = {
        period: period.name,
        api: api.name,
        url: apiResponse.url,
        apiSuccess: apiResponse.success,
        apiStatus: apiResponse.status,
        apiData: apiResponse.data,
        dbData,
        match: null,
        issues: []
      };
      
      if (apiResponse.success && dbData) {
        // Compare API response with DB data
        if (api.name === 'Enhanced Dashboard Summary') {
          const apiOrders = apiResponse.data?.data?.today?.orders || 0;
          const apiRevenue = apiResponse.data?.data?.today?.revenue || 0;
          
          if (apiOrders !== dbData.ordersCount) {
            result.issues.push(`Orders mismatch: API=${apiOrders}, DB=${dbData.ordersCount}`);
          }
          if (Math.abs(apiRevenue - dbData.totalRevenue) > 0.01) {
            result.issues.push(`Revenue mismatch: API=${apiRevenue}, DB=${dbData.totalRevenue}`);
          }
          
          result.match = result.issues.length === 0;
          
          console.log(`      ${result.match ? '✅' : '❌'} Orders: API=${apiOrders} | DB=${dbData.ordersCount}`);
          console.log(`      ${result.match ? '✅' : '❌'} Revenue: API=$${apiRevenue} | DB=$${dbData.totalRevenue}`);
        } else {
          console.log(`      ✅ API Success`);
          console.log(`      📊 DB Data:`, JSON.stringify(dbData, null, 2));
        }
      } else if (!apiResponse.success) {
        console.log(`      ❌ API Failed: ${apiResponse.error || apiResponse.data?.error || 'Unknown error'}`);
      }
      
      results.push(result);
      console.log('');
    }
  }
  
  // Summary
  console.log('\n📋 ===== TEST SUMMARY =====\n');
  
  const totalTests = results.length;
  const successfulAPIs = results.filter(r => r.apiSuccess).length;
  const matchedData = results.filter(r => r.match === true).length;
  const issues = results.filter(r => r.issues && r.issues.length > 0);
  
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Successful API Calls: ${successfulAPIs}/${totalTests}`);
  console.log(`   Data Matches: ${matchedData}/${results.filter(r => r.match !== null).length}`);
  console.log(`   Issues Found: ${issues.length}\n`);
  
  if (issues.length > 0) {
    console.log('⚠️  Issues Detected:\n');
    issues.forEach(issue => {
      console.log(`   ❌ ${issue.period} - ${issue.api}:`);
      issue.issues.forEach(msg => console.log(`      • ${msg}`));
      console.log('');
    });
  }
  
  await prisma.$disconnect();
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

