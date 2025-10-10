/**
 * Base entity interface with common fields
 * All entities should extend this for consistency
 */
interface BaseEntity {
    id: number;
    createdAt: Date | string;
    updatedAt: Date | string;
}
/**
 * Base entity with merchant relationship
 * Used for entities that belong to a merchant
 */
interface BaseEntityWithMerchant extends BaseEntity {
    merchantId: number;
}
/**
 * Minimal merchant reference
 * Used when only basic merchant info is needed
 */
interface MerchantReference {
    id: number;
    name: string;
    email?: string;
}
/**
 * Minimal outlet reference
 * Used when only basic outlet info is needed
 */
interface OutletReference {
    id: number;
    name: string;
    address?: string;
    merchantId: number;
    merchant?: MerchantReference;
}

type UserRole = 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
/**
 * Main User interface - consolidated from multiple sources
 * Combines auth/user.ts and users/user.ts definitions
 */
interface User extends BaseEntityWithMerchant {
    firstName: string;
    lastName: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    isActive: boolean;
    emailVerified: boolean;
    lastLoginAt?: Date | string;
    outletId?: number;
    merchant?: MerchantReference;
    outlet?: OutletReference;
}
/**
 * Login credentials
 * Used for authentication
 */
interface LoginCredentials {
    email: string;
    password: string;
}

export type { LoginCredentials as L, User as U };
