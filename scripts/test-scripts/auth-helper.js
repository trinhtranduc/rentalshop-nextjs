#!/usr/bin/env node

/**
 * Authentication Helper for Test Scripts
 * Provides functions to get authentication tokens for merchants and admins
 */

// Using direct API calls for test scripts to avoid module resolution issues
const API_BASE = 'http://localhost:3002';

/**
 * Get admin authentication token
 */
async function getAdminToken() {
  try {
    console.log('🔑 Getting admin token...');
    
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@rentalshop.com',
        password: 'admin123'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Admin login failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.data && data.data.token) {
      console.log('✅ Admin token obtained successfully');
      return {
        token: data.data.token,
        user: data.data.user,
        role: 'ADMIN'
      };
    } else if (data.token) {
      // Handle case where API returns token but not wrapped in success object
      console.log('✅ Admin token obtained successfully');
      return {
        token: data.token,
        user: data.user || { email: 'admin@rentalshop.com', role: 'ADMIN' },
        role: 'ADMIN'
      };
    } else {
      throw new Error(`Admin login failed: ${data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('❌ Failed to get admin token:', error.message);
    return null;
  }
}

/**
 * Get merchant authentication token
 */
async function getMerchantToken(merchantEmail = null) {
  try {
    console.log('🔑 Getting merchant token...');
    
    // If no email provided, find a merchant with active subscription
    let email = merchantEmail;
    if (!email) {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const merchant = await prisma.merchant.findFirst({
        where: {
          subscriptions: {
            some: { status: 'ACTIVE' }
          }
        }
      });
      
      // Get a user from this merchant
      const user = await prisma.user.findFirst({
        where: { merchantId: merchant.id }
      });
      
      if (!merchant || !user) {
        throw new Error('No merchant with active subscription found');
      }
      
      email = user.email;
      await prisma.$disconnect();
    }
    
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: 'merchant123' // Default password for seeded merchants
      })
    });
    
    if (!response.ok) {
      throw new Error(`Merchant login failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.data && data.data.token) {
      console.log(`✅ Merchant token obtained for: ${email}`);
      return {
        token: data.data.token,
        user: data.data.user,
        role: 'MERCHANT'
      };
    } else if (data.token) {
      // Handle case where API returns token but not wrapped in success object
      console.log(`✅ Merchant token obtained for: ${email}`);
      return {
        token: data.token,
        user: data.user || { email: email, role: 'MERCHANT' },
        role: 'MERCHANT'
      };
    } else {
      throw new Error(`Merchant login failed: ${data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('❌ Failed to get merchant token:', error.message);
    return null;
  }
}

/**
 * Get outlet admin authentication token
 */
async function getOutletAdminToken(outletEmail = null) {
  try {
    console.log('🔑 Getting outlet admin token...');
    
    // If no email provided, find an outlet admin
    let email = outletEmail;
    if (!email) {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const outletAdmin = await prisma.user.findFirst({
        where: {
          role: 'OUTLET_ADMIN',
          isActive: true
        }
      });
      
      if (!outletAdmin) {
        throw new Error('No outlet admin found');
      }
      
      email = outletAdmin.email;
      await prisma.$disconnect();
    }
    
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: 'admin123' // Default password for seeded users
      })
    });
    
    if (!response.ok) {
      throw new Error(`Outlet admin login failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.data && data.data.token) {
      console.log(`✅ Outlet admin token obtained for: ${email}`);
      return {
        token: data.data.token,
        user: data.data.user,
        role: 'OUTLET_ADMIN'
      };
    } else if (data.token) {
      // Handle case where API returns token but not wrapped in success object
      console.log(`✅ Outlet admin token obtained for: ${email}`);
      return {
        token: data.token,
        user: data.user || { email: email, role: 'OUTLET_ADMIN' },
        role: 'OUTLET_ADMIN'
      };
    } else {
      throw new Error(`Outlet admin login failed: ${data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('❌ Failed to get outlet admin token:', error.message);
    return null;
  }
}

/**
 * Test API endpoint with authentication
 */
async function testAuthenticatedEndpoint(endpoint, method = 'GET', body = null, authToken = null) {
  try {
    // Use appropriate API client based on endpoint
    if (endpoint.startsWith('/api/merchants')) {
      if (method === 'GET') {
        const result = await merchantsApi.getMerchants(authToken);
        return {
          success: result.success,
          status: result.success ? 200 : 400,
          data: result,
          error: result.success ? null : result.message || 'Unknown error'
        };
      }
    }
    
    // Fallback to direct fetch for other endpoints
    const API_BASE = 'http://localhost:3002';
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data: data,
      error: response.ok ? null : data.message || 'Unknown error'
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      data: null,
      error: error.message
    };
  }
}

/**
 * Get all available merchants for admin testing
 */
async function getAvailableMerchants(adminToken) {
  try {
    const result = await merchantsApi.getMerchants(adminToken);
    
    if (result.success && result.data) {
      return result.data;
    } else {
      throw new Error(`Failed to get merchants: ${result.message}`);
    }
  } catch (error) {
    console.error('❌ Failed to get merchants:', error.message);
    return [];
  }
}

/**
 * Get merchant details by ID
 */
async function getMerchantDetails(merchantId, authToken) {
  try {
    const result = await merchantsApi.getMerchant(merchantId, authToken);
    
    if (result.success && result.data) {
      return result.data;
    } else {
      throw new Error(`Failed to get merchant details: ${result.message}`);
    }
  } catch (error) {
    console.error('❌ Failed to get merchant details:', error.message);
    return null;
  }
}

/**
 * Test plan change API
 */
async function testPlanChangeAPI(merchantId, planId, authToken) {
  try {
    const payload = {
      planId: planId,
      changeType: 'immediate',
      proration: true
    };
    
    const result = await testAuthenticatedEndpoint(
      `/api/merchants/${merchantId}/change-plan`,
      'POST',
      payload,
      authToken
    );
    
    return result;
  } catch (error) {
    console.error('❌ Plan change API test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test subscription extension API
 */
async function testSubscriptionExtensionAPI(merchantId, extensionMonths, authToken) {
  try {
    const payload = {
      extensionMonths: extensionMonths,
      extensionType: 'immediate',
      proration: false
    };
    
    const result = await testAuthenticatedEndpoint(
      `/api/merchants/${merchantId}/extend-subscription`,
      'POST',
      payload,
      authToken
    );
    
    return result;
  } catch (error) {
    console.error('❌ Subscription extension API test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test billing duration change API
 */
async function testBillingDurationChangeAPI(merchantId, billingCycle, authToken) {
  try {
    const payload = {
      billingCycle: billingCycle, // 'monthly', 'quarterly', 'yearly'
      changeType: 'immediate',
      proration: true
    };
    
    const result = await testAuthenticatedEndpoint(
      `/api/merchants/${merchantId}/change-billing-duration`,
      'POST',
      payload,
      authToken
    );
    
    return result;
  } catch (error) {
    console.error('❌ Billing duration change API test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calculate billing duration costs
 */
function calculateBillingDurationCosts(monthlyPrice, billingCycle) {
  const costs = {
    monthly: {
      price: monthlyPrice,
      months: 1,
      totalCost: monthlyPrice,
      discount: 0,
      savings: 0
    },
    quarterly: {
      price: monthlyPrice * 3,
      months: 3,
      totalCost: monthlyPrice * 3 * 0.95, // 5% discount
      discount: 5,
      savings: monthlyPrice * 3 * 0.05
    },
    yearly: {
      price: monthlyPrice * 12,
      months: 12,
      totalCost: monthlyPrice * 12 * 0.90, // 10% discount
      discount: 10,
      savings: monthlyPrice * 12 * 0.10
    }
  };
  
  return costs[billingCycle] || costs.monthly;
}

/**
 * Test billing duration validation
 */
function validateBillingDurationChange(currentCycle, newCycle, planLimits) {
  const validCycles = ['monthly', 'quarterly', 'yearly'];
  
  if (!validCycles.includes(newCycle)) {
    return {
      valid: false,
      reason: `Invalid billing cycle: ${newCycle}`
    };
  }
  
  if (currentCycle === newCycle) {
    return {
      valid: false,
      reason: 'Cannot change to the same billing cycle'
    };
  }
  
  // Check if plan supports the billing cycle
  if (planLimits && planLimits.supportedBillingCycles) {
    if (!planLimits.supportedBillingCycles.includes(newCycle)) {
      return {
        valid: false,
        reason: `Plan does not support ${newCycle} billing`
      };
    }
  }
  
  return {
    valid: true,
    reason: 'Billing duration change is valid'
  };
}

/**
 * Validate user permissions for plan operations
 */
function validatePlanPermissions(user, operation = 'change') {
  const validRoles = ['ADMIN', 'MERCHANT'];
  
  if (!validRoles.includes(user.role)) {
    return {
      allowed: false,
      reason: `Role ${user.role} is not authorized for plan ${operation}`
    };
  }
  
  return {
    allowed: true,
    reason: `Role ${user.role} is authorized for plan ${operation}`
  };
}

/**
 * Display authentication status
 */
function displayAuthStatus(auth) {
  if (!auth) {
    console.log('❌ No authentication token available');
    return;
  }
  
  console.log(`✅ Authenticated as: ${auth.user.name || auth.user.email}`);
  console.log(`   - Role: ${auth.role}`);
  console.log(`   - Email: ${auth.user.email}`);
  console.log(`   - Merchant ID: ${auth.user.merchantId || 'N/A'}`);
  console.log(`   - Outlet ID: ${auth.user.outletId || 'N/A'}`);
}

/**
 * Calculate exact dates for billing duration
 */
function calculateBillingDates(startDate, billingCycle, period = 1) {
  const start = new Date(startDate);
  const startOfDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  
  let endDate;
  
  switch (billingCycle) {
    case 'monthly':
      endDate = new Date(startOfDay);
      endDate.setMonth(endDate.getMonth() + period);
      endDate.setDate(endDate.getDate() - 1); // Last day of previous month
      endDate.setHours(23, 59, 59, 999); // End of day
      break;
      
    case 'quarterly':
      endDate = new Date(startOfDay);
      endDate.setMonth(endDate.getMonth() + (period * 3));
      endDate.setDate(endDate.getDate() - 1); // Last day of previous month
      endDate.setHours(23, 59, 59, 999); // End of day
      break;
      
    case 'yearly':
      endDate = new Date(startOfDay);
      endDate.setFullYear(endDate.getFullYear() + period);
      endDate.setDate(endDate.getDate() - 1); // Last day of previous month
      endDate.setHours(23, 59, 59, 999); // End of day
      break;
      
    default:
      throw new Error(`Invalid billing cycle: ${billingCycle}`);
  }
  
  return {
    startDate: startOfDay.toISOString(),
    endDate: endDate.toISOString(),
    startDateFormatted: startOfDay.toISOString().split('T')[0] + 'T00:00:00Z',
    endDateFormatted: endDate.toISOString().split('T')[0] + 'T23:59:59Z'
  };
}

/**
 * Validate exact date matches
 */
function validateExactDates(actualDate, expectedDate, tolerance = 1000) {
  const actual = new Date(actualDate);
  const expected = new Date(expectedDate);
  const diff = Math.abs(actual.getTime() - expected.getTime());
  
  return {
    valid: diff <= tolerance,
    actual: actual.toISOString(),
    expected: expected.toISOString(),
    difference: diff,
    tolerance: tolerance
  };
}

/**
 * Test plan change with specific dates
 */
async function testPlanChangeWithDates(merchantId, planId, startDate, endDate, billingCycle, authToken) {
  try {
    const API_BASE = 'http://localhost:3002';
    
    const response = await fetch(`${API_BASE}/api/merchants/${merchantId}/plan`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        planId: planId,
        effectiveDate: startDate,
        endDate: endDate,
        billingCycle: billingCycle,
        reason: 'Test plan change with specific dates'
      })
    });
    
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data: data,
      error: response.ok ? null : data.message || 'Unknown error'
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      data: null,
      error: error.message
    };
  }
}

/**
 * Calculate proration for plan changes and extensions
 */
function calculateProration(currentPlan, newPlan, currentStartDate, currentEndDate, changeDate, billingCycle = 'monthly') {
  const start = new Date(currentStartDate);
  const end = new Date(currentEndDate);
  const change = new Date(changeDate);
  
  // Calculate total period in milliseconds
  const totalPeriod = end.getTime() - start.getTime();
  
  // Calculate remaining period in milliseconds
  const remainingPeriod = end.getTime() - change.getTime();
  
  // Calculate proration ratio (0 to 1)
  const prorationRatio = Math.max(0, Math.min(1, remainingPeriod / totalPeriod));
  
  // Calculate daily rates
  const currentDailyRate = currentPlan.basePrice / getDaysInBillingCycle(billingCycle);
  const newDailyRate = newPlan.basePrice / getDaysInBillingCycle(billingCycle);
  
  // Calculate proration amounts
  const remainingDays = Math.ceil(remainingPeriod / (1000 * 60 * 60 * 24));
  const currentPlanCredit = currentPlan.basePrice * prorationRatio;
  const newPlanCharge = newPlan.basePrice * prorationRatio;
  
  // Calculate net proration (positive = charge, negative = credit)
  const netProration = newPlanCharge - currentPlanCredit;
  
  return {
    prorationRatio: Math.round(prorationRatio * 100) / 100, // Round to 2 decimal places
    remainingDays: remainingDays,
    currentPlanCredit: Math.round(currentPlanCredit * 100) / 100,
    newPlanCharge: Math.round(newPlanCharge * 100) / 100,
    netProration: Math.round(netProration * 100) / 100,
    isUpgrade: newPlan.basePrice > currentPlan.basePrice,
    isDowngrade: newPlan.basePrice < currentPlan.basePrice,
    dailyRates: {
      current: Math.round(currentDailyRate * 100) / 100,
      new: Math.round(newDailyRate * 100) / 100
    }
  };
}

/**
 * Get days in billing cycle
 */
function getDaysInBillingCycle(billingCycle) {
  switch (billingCycle) {
    case 'monthly':
      return 30; // Average month
    case 'quarterly':
      return 90; // 3 months
    case 'yearly':
      return 365; // 1 year
    default:
      return 30;
  }
}

/**
 * Calculate proration for subscription extensions
 */
function calculateExtensionProration(currentPlan, extensionPeriod, currentEndDate, extensionStartDate, billingCycle = 'monthly') {
  const end = new Date(currentEndDate);
  const extensionStart = new Date(extensionStartDate);
  
  // Calculate extension period in days
  const extensionDays = extensionPeriod * getDaysInBillingCycle(billingCycle);
  const extensionEnd = new Date(extensionStart.getTime() + (extensionDays * 24 * 60 * 60 * 1000));
  
  // Calculate daily rate
  const dailyRate = currentPlan.basePrice / getDaysInBillingCycle(billingCycle);
  
  // Calculate extension cost
  const extensionCost = dailyRate * extensionDays;
  
  // Calculate any gap between current end and extension start
  const gapDays = Math.max(0, (extensionStart.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    extensionDays: extensionDays,
    extensionCost: Math.round(extensionCost * 100) / 100,
    dailyRate: Math.round(dailyRate * 100) / 100,
    gapDays: Math.round(gapDays),
    extensionStart: extensionStart.toISOString(),
    extensionEnd: extensionEnd.toISOString(),
    totalCost: Math.round(extensionCost * 100) / 100
  };
}

/**
 * Test proration calculations
 */
async function testProrationCalculations(merchantId, authToken) {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Get merchant with current plan and subscription
    const merchant = await prisma.merchant.findUnique({
      where: { publicId: merchantId },
      include: {
        plan: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    
    if (!merchant || !merchant.plan || !merchant.subscriptions[0]) {
      throw new Error('Merchant not found or no active subscription');
    }
    
    // Get available plans for testing
    const plans = await prisma.plan.findMany({
      where: { isActive: true, id: { not: merchant.plan.id } },
      orderBy: { basePrice: 'asc' }
    });
    
    if (plans.length === 0) {
      throw new Error('No other plans available for testing');
    }
    
    const currentPlan = merchant.plan;
    const currentSubscription = merchant.subscriptions[0];
    const currentStartDate = currentSubscription.currentPeriodStart;
    const currentEndDate = currentSubscription.currentPeriodEnd;
    
    // Test mid-cycle change (50% remaining)
    const midCycleDate = new Date(currentStartDate.getTime() + (currentEndDate.getTime() - currentStartDate.getTime()) / 2);
    
    const results = {
      merchant: {
        id: merchant.publicId,
        name: merchant.name,
        currentPlan: currentPlan.name,
        currentPrice: currentPlan.basePrice
      },
      currentSubscription: {
        startDate: currentStartDate.toISOString(),
        endDate: currentEndDate.toISOString(),
        totalDays: Math.ceil((currentEndDate.getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24))
      },
      prorationTests: []
    };
    
    // Test proration for each available plan
    for (const newPlan of plans) {
      const proration = calculateProration(
        currentPlan,
        newPlan,
        currentStartDate,
        currentEndDate,
        midCycleDate,
        'monthly'
      );
      
      results.prorationTests.push({
        newPlan: {
          id: newPlan.publicId,
          name: newPlan.name,
          price: newPlan.basePrice
        },
        proration: proration,
        testDate: midCycleDate.toISOString()
      });
    }
    
    // Test extension proration
    const extensionProration = calculateExtensionProration(
      currentPlan,
      1, // 1 month extension
      currentEndDate,
      currentEndDate, // Start immediately after current end
      'monthly'
    );
    
    results.extensionProration = extensionProration;
    
    await prisma.$disconnect();
    return results;
    
  } catch (error) {
    throw error;
  }
}

/**
 * Test subscription extension with specific dates
 */
async function testSubscriptionExtensionWithDates(merchantId, extensionPeriod, startDate, endDate, billingCycle, authToken) {
  try {
    const API_BASE = 'http://localhost:3002';
    
    const response = await fetch(`${API_BASE}/api/subscriptions/extend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        merchantId: merchantId,
        extensionPeriod: extensionPeriod,
        startDate: startDate,
        endDate: endDate,
        billingCycle: billingCycle,
        reason: 'Test subscription extension with specific dates'
      })
    });
    
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data: data,
      error: response.ok ? null : data.message || 'Unknown error'
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      data: null,
      error: error.message
    };
  }
}

