"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePagination } from './usePagination';
import { useThrottledSearch } from './useThrottledSearch';
import { usersApi } from '@rentalshop/utils';
import { PAGINATION } from '@rentalshop/constants';
import type { User, UserFilters as UserFiltersType, UserCreateInput, UserUpdateInput } from '@rentalshop/types';

export interface UseUserManagementOptions {
  initialLimit?: number;
  useSearchUsers?: boolean; // true for admin (searchUsers), false for client (getUsersPaginated)
  enableStats?: boolean; // true for admin, false for client
}

export interface UseUserManagementReturn {
  // State
  users: User[];
  loading: boolean;
  searchTerm: string;
  roleFilter: string;
  statusFilter: string;
  selectedUser: User | null;
  showUserDetail: boolean;
  showCreateForm: boolean;
  showEditDialog: boolean;
  pagination: any;
  
  // Actions
  setSearchTerm: (term: string) => void;
  setRoleFilter: (role: string) => void;
  setStatusFilter: (status: string) => void;
  setSelectedUser: (user: User | null) => void;
  setShowUserDetail: (show: boolean) => void;
  setShowCreateForm: (show: boolean) => void;
  setShowEditDialog: (show: boolean) => void;
  
  // Handlers
  fetchUsers: (page?: number) => Promise<void>;
  handleViewUser: (user: User) => void;
  handleEditUser: (user: User) => void;
  handleToggleStatus: (user: User) => void;
  handleUserUpdated: (updatedUser: User) => void;
  handleUserError: (error: string) => void;
  handleUserRowAction: (action: string, userId: number) => void;
  handleAddUser: () => void;
  handleExportUsers: () => void;
  handleFiltersChange: (newFilters: UserFiltersType) => void;
  handleSearchChange: (searchValue: string) => void;
  handleClearFilters: () => void;
  handlePageChangeWithFetch: (page: number) => void;
  handleUserCreated: (userData: UserCreateInput) => Promise<void>;
  handleUserUpdatedAsync: (userData: UserUpdateInput) => Promise<void>;
  
  // Computed values
  filteredUsers: User[];
  filters: UserFiltersType;
  stats?: any;
}

