// ============================================================================
// SMART REGISTRATION - HANDLES ALL USER ROLES
// ============================================================================

import { prisma } from './client';
import { createUser } from './user';
import { createSubscription } from './subscription';
import { hashPassword } from '@rentalshop/auth';
import type { UserCreateInput } from '@rentalshop/types';

export interface RegistrationInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
  // For merchant registration
  businessName?: string;
  outletName?: string;
  // Business configuration (locked after registration)
  businessType?: 'GENERAL' | 'VEHICLE' | 'CLOTHING' | 'EQUIPMENT';
  pricingType?: 'FIXED' | 'HOURLY' | 'DAILY';
  // Address fields for merchant registration
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  // For outlet staff/admin registration
  merchantCode?: string;
  outletCode?: string;
}

export interface RegistrationResult {
  success: boolean;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    merchant?: {
      id: number;
      name: string;
    };
    outlet?: {
      id: number;
      name: string;
    };
  };
  token: string;
  message: string;
}

/**
 * Smart registration that handles all user roles
 * Based on role and provided data, creates appropriate account structure
 */
export async function registerUser(
  data: RegistrationInput
): Promise<RegistrationResult> {
  try {
    // Start transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Check if user email already exists
      const existingUser = await tx.user.findUnique({
        where: { email: data.email }
      });

      if (existingUser) {
        const { ApiError, ErrorCode } = await import('@rentalshop/utils');
        throw new ApiError(ErrorCode.EMAIL_EXISTS);
      }

      // Determine registration type based on role and data
      const registrationType = determineRegistrationType(data);

      if (registrationType === 'MERCHANT') {
        return await registerMerchant(tx, data);
      } else if (registrationType === 'OUTLET_ADMIN' || registrationType === 'OUTLET_STAFF') {
        return await registerOutletUser(tx, data);
      } else {
        return await registerBasicUser(tx, data);
      }
    });

    return result;
  } catch (error: any) {
    console.error('Registration error:', error);
    throw new Error(error.message || 'Registration failed');
  }
}

/**
 * Determine registration type based on input data
 */
function determineRegistrationType(data: RegistrationInput): 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF' | 'BASIC' {
  // If role is explicitly set, use it
  if (data.role === 'MERCHANT') {
    return 'MERCHANT';
  }
  if (data.role === 'OUTLET_ADMIN' || data.role === 'OUTLET_STAFF') {
    return data.role;
  }

  // If businessName is provided, assume merchant registration
  if (data.businessName) {
    return 'MERCHANT';
  }

  // If merchantCode is provided, assume outlet user registration
  if (data.merchantCode) {
    return 'OUTLET_STAFF'; // Default to staff, can be upgraded to admin
  }

  // Default to basic user registration
  return 'BASIC';
}

/**
 * Register merchant with auto-created default outlet
 */
async function registerMerchant(tx: any, data: RegistrationInput) {
  // 1. Check if merchant email already exists
  const existingMerchant = await tx.merchant.findUnique({
    where: { email: data.email }
  });

  if (existingMerchant) {
    const { ApiError, ErrorCode } = await import('@rentalshop/utils');
    throw new ApiError(ErrorCode.EMAIL_EXISTS);
  }

  // 2. Get or create trial plan (modern SaaS pattern)
  let trialPlan = await tx.plan.findFirst({
    where: { 
      name: 'Trial',
      isActive: true 
    }
  });

  if (!trialPlan) {
    // Auto-create trial plan if none exists (modern SaaS pattern)
    console.log('Creating trial plan automatically...');
    
    trialPlan = await tx.plan.create({
      data: {
        name: 'Trial',
        description: 'Free trial plan for new merchants to test the platform',
        basePrice: 0, // Free
        currency: 'USD',
        trialDays: 14,
        limits: JSON.stringify({
          outlets: 1,
          users: 2,
          products: 25,
          customers: 50
        }),
        features: JSON.stringify([
          'Basic inventory management',
          'Customer management',
          'Order processing (limited)',
          'Basic reporting',
          'Email support',
          'Mobile app access',
          '14-day free trial'
        ]),
        isActive: true,
        isPopular: false,
        sortOrder: 0 // Show first
      }
    });
    console.log('✅ Trial plan created automatically');
  }

  // 3. Create merchant (let DB autoincrement id)
  const merchant = await tx.merchant.create({
    data: {
      name: data.businessName || `${data.name}'s Business`,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      country: data.country,
      isActive: true
      // subscriptionStatus removed - will be set in subscription.status
    }
  });

  // 4. Create default outlet with merchant information FIRST
  const outlet = await tx.outlet.create({
    data: {
      name: data.outletName || 'Main Store',
      // Always use merchant's information as primary source, with user input as fallback
      address: merchant.address || data.address || 'Address to be updated',
      phone: merchant.phone || data.phone,
      city: merchant.city || data.city,
      state: merchant.state || data.state,
      zipCode: merchant.zipCode || data.zipCode,
      country: merchant.country || data.country,
      description: 'Default outlet created during registration',
      merchantId: merchant.id,
      isActive: true,
      isDefault: true
    }
  });

  // 5. Create default category for merchant
  const defaultCategory = await tx.category.create({
    data: {
      name: 'General',
      description: 'Default category for general products',
      merchantId: merchant.id,
      isActive: true
    }
  });

  // 6. Create merchant user with outlet assignment
  const hashedPassword = await hashPassword(data.password);
  const user = await tx.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      firstName: data.name.split(' ')[0] || '',
      lastName: data.name.split(' ').slice(1).join(' ') || '',
      phone: data.phone,
      role: 'MERCHANT',
      merchantId: merchant.id,
      outletId: outlet.id, // Assign default outlet to merchant user
      isActive: true,
      emailVerified: false, // Email needs to be verified after registration
      emailVerifiedAt: null
    }
  });

  // 7. Create trial subscription
  const subscriptionStartDate = new Date();
  const endDate = new Date(subscriptionStartDate.getTime() + (trialPlan.trialDays * 24 * 60 * 60 * 1000));
  const subscription = await tx.subscription.create({
    data: {
      merchantId: merchant.id,
      planId: trialPlan.id,
      status: 'trial',
      amount: 0, // Free trial
      currency: 'USD',
      interval: 'month', // Default to monthly for trial
      intervalCount: 1, // 1 month intervals
      currentPeriodStart: subscriptionStartDate,
      currentPeriodEnd: endDate,
      trialStart: subscriptionStartDate,
      trialEnd: endDate,
      cancelAtPeriodEnd: false
    }
  });

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      merchant: {
        id: merchant.id,
        name: merchant.name
      },
      outlet: {
        id: outlet.id,
        name: outlet.name
      }
    },
    token: '', // Will be generated by auth service
    message: 'Merchant account created successfully with default outlet'
  };
}