/**
 * Validate merchant detail updates after plan change or subscription extension
 */
async function validateMerchantDetailUpdates(merchantId, expectedUpdates) {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Get merchant with full details
    const merchant = await prisma.merchant.findUnique({
      where: { publicId: merchantId },
      include: {
        plan: {
          select: {
            id: true,
            publicId: true,
            name: true,
            basePrice: true,
            currency: true,
            maxOutlets: true,
            maxUsers: true,
            maxProducts: true,
            maxCustomers: true,
            features: true,
            isActive: true
          }
        },
        subscriptions: {
          where: { 
            OR: [
              { status: { in: ['ACTIVE', 'TRIAL'] } },
              { status: { in: ['active', 'trial'] } }
            ]
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            publicId: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            amount: true,
            currency: true,
            interval: true,
            intervalCount: true,
            period: true,
            discount: true,
            savings: true,
            updatedAt: true
          }
        }
      }
    });
    
    if (!merchant) {
      return {
        success: false,
        error: 'Merchant not found'
      };
    }
    
    const activeSubscription = merchant.subscriptions[0];
    const validationResults = [];
    
    // Validate plan ID update
    if (expectedUpdates.planId) {
      const planIdMatch = merchant.planId === expectedUpdates.planId;
      validationResults.push({
        field: 'planId',
        expected: expectedUpdates.planId,
        actual: merchant.planId,
        valid: planIdMatch,
        message: planIdMatch ? 'Plan ID updated correctly' : 'Plan ID mismatch'
      });
    }
    
    // Validate subscription status
    if (expectedUpdates.subscriptionStatus) {
      const statusMatch = merchant.subscriptionStatus === expectedUpdates.subscriptionStatus;
      validationResults.push({
        field: 'subscriptionStatus',
        expected: expectedUpdates.subscriptionStatus,
        actual: merchant.subscriptionStatus,
        valid: statusMatch,
        message: statusMatch ? 'Subscription status updated correctly' : 'Subscription status mismatch'
      });
    }
    
    // Validate plan details consistency
    if (expectedUpdates.planDetails && merchant.plan) {
      const planDetailsMatch = 
        merchant.plan.publicId === expectedUpdates.planDetails.publicId &&
        merchant.plan.name === expectedUpdates.planDetails.name &&
        merchant.plan.basePrice === expectedUpdates.planDetails.basePrice;
      
      validationResults.push({
        field: 'planDetails',
        expected: expectedUpdates.planDetails,
        actual: {
          publicId: merchant.plan.publicId,
          name: merchant.plan.name,
          basePrice: merchant.plan.basePrice
        },
        valid: planDetailsMatch,
        message: planDetailsMatch ? 'Plan details match subscription' : 'Plan details mismatch'
      });
    }
    
    // Validate subscription dates
    if (expectedUpdates.subscriptionDates && activeSubscription) {
      const startDateMatch = activeSubscription.currentPeriodStart?.toISOString() === expectedUpdates.subscriptionDates.startDate;
      const endDateMatch = activeSubscription.currentPeriodEnd?.toISOString() === expectedUpdates.subscriptionDates.endDate;
      
      validationResults.push({
        field: 'subscriptionDates',
        expected: expectedUpdates.subscriptionDates,
        actual: {
          startDate: activeSubscription.currentPeriodStart?.toISOString(),
          endDate: activeSubscription.currentPeriodEnd?.toISOString()
        },
        valid: startDateMatch && endDateMatch,
        message: (startDateMatch && endDateMatch) ? 'Subscription dates match' : 'Subscription dates mismatch'
      });
    }
    
    // Validate billing cycle
    if (expectedUpdates.billingCycle && activeSubscription) {
      const intervalMatch = activeSubscription.interval === expectedUpdates.billingCycle.interval;
      const intervalCountMatch = activeSubscription.intervalCount === expectedUpdates.billingCycle.intervalCount;
      
      validationResults.push({
        field: 'billingCycle',
        expected: expectedUpdates.billingCycle,
        actual: {
          interval: activeSubscription.interval,
          intervalCount: activeSubscription.intervalCount
        },
        valid: intervalMatch && intervalCountMatch,
        message: (intervalMatch && intervalCountMatch) ? 'Billing cycle updated correctly' : 'Billing cycle mismatch'
      });
    }
    
    // Validate resource limits
    if (expectedUpdates.resourceLimits && merchant.plan) {
      const limitsMatch = 
        merchant.plan.maxOutlets === expectedUpdates.resourceLimits.maxOutlets &&
        merchant.plan.maxUsers === expectedUpdates.resourceLimits.maxUsers &&
        merchant.plan.maxProducts === expectedUpdates.resourceLimits.maxProducts &&
        merchant.plan.maxCustomers === expectedUpdates.resourceLimits.maxCustomers;
      
      validationResults.push({
        field: 'resourceLimits',
        expected: expectedUpdates.resourceLimits,
        actual: {
          maxOutlets: merchant.plan.maxOutlets,
          maxUsers: merchant.plan.maxUsers,
          maxProducts: merchant.plan.maxProducts,
          maxCustomers: merchant.plan.maxCustomers
        },
        valid: limitsMatch,
        message: limitsMatch ? 'Resource limits updated correctly' : 'Resource limits mismatch'
      });
    }
    
    // Validate updatedAt timestamp
    if (expectedUpdates.updatedAt) {
      const merchantUpdatedAt = new Date(merchant.updatedAt);
      const expectedUpdatedAt = new Date(expectedUpdates.updatedAt);
      const timeDiff = Math.abs(merchantUpdatedAt.getTime() - expectedUpdatedAt.getTime());
      const timestampValid = timeDiff < 5000; // Within 5 seconds
      
      validationResults.push({
        field: 'updatedAt',
        expected: expectedUpdatedAt.toISOString(),
        actual: merchantUpdatedAt.toISOString(),
        valid: timestampValid,
        message: timestampValid ? 'UpdatedAt timestamp is recent' : 'UpdatedAt timestamp is too old'
      });
    }
    
    const allValid = validationResults.every(result => result.valid);
    
    await prisma.$disconnect();
    
    return {
      success: allValid,
      merchantId,
      validationResults,
      summary: {
        total: validationResults.length,
        valid: validationResults.filter(r => r.valid).length,
        invalid: validationResults.filter(r => !r.valid).length
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  getAdminToken,
  getMerchantToken,
  getOutletAdminToken,
  testAuthenticatedEndpoint,
  getAvailableMerchants,
  getMerchantDetails,
  testPlanChangeAPI,
  testSubscriptionExtensionAPI,
  testBillingDurationChangeAPI,
  calculateBillingDurationCosts,
  validateBillingDurationChange,
  validatePlanPermissions,
  validateMerchantDetailUpdates,
  calculateBillingDates,
  validateExactDates,
  testPlanChangeWithDates,
  testSubscriptionExtensionWithDates,
  calculateProration,
  calculateExtensionProration,
  testProrationCalculations,
  getDaysInBillingCycle,
  displayAuthStatus
};
