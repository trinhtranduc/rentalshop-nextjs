import React from 'react';
import { 
  Shield, 
  Building2, 
  Store, 
  User as UserIcon, 
  CheckCircle, 
  XCircle 
} from 'lucide-react';
import type { User } from '@rentalshop/types';
import { USER_ROLE, ENTITY_STATUS, getStatusColor, getStatusLabel } from '@rentalshop/constants';

/**
 * Get role badge configuration and component
 * @param role - User role string
 * @returns JSX element for role badge
 */
export const getRoleBadge = (role: string) => {
  const roleConfig = {
    [USER_ROLE.ADMIN]: { color: 'bg-red-100 text-red-800', icon: Shield, text: 'Admin' },
    [USER_ROLE.MERCHANT]: { color: 'bg-blue-100 text-blue-800', icon: Building2, text: 'Merchant' },
    [USER_ROLE.OUTLET_ADMIN]: { color: 'bg-green-100 text-green-800', icon: Store, text: 'Outlet Admin' },
    [USER_ROLE.OUTLET_STAFF]: { color: 'bg-gray-100 text-gray-800', icon: UserIcon, text: 'Outlet Staff' }
  };
  
  const config = roleConfig[role as keyof typeof roleConfig];
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.text}
    </span>
  );
};

/**
 * Get status badge configuration and component
 * @param isActive - User active status
 * @returns JSX element for status badge
 */
export const getStatusBadge = (isActive: boolean) => {
  const status = isActive ? ENTITY_STATUS.ACTIVE : ENTITY_STATUS.INACTIVE;
  const colorClass = getStatusColor(status, 'entity');
  const label = getStatusLabel(status, 'entity');
  const Icon = isActive ? CheckCircle : XCircle;
  
  const statusConfig = {
    true: { color: colorClass, icon: CheckCircle, text: label },
    false: { color: colorClass, icon: XCircle, text: label }
  };
  
  const config = statusConfig[isActive.toString() as keyof typeof statusConfig];
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.text}
    </span>
  );
};

/**
 * Calculate user statistics from user array
 * @param users - Array of users
 * @returns Object with calculated statistics
 */
export const calculateUserStats = (users: User[]) => {
  const usersArray = users || [];
  const totalUsers = usersArray.length;
  const activeUsers = usersArray.filter(u => u.isActive).length;
  const inactiveUsers = usersArray.filter(u => !u.isActive).length;
  const verifiedUsers = usersArray.filter(u => u.emailVerified).length;
  const unverifiedUsers = usersArray.filter(u => !u.emailVerified).length;
  
  return { 
    totalUsers, 
    activeUsers, 
    inactiveUsers, 
    verifiedUsers, 
    unverifiedUsers 
  };
};

/**
 * Filter users based on search term, role, and status
 * @param users - Array of users to filter
 * @param searchTerm - Search term for name, email, merchant, outlet
 * @param roleFilter - Role filter ('all' or specific role)
 * @param statusFilter - Status filter ('all', 'ACTIVE', 'INACTIVE')
 * @returns Filtered array of users
 */
export const filterUsers = (
  users: User[], 
  searchTerm: string, 
  roleFilter: string, 
  statusFilter: string
): User[] => {
  return (users || []).filter(user => {
    // Safety check to ensure user object has required properties
    if (!user || typeof user !== 'object') {
      return false;
    }
    
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.merchant?.name && user.merchant.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (user.outlet?.name && user.outlet.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'ACTIVE' && user.isActive) ||
                         (statusFilter === 'INACTIVE' && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });
};

/**
 * Get user's full name
 * @param user - User object
 * @returns Full name string
 */
export const getUserFullName = (user: User): string => {
  return `${user.firstName || ''} ${user.lastName || ''}`.trim();
};

/**
 * Check if user can create other users based on role
 * @param userRole - Current user's role
 * @returns Boolean indicating if user can create other users
 */
export const canCreateUsers = (userRole?: string): boolean => {
  return userRole === 'ADMIN' || 
         userRole === 'MERCHANT' || 
         userRole === 'OUTLET_ADMIN';
};
