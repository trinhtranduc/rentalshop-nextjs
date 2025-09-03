"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePagination } from './usePagination';
import { usersApi } from '@rentalshop/utils';
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
  const {
    initialLimit = 10,
    useSearchUsers = false,
    enableStats = false
  } = options;

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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

  // Fetch users function
  const fetchUsers = useCallback(async (page: number = pagination.currentPage) => {
    try {
      setLoading(true);
      
      let response;
      
      if (useSearchUsers) {
        // Admin page uses searchUsers with filters
        const filters: UserFiltersType = {
          search: searchTerm || undefined,
          role: roleFilter !== 'all' ? (roleFilter as any) : undefined,
          status: statusFilter !== 'all' ? (statusFilter as 'active' | 'inactive') : undefined,
          page: page,
          limit: pagination.limit
        };
        
        response = await usersApi.searchUsers(filters);
      } else {
        // Client page uses getUsersPaginated
        response = await usersApi.getUsersPaginated(page, pagination.limit);
      }
      
      if (response.success && response.data) {
        // Extract users array and pagination info from the nested response structure
        const usersData = response.data.users || [];
        const total = response.data.total || 0;
        const totalPagesCount = response.data.totalPages || 1;
        
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
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.limit, searchTerm, roleFilter, statusFilter, useSearchUsers, updatePaginationFromResponse]);

  // Initial fetch
  useEffect(() => {
    fetchUsers();
  }, []);

  // Refetch users when filters change (reset to page 1)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handlePageChange(1);
      fetchUsers(1);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, roleFilter, statusFilter, handlePageChange, fetchUsers]);

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
    status: statusFilter === 'all' ? undefined : statusFilter as any,
    page: pagination.currentPage,
    limit: pagination.limit
  }), [searchTerm, roleFilter, statusFilter, pagination.currentPage, pagination.limit]);

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
    setSearchTerm(searchValue);
    handlePageChange(1);
  }, [handlePageChange]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
    handlePageChange(1);
  }, [handlePageChange]);

  const handlePageChangeWithFetch = useCallback((page: number) => {
    handlePageChange(page);
    fetchUsers(page);
  }, [handlePageChange, fetchUsers]);

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
    setSearchTerm,
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
