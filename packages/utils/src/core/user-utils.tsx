import React from 'react';
import type { User } from '@rentalshop/types';
import { getRoleBadge, getStatusBadge } from './badge-utils';

/**
 * Get role badge configuration and component
 * @param role - User role string
 * @returns JSX element for role badge
 */
export const getUserRoleBadge = (role: string) => {
  return getRoleBadge({ role });
};

// getUserStatusBadge is now exported from ./badge-utils.tsx for centralized badge management

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
