// ============================================================================
// BASE COMMON TYPES
// ============================================================================

export interface BaseEntity {
  id: number;        // This represents the publicId from database
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseEntityWithMerchant extends BaseEntity {
  merchantId: number;
}

export interface BaseEntityWithOutlet extends BaseEntityWithMerchant {
  outletId: number;
}

export interface Timestamp {
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDelete {
  deletedAt?: Date;
  isDeleted: boolean;
}

// ============================================================================
// PROFILE TYPES
// ============================================================================

export interface ProfileUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

// ============================================================================
// SHOP TYPES
// ============================================================================

export interface Shop {
  id: number;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  isActive: boolean;
  merchantId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShopCreateInput {
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  merchantId: number;
}

export interface ShopUpdateInput {
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
}
