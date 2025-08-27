// ============================================================================
// INVENTORY TYPES
// ============================================================================

export interface InventoryItem {
  productId: number;
  outletId: number;
  stock: number;
  available: number;
  reserved: number;
  minimumStock: number;
  maximumStock: number;
  lastUpdated: Date;
}

export interface InventoryUpdate {
  productId: number;
  outletId: number;
  quantity: number;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  reason: string;
  notes?: string;
}

export interface InventoryAlert {
  productId: number;
  outletId: number;
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK';
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: Date;
}
