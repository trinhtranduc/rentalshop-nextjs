// ============================================================================
// BASE COMMON TYPES
// ============================================================================

export interface BaseEntity {
  id: number;        // This represents the publicId from database
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseEntityWithMerchant extends BaseEntity {
  merchantId: string;
}

export interface BaseEntityWithOutlet extends BaseEntityWithMerchant {
  outletId: string;
}

export interface Timestamp {
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDelete {
  deletedAt?: Date;
  isDeleted: boolean;
}
