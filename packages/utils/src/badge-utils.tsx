/**
 * Centralized Badge Utilities
 * 
 * Provides consistent badge generation across all entity types
 * with proper styling and icon handling.
 */

import React from 'react';
import { 
  UserCheck, 
  UserX, 
  CheckCircle, 
  XCircle,
  MapPin,
  Building2,
  Store,
  User as UserIcon,
  Shield,
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShoppingCart
} from 'lucide-react';
import { ENTITY_STATUS, USER_ROLE, getStatusColor, getStatusLabel } from '@rentalshop/constants';

// ============================================================================
// TYPES
// ============================================================================

export interface BadgeConfig {
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}

export interface StatusBadgeProps {
  isActive: boolean;
  entityType?: 'entity' | 'availability';
}

export interface RoleBadgeProps {
  role: string;
}

export interface LocationBadgeProps {
  city?: string;
  state?: string;
}

export interface AvailabilityBadgeProps {
  available: number;
  totalStock: number;
}

// ============================================================================
// STATUS BADGES
// ============================================================================

/**
 * Get status badge configuration for any entity
 */
export const getStatusBadgeConfig = (isActive: boolean, entityType: 'entity' | 'availability' = 'entity'): BadgeConfig => {
  const status = isActive ? ENTITY_STATUS.ACTIVE : ENTITY_STATUS.INACTIVE;
  const colorClass = getStatusColor(status, entityType);
  const label = getStatusLabel(status, entityType);
  
  let Icon: React.ComponentType<{ className?: string }>;
  
  switch (entityType) {
    case 'availability':
      Icon = isActive ? CheckCircle : XCircle;
      break;
    default:
      Icon = isActive ? UserCheck : UserX;
  }
  
  return {
    color: colorClass,
    icon: Icon,
    text: label
  };
};

/**
 * Generate status badge component
 */
export const getStatusBadge = ({ isActive, entityType = 'entity' }: StatusBadgeProps) => {
  const config = getStatusBadgeConfig(isActive, entityType);
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.text}
    </span>
  );
};

// ============================================================================
// ROLE BADGES
// ============================================================================

/**
 * Get role badge configuration
 */
export const getRoleBadgeConfig = (role: string): BadgeConfig => {
  const roleConfig = {
    [USER_ROLE.ADMIN]: { color: 'bg-red-100 text-red-800', icon: Shield, text: 'Admin' },
    [USER_ROLE.MERCHANT]: { color: 'bg-blue-100 text-blue-800', icon: Building2, text: 'Merchant' },
    [USER_ROLE.OUTLET_ADMIN]: { color: 'bg-green-100 text-green-800', icon: Store, text: 'Outlet Admin' },
    [USER_ROLE.OUTLET_STAFF]: { color: 'bg-gray-100 text-gray-800', icon: UserIcon, text: 'Outlet Staff' }
  };
  
  return roleConfig[role as keyof typeof roleConfig] || {
    color: 'bg-gray-100 text-gray-800',
    icon: UserIcon,
    text: role
  };
};

/**
 * Generate role badge component
 */
export const getRoleBadge = ({ role }: RoleBadgeProps) => {
  const config = getRoleBadgeConfig(role);
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.text}
    </span>
  );
};

// ============================================================================
// LOCATION BADGES
// ============================================================================

/**
 * Get location badge configuration
 */
export const getLocationBadgeConfig = (city?: string, state?: string): BadgeConfig | null => {
  if (!city && !state) {
    return null;
  }
  
  const location = [city, state].filter(Boolean).join(', ');
  
  return {
    color: 'bg-blue-100 text-blue-800',
    icon: MapPin,
    text: location
  };
};

/**
 * Generate location badge component
 */
export const getLocationBadge = ({ city, state }: LocationBadgeProps) => {
  const config = getLocationBadgeConfig(city, state);
  
  if (!config) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        <MapPin className="w-3 h-3 mr-1" />
        No location
      </span>
    );
  }
  
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.text}
    </span>
  );
};

// ============================================================================
// AVAILABILITY BADGES
// ============================================================================

/**
 * Get availability badge configuration
 */
export const getAvailabilityBadgeConfig = (available: number, totalStock: number): BadgeConfig => {
  const stockPercentage = totalStock > 0 ? (available / totalStock) * 100 : 0;
  
  if (available === 0) {
    return {
      color: 'bg-red-100 text-red-800',
      icon: XCircle,
      text: 'Out of Stock'
    };
  } else if (stockPercentage < 20) {
    return {
      color: 'bg-orange-100 text-orange-800',
      icon: AlertTriangle,
      text: 'Low Stock'
    };
  } else if (stockPercentage < 50) {
    return {
      color: 'bg-yellow-100 text-yellow-800',
      icon: TrendingDown,
      text: 'Limited'
    };
  } else {
    return {
      color: 'bg-green-100 text-green-800',
      icon: CheckCircle,
      text: 'In Stock'
    };
  }
};

/**
 * Generate availability badge component
 */
export const getAvailabilityBadge = ({ available, totalStock }: AvailabilityBadgeProps) => {
  const config = getAvailabilityBadgeConfig(available, totalStock);
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.text}
    </span>
  );
};

// ============================================================================
// PRICE BADGES
// ============================================================================

/**
 * Get price trend badge configuration
 */
export const getPriceTrendBadgeConfig = (currentPrice: number, previousPrice: number): BadgeConfig => {
  const difference = currentPrice - previousPrice;
  const percentage = previousPrice > 0 ? (difference / previousPrice) * 100 : 0;
  
  if (difference > 0) {
    return {
      color: 'bg-red-100 text-red-800',
      icon: TrendingUp,
      text: `+${percentage.toFixed(1)}%`
    };
  } else if (difference < 0) {
    return {
      color: 'bg-green-100 text-green-800',
      icon: TrendingDown,
      text: `${percentage.toFixed(1)}%`
    };
  } else {
    return {
      color: 'bg-gray-100 text-gray-800',
      icon: DollarSign,
      text: 'No Change'
    };
  }
};

/**
 * Generate price trend badge component
 */
export const getPriceTrendBadge = (currentPrice: number, previousPrice: number) => {
  const config = getPriceTrendBadgeConfig(currentPrice, previousPrice);
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.text}
    </span>
  );
};

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Generate customer status badge (backward compatibility)
 */
export const getCustomerStatusBadge = (isActive: boolean) => 
  getStatusBadge({ isActive, entityType: 'entity' });

/**
 * Generate user status badge (backward compatibility)
 */
export const getUserStatusBadge = (isActive: boolean) => 
  getStatusBadge({ isActive, entityType: 'entity' });

/**
 * Generate product status badge (backward compatibility)
 */
export const getProductStatusBadge = (isActive: boolean) => 
  getStatusBadge({ isActive, entityType: 'availability' });
