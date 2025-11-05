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
        throw new Error('User with this email already exists');
      }

      // Determine registration type based on role and data
      const registrationType = determineRegistrationType(data);

      if (registrationType === 'MERCHANT') {
        // Legacy registerMerchant removed - use registerTenantWithTrial instead
        // This function should not be called directly - use registerTenantWithTrial for tenant registration
        throw new Error('MERCHANT registration is deprecated. Use registerTenantWithTrial for tenant registration instead.');
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
 * LEGACY: Register merchant function removed
 * Use registerTenantWithTrial instead for tenant registration
 * Tenant databases don't have merchant model anymore
 */
// Note: registerMerchant function removed - tenant DBs don't have merchant model
// Use registerTenantWithTrial instead

/**
 * LEGACY: Register merchant with trial plan removed
 * Use registerTenantWithTrial instead
 */
// Note: registerMerchantWithTrial function removed
// Use registerTenantWithTrial instead for tenant registration

/**
 * Register outlet admin/staff
 * Note: Tenant databases don't have merchant model - outlet lookup only
 */
async function registerOutletUser(tx: any, data: RegistrationInput) {
  // Note: merchantCode removed - tenant DBs don't have merchant model
  // Use outletCode instead to find outlet directly
  
  if (!data.outletCode) {
    throw new Error('Outlet code is required for outlet user registration');
  }

  // Find outlet by code (assuming outletCode is the outlet's id)
  const outlet = await tx.outlet.findUnique({
    where: { id: parseInt(data.outletCode) }
  });

  if (!outlet) {
    throw new Error('Invalid outlet code. Please check with your manager.');
  }

  // Create outlet user
  const hashedPassword = await hashPassword(data.password);
  const user = await tx.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      firstName: data.name.split(' ')[0] || '',
      lastName: data.name.split(' ').slice(1).join(' ') || '',
      phone: data.phone,
      role: data.role || 'OUTLET_STAFF',
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

/**
 * Register tenant with trial plan (Multi-tenant version)
 * Creates tenant in Main DB, creates isolated database, and sets up initial user
 */
export async function registerTenantWithTrial(data: {
  businessName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  subdomain?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  taxId?: string;
  businessType?: string;
  website?: string;
  description?: string;
  outletName?: string;
}): Promise<{
  tenant: {
    id: string;
    subdomain: string;
    name: string;
    email: string;
  };
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  outlet: {
    id: number;
    name: string;
  };
  subscription: {
    planName: string;
    trialEnd: Date;
  };
  tenantUrl: string;
}> {
  // Import multi-tenant utilities
  const {
    createTenant,
    subdomainExists,
    tenantEmailExists,
    getDefaultPlan
  } = await import('./main-db');
  const { getTenantDb, createTenantDatabase } = await import('./tenant-db');
  const { 
    sanitizeSubdomain: sanitize, 
    validateSubdomain: validate,
    buildTenantUrl: buildUrl
  } = await import('./subdomain-utils');
  
  // Generate subdomain if not provided
  const subdomain = data.subdomain 
    ? sanitize(data.subdomain) 
    : sanitize(data.businessName);

  // Validate subdomain
  if (!validate(subdomain)) {
    throw new Error('Invalid subdomain format');
  }

  // Check if subdomain or email already exists
  if (await subdomainExists(subdomain)) {
    throw new Error('Subdomain already taken');
  }

  if (await tenantEmailExists(data.email)) {
    throw new Error('Email already registered');
  }

  // Get default plan from Main DB
  const defaultPlan = await getDefaultPlan();
  const planId = defaultPlan?.id || undefined;

  // Calculate trial end date
  const trialDays = defaultPlan?.trialDays || 14;
  const trialStart = new Date();
  const trialEnd = new Date(trialStart.getTime() + (trialDays * 24 * 60 * 60 * 1000));

  // Create tenant database first (this takes time)
  console.log(`Creating database for tenant: ${subdomain}`);
  const databaseUrl = await createTenantDatabase(subdomain);

  // Create tenant in Main DB
  const tenant = await createTenant({
    subdomain,
    name: data.businessName,
    email: data.email,
    phone: data.phone,
    address: data.address,
    city: data.city,
    state: data.state,
    zipCode: data.zipCode,
    country: data.country,
    taxId: data.taxId,
    businessType: data.businessType,
    website: data.website,
    description: data.description,
    databaseUrl,
    status: 'active',
    planId: planId || undefined,
    subscriptionStatus: 'trial',
    trialStart,
    trialEnd
  });

  // Get tenant DB connection
  const tenantDb = await getTenantDb(subdomain);

  // Setup initial data in tenant database
  const result = await tenantDb.$transaction(async (tx: any) => {
    // 1. Get or create trial plan in tenant DB (if needed for reference)
    let trialPlan = await tx.plan.findFirst({
      where: { 
        name: 'Trial',
        isActive: true 
      }
    });

    if (!trialPlan && defaultPlan) {
      trialPlan = await tx.plan.create({
        data: {
          name: defaultPlan.name,
          description: defaultPlan.description,
          basePrice: defaultPlan.basePrice,
          currency: defaultPlan.currency,
          trialDays: defaultPlan.trialDays,
          limits: defaultPlan.limits,
          features: defaultPlan.features,
          isActive: defaultPlan.isActive,
          isPopular: defaultPlan.isPopular,
          sortOrder: defaultPlan.sortOrder
        }
      });
    }

    // 2. Create default outlet
    const outlet = await tx.outlet.create({
      data: {
        name: data.outletName || 'Main Store',
        address: data.address || 'Address to be updated',
        phone: data.phone,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
        description: 'Default outlet created during registration',
        isActive: true,
        isDefault: true
      }
    });

    // 3. Create default category
    const defaultCategory = await tx.category.create({
      data: {
        name: 'General',
        description: 'Default category for general products',
        isActive: true,
        isDefault: false
      }
    });

    // 4. Create tenant owner user (MERCHANT role)
    const hashedPassword = await hashPassword(data.password);
    const user = await tx.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: 'MERCHANT',
        outletId: outlet.id,
        isActive: true,
        emailVerified: false,
        emailVerifiedAt: null
      }
    });

    // 5. Create trial subscription (if plan exists)
    let subscription = null;
    if (trialPlan && trialPlan.id) {
      subscription = await tx.subscription.create({
        data: {
          planId: trialPlan.id,
          status: 'trial',
          currentPeriodStart: trialStart,
          currentPeriodEnd: trialEnd,
          trialStart,
          trialEnd,
          amount: 0,
          currency: trialPlan.currency || 'USD',
          interval: 'month',
          intervalCount: 1,
          period: 1,
          discount: 0,
          savings: 0
        }
      });
    }

    return {
      user,
      outlet,
      subscription,
      plan: trialPlan
    };
  });

  // Build tenant URL
  const tenantUrl = buildUrl(subdomain);

  return {
    tenant: {
      id: tenant.id,
      subdomain: tenant.subdomain,
      name: tenant.name,
      email: tenant.email
    },
    user: {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      role: result.user.role
    },
    outlet: {
      id: result.outlet.id,
      name: result.outlet.name
    },
    subscription: {
      planName: result.plan?.name || 'Trial',
      trialEnd: result.subscription?.trialEnd || trialEnd
    },
    tenantUrl
  };
}