/**
 * Register merchant with trial plan (wrapper function for API)
 */
export async function registerMerchantWithTrial(data: any) {
  // Transform API data to RegistrationInput format
  const registrationData: RegistrationInput = {
    email: data.userEmail,
    password: data.userPassword,
    name: `${data.userFirstName} ${data.userLastName}`,
    phone: data.userPhone,
    role: 'MERCHANT',
    businessName: data.merchantName,
    outletName: data.outletName,
    address: data.outletAddress
  };

  const result = await registerUser(registrationData);
  
  if (!result.success) {
    throw new Error(result.message);
  }

  // Transform result to match expected API format
  return {
    merchant: {
      id: result.user.merchant?.id,
      name: result.user.merchant?.name,
      email: result.user.email
    },
    user: {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      role: result.user.role
    },
    outlet: {
      id: result.user.outlet?.id,
      name: result.user.outlet?.name
    },
    subscription: {
      planName: 'Trial',
      trialEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
    }
  };
}

/**
 * Register outlet admin/staff with merchant/outlet lookup
 */
async function registerOutletUser(tx: any, data: RegistrationInput) {
  if (!data.merchantCode) {
    throw new Error('Merchant code is required for outlet user registration');
  }

  // 1. Find merchant by code (assuming merchantCode is the merchant's id)
  const merchant = await tx.merchant.findUnique({
    where: { id: parseInt(data.merchantCode) }
  });

  if (!merchant) {
    throw new Error('Invalid merchant code. Please check with your manager.');
  }

  // 2. Find outlet if outletCode provided
  let outlet = null;
  if (data.outletCode) {
    outlet = await tx.outlet.findUnique({
      where: { 
        id: parseInt(data.outletCode),
        merchantId: merchant.id 
      }
    });

    if (!outlet) {
      throw new Error('Invalid outlet code. Please check with your manager.');
    }
  } else {
    // Find default outlet for this merchant
    outlet = await tx.outlet.findFirst({
      where: { 
        merchantId: merchant.id,
        isDefault: true 
      }
    });

    if (!outlet) {
      // Create a default outlet if none exists
      outlet = await tx.outlet.create({
        data: {
          name: `${merchant.name} - Main Store`,
          address: merchant.address || 'Address to be updated',
          phone: merchant.phone,
          city: merchant.city,
          state: merchant.state,
          zipCode: merchant.zipCode,
          country: merchant.country,
          description: 'Default outlet for staff',
          merchantId: merchant.id,
          isActive: true,
          isDefault: true
        }
      });
    }
  }

  // 3. Create outlet user
  const hashedPassword = await hashPassword(data.password);
  const user = await tx.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      firstName: data.name.split(' ')[0] || '',
      lastName: data.name.split(' ').slice(1).join(' ') || '',
      phone: data.phone,
      role: data.role || 'OUTLET_STAFF',
      merchantId: merchant.id,
      outletId: outlet.id,
      isActive: true
    }
  });

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      merchant: {
        id: merchant.id,
        name: merchant.name
      },
      outlet: {
        id: outlet.id,
        name: outlet.name
      }
    },
    token: '', // Will be generated by auth service
    message: `${data.role === 'OUTLET_ADMIN' ? 'Outlet admin' : 'Staff'} account created successfully`
  };
}

/**
 * Register basic user (CLIENT, SHOP_OWNER, ADMIN)
 */
async function registerBasicUser(tx: any, data: RegistrationInput) {
  const hashedPassword = await hashPassword(data.password);
  const user = await tx.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      firstName: data.name.split(' ')[0] || '',
      lastName: data.name.split(' ').slice(1).join(' ') || '',
      phone: data.phone,
      role: data.role || 'CLIENT',
      isActive: true
    }
  });

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    token: '', // Will be generated by auth service
    message: 'User account created successfully'
  };
}
