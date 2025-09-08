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
  role?: 'CLIENT' | 'SHOP_OWNER' | 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
  // For merchant registration
  businessName?: string;
  outletName?: string;
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
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if user email already exists
      const existingUser = await tx.user.findUnique({
        where: { email: data.email }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
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
    throw new Error('Merchant with this email already exists');
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
    
    // Get next available publicId
    const lastPlan = await tx.plan.findFirst({
      orderBy: { publicId: 'desc' }
    });
    const planPublicId = (lastPlan?.publicId || 0) + 1;
    
    trialPlan = await tx.plan.create({
      data: {
        publicId: planPublicId,
        name: 'Trial',
        description: 'Free trial plan for new merchants to test the platform',
        basePrice: 0, // Free
        currency: 'USD',
        trialDays: 14,
        maxOutlets: 1,
        maxUsers: 2,
        maxProducts: 25,
        maxCustomers: 50,
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

  // 3. Generate merchant publicId
  const lastMerchant = await tx.merchant.findFirst({
    orderBy: { publicId: 'desc' }
  });
  const merchantPublicId = (lastMerchant?.publicId || 0) + 1;

  // 4. Create merchant
  const merchant = await tx.merchant.create({
    data: {
      publicId: merchantPublicId,
      name: data.businessName || `${data.name}'s Business`,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      country: data.country,
      isActive: true,
      subscriptionStatus: 'trial'
    }
  });

  // 5. Create merchant user
  const hashedPassword = await hashPassword(data.password);
  
  const lastUser = await tx.user.findFirst({
    orderBy: { publicId: 'desc' }
  });
  const userPublicId = (lastUser?.publicId || 0) + 1;

  const user = await tx.user.create({
    data: {
      publicId: userPublicId,
      email: data.email,
      password: hashedPassword,
      firstName: data.name.split(' ')[0] || '',
      lastName: data.name.split(' ').slice(1).join(' ') || '',
      phone: data.phone,
      role: 'MERCHANT',
      merchantId: merchant.id,
      isActive: true
    }
  });

  // 6. Create default outlet with merchant information
  const lastOutlet = await tx.outlet.findFirst({
    orderBy: { publicId: 'desc' }
  });
  const outletPublicId = (lastOutlet?.publicId || 0) + 1;

  const outlet = await tx.outlet.create({
    data: {
      publicId: outletPublicId,
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

  // 7. Create trial subscription
  const subscriptionStartDate = new Date();
  const trialEndDate = new Date(subscriptionStartDate.getTime() + (trialPlan.trialDays * 24 * 60 * 60 * 1000));
  
  const lastSubscription = await tx.subscription.findFirst({
    orderBy: { publicId: 'desc' }
  });
  const subscriptionPublicId = (lastSubscription?.publicId || 0) + 1;

  const subscription = await tx.subscription.create({
    data: {
      publicId: subscriptionPublicId,
      merchantId: merchant.id,
      planId: trialPlan.id,
      status: 'trial',
      amount: 0, // Free trial
      currency: 'USD',
      interval: 'month', // Default to monthly for trial
      intervalCount: 1, // 1 month intervals
      currentPeriodStart: subscriptionStartDate,
      currentPeriodEnd: trialEndDate,
      trialStart: subscriptionStartDate,
      trialEnd: trialEndDate,
      cancelAtPeriodEnd: false
    }
  });

  return {
    success: true,
    user: {
      id: user.publicId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      merchant: {
        id: merchant.publicId,
        name: merchant.name
      },
      outlet: {
        id: outlet.publicId,
        name: outlet.name
      }
    },
    token: '', // Will be generated by auth service
    message: 'Merchant account created successfully with default outlet'
  };
}

/**
 * Register outlet admin/staff with merchant/outlet lookup
 */
async function registerOutletUser(tx: any, data: RegistrationInput) {
  if (!data.merchantCode) {
    throw new Error('Merchant code is required for outlet user registration');
  }

  // 1. Find merchant by code (assuming merchantCode is the merchant's publicId)
  const merchant = await tx.merchant.findUnique({
    where: { publicId: parseInt(data.merchantCode) }
  });

  if (!merchant) {
    throw new Error('Invalid merchant code. Please check with your manager.');
  }

  // 2. Find outlet if outletCode provided
  let outlet = null;
  if (data.outletCode) {
    outlet = await tx.outlet.findUnique({
      where: { 
        publicId: parseInt(data.outletCode),
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
      const lastOutlet = await tx.outlet.findFirst({
        orderBy: { publicId: 'desc' }
      });
      const outletPublicId = (lastOutlet?.publicId || 0) + 1;

      outlet = await tx.outlet.create({
        data: {
          publicId: outletPublicId,
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
  
  const lastUser = await tx.user.findFirst({
    orderBy: { publicId: 'desc' }
  });
  const userPublicId = (lastUser?.publicId || 0) + 1;

  const user = await tx.user.create({
    data: {
      publicId: userPublicId,
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
      id: user.publicId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      merchant: {
        id: merchant.publicId,
        name: merchant.name
      },
      outlet: {
        id: outlet.publicId,
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
  
  const lastUser = await tx.user.findFirst({
    orderBy: { publicId: 'desc' }
  });
  const userPublicId = (lastUser?.publicId || 0) + 1;

  const user = await tx.user.create({
    data: {
      publicId: userPublicId,
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
      id: user.publicId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    token: '', // Will be generated by auth service
    message: 'User account created successfully'
  };
}
