import type { ProductWithStock } from '@rentalshop/types';

export type AvailabilityDisplayStatus = 'idle' | 'loading' | 'available' | 'unavailable' | 'warning' | 'error';

export interface AvailabilityCheckParams {
  productId?: number;
  pickup?: string;
  returnDate?: string;
  quantity: number;
  outletId?: number;
}

export interface ConflictOrder {
  orderNumber: string;
  customerName?: string;
  pickupDate?: string;
  returnDate?: string;
  pickupDateLocal?: string;
  returnDateLocal?: string;
  quantity: number;
  status?: string;
}

export interface DerivedAvailabilityResult {
  status: AvailabilityDisplayStatus;
  effectivelyAvailable: number;
  totalStock: number;
  totalRenting: number;
  totalConflictsFound: number;
  conflicts: ConflictOrder[];
  raw?: any;
}

export interface SelectedProduct {
  product: ProductWithStock;
  quantity: number;
  result?: DerivedAvailabilityResult | null;
}

export interface ActiveOrder {
  id: number;
  orderNumber: string;
  customerName: string;
  pickupPlanAt: string;
  returnPlanAt: string;
  quantity: number;
  status: string;
  isConflict: boolean;
}

export interface AvailabilityCheckPageProps {
  user?: {
    role?: string;
    outletId?: number;
    merchant?: { id?: number; currency?: string };
    merchantId?: number;
    outlet?: { name?: string };
  } | null;
  outlets: Array<{ id: number; name: string }>;
  currency?: string;
}
