// ============================================================================
// INVENTORY TYPES
// ============================================================================

export interface InventoryItem {
  productId: string;
  outletId: string;
  stock: number;
  available: number;
  reserved: number;
  minimumStock: number;
  maximumStock: number;
  lastUpdated: Date;
}

export interface InventoryUpdate {
  productId: string;
  outletId: string;
  quantity: number;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  reason: string;
  notes?: string;
}

export interface InventoryAlert {
  productId: string;
  outletId: string;
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK';
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: Date;
}