export const useUserManagement = (options: UseUserManagementOptions = {}): UseUserManagementReturn => {
  console.log('🔍 useUserManagement: Hook called with options:', options);
  const {
    initialLimit = PAGINATION.DEFAULT_PAGE_SIZE,
    useSearchUsers = false,
    enableStats = false
  } = options;

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Pagination state using shared hook
  const { pagination, handlePageChange, updatePaginationFromResponse } = usePagination({
    initialLimit
  });

  // Throttled search for better performance
  const { query: searchTerm, handleSearchChange: throttledSearchChange } = useThrottledSearch({
    delay: 300,
    minLength: 0,
    onSearch: (query: string) => {
      console.log('🔍 useUserManagement: onSearch called with query:', query);
      console.log('🔍 useUserManagement: current filters:', { roleFilter, statusFilter });
      console.log('🔍 useUserManagement: useSearchUsers flag:', useSearchUsers);
      // Trigger search when throttled search completes
      fetchUsers(1, query, roleFilter, statusFilter);
    }
  });

  // Log state changes
  console.log('🔍 useUserManagement: Current state:', { 
    usersCount: users.length, 
    loading, 
    roleFilter, 
    statusFilter,
    searchTerm 
  });

  // Fetch users function - stable reference to prevent multiple calls
  const fetchUsers = useCallback(async (page: number = 1, searchQuery: string = '', role: string = 'all', status: string = 'all') => {
    console.log('🔍 useUserManagement: fetchUsers called with params:', { page, searchQuery, role, status });
    console.log('🔍 useUserManagement: current pagination:', pagination);
    console.log('🔍 useUserManagement: useSearchUsers flag in fetchUsers:', useSearchUsers);
    try {
      setLoading(true);
      console.log('🔍 useUserManagement: setLoading(true) called');
      
      let response;
      
      if (useSearchUsers) {
        // Admin page uses searchUsers with filters
        const filters: UserFiltersType = {
          search: searchQuery || undefined,
          role: role !== 'all' ? (role as any) : undefined,
          status: status !== 'all' ? (status as 'active' | 'inactive') : undefined,
          page: page,
          limit: pagination.limit
        };
        
        console.log('🔍 useUserManagement: Calling searchUsers with filters:', filters);
        console.log('🔍 useUserManagement: searchQuery value:', searchQuery);
        console.log('🔍 useUserManagement: searchQuery type:', typeof searchQuery);
        console.log('🔍 useUserManagement: searchQuery length:', searchQuery?.length);
        response = await usersApi.searchUsers(filters);
      } else {
        // Client page uses getUsersPaginated
        response = await usersApi.getUsersPaginated(page, pagination.limit);
      }
      
      if (response.success && response.data) {
        console.log('🔍 useUserManagement: API response success, data:', response.data);
        // Extract users array and pagination info from the nested response structure
        const usersData = response.data.users || [];
        const total = response.data.total || 0;
        const totalPagesCount = response.data.totalPages || 1;
        
        console.log('🔍 useUserManagement: setting users data:', { usersCount: usersData.length, total, totalPagesCount });
        setUsers(usersData);
        
        // Update pagination state using the hook
        updatePaginationFromResponse({
          total,
          limit: pagination.limit,
          offset: (page - 1) * pagination.limit,
          hasMore: page < totalPagesCount
        });
      } else {
        console.error('API Error:', response.error);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      console.log('🔍 useUserManagement: fetchUsers completed, setLoading(false)');
      setLoading(false);
    }
  }, [pagination.limit, useSearchUsers, updatePaginationFromResponse]);

  // Single effect to handle all data fetching
  useEffect(() => {
    console.log('🔍 useUserManagement: useEffect triggered with dependencies:', { searchTerm, roleFilter, statusFilter });
    const timeoutId = setTimeout(() => {
      console.log('🔍 useUserManagement: useEffect timeout executing fetchUsers');
      // Fetch users with current filters
      fetchUsers(1, searchTerm, roleFilter, statusFilter);
    }, 300); // Debounce search

    return () => {
      console.log('🔍 useUserManagement: useEffect cleanup - clearing timeout');
      clearTimeout(timeoutId);
    };
  }, [searchTerm, roleFilter, statusFilter]);

  // Filter users based on current filters
  const filteredUsers = useMemo(() => {
    if (useSearchUsers) {
      // Admin page: API handles filtering, return all users
      return users;
    } else {
      // Client page: Apply local filtering
      return (users || []).filter(user => {
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
    }
  }, [users, searchTerm, roleFilter, statusFilter, useSearchUsers]);

  // Calculate stats if enabled
  const stats = useMemo(() => {
    if (!enableStats) return undefined;
    
    const usersArray = users || [];
    const totalUsers = usersArray.length;
    const activeUsers = usersArray.filter(u => u.isActive).length;
    const inactiveUsers = usersArray.filter(u => !u.isActive).length;
    const verifiedUsers = usersArray.filter(u => u.emailVerified).length;
    const unverifiedUsers = usersArray.filter(u => !u.emailVerified).length;
    
    return { totalUsers, activeUsers, inactiveUsers, verifiedUsers, unverifiedUsers };
  }, [users, enableStats]);

  // Create filters object for components
  const filters: UserFiltersType = useMemo(() => ({
    search: searchTerm,
    role: roleFilter === 'all' ? undefined : roleFilter as any,
    status: statusFilter === 'all' ? undefined : statusFilter as any
  }), [searchTerm, roleFilter, statusFilter]);

  // Event handlers
  const handleViewUser = useCallback((user: User) => {
    setSelectedUser(user);
    setShowUserDetail(true);
  }, []);

  const handleEditUser = useCallback((user: User) => {
    setSelectedUser(user);
    setShowEditDialog(true);
  }, []);

  const handleToggleStatus = useCallback(async (user: User) => {
    try {
      const response = user.isActive 
        ? await usersApi.deactivateUserByPublicId(user.id)
        : await usersApi.activateUserByPublicId(user.id);
      
      if (response.success) {
        fetchUsers(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  }, [fetchUsers]);

  const handleUserUpdated = useCallback((updatedUser: User) => {
    setShowEditDialog(false);
    setShowUserDetail(false);
    fetchUsers(); // Refresh the list to get the latest data
  }, [fetchUsers]);

  const handleUserError = useCallback((error: string) => {
    console.error('User operation error:', error);
  }, []);

  const handleUserRowAction = useCallback((action: string, userId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    switch (action) {
      case 'view':
        handleViewUser(user);
        break;
      case 'edit':
        handleEditUser(user);
        break;
      case 'activate':
      case 'deactivate':
        handleToggleStatus(user);
        break;
      default:
        console.log('Unknown action:', action);
    }
  }, [users, handleViewUser, handleEditUser, handleToggleStatus]);

  const handleAddUser = useCallback(() => {
    setShowCreateForm(true);
  }, []);

  const handleExportUsers = useCallback(() => {
    // TODO: Implement export functionality
    console.log('Export functionality coming soon!');
  }, []);

  const handleFiltersChange = useCallback((newFilters: UserFiltersType) => {
    setRoleFilter(newFilters.role || 'all');
    setStatusFilter(newFilters.status || 'all');
    handlePageChange(1);
  }, [handlePageChange]);

  const handleSearchChange = useCallback((searchValue: string) => {
    console.log('🔍 useUserManagement: handleSearchChange called with:', searchValue);
    console.log('🔍 useUserManagement: throttledSearchChange function:', typeof throttledSearchChange);
    throttledSearchChange(searchValue);
  }, [throttledSearchChange]);

  const handleClearFilters = useCallback(() => {
    throttledSearchChange('');
    setRoleFilter('all');
    setStatusFilter('all');
    handlePageChange(1);
  }, [throttledSearchChange, handlePageChange]);

  const handlePageChangeWithFetch = useCallback((page: number) => {
    handlePageChange(page);
    fetchUsers(page, searchTerm, roleFilter, statusFilter);
  }, [handlePageChange, fetchUsers, searchTerm, roleFilter, statusFilter]);

  const handleUserCreated = useCallback(async (userData: UserCreateInput) => {
    try {
      const response = await usersApi.createUser(userData);
      if (response.success) {
        setShowCreateForm(false);
        fetchUsers(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      throw error; // Re-throw to let the form handle the error
    }
  }, [fetchUsers]);

  const handleUserUpdatedAsync = useCallback(async (userData: UserUpdateInput) => {
    if (!selectedUser) return;
    
    try {
      const response = await usersApi.updateUserByPublicId(selectedUser.id, userData);
      if (response.success) {
        setShowEditDialog(false);
        fetchUsers(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error; // Re-throw to let the form handle the error
    }
  }, [selectedUser, fetchUsers]);

  return {
    // State
    users,
    loading,
    searchTerm,
    roleFilter,
    statusFilter,
    selectedUser,
    showUserDetail,
    showCreateForm,
    showEditDialog,
    pagination,
    
    // Actions
    setSearchTerm: throttledSearchChange, // Use throttled search for better performance
    setRoleFilter,
    setStatusFilter,
    setSelectedUser,
    setShowUserDetail,
    setShowCreateForm,
    setShowEditDialog,
    
    // Handlers
    fetchUsers,
    handleViewUser,
    handleEditUser,
    handleToggleStatus,
    handleUserUpdated,
    handleUserError,
    handleUserRowAction,
    handleAddUser,
    handleExportUsers,
    handleFiltersChange,
    handleSearchChange,
    handleClearFilters,
    handlePageChangeWithFetch,
    handleUserCreated,
    handleUserUpdatedAsync,
    
    // Computed values
    filteredUsers,
    filters,
    stats
  };
};
