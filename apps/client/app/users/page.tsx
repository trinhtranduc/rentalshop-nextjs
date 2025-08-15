'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Users,
  UsersLoading,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent
} from '@rentalshop/ui';
import { useAuth } from '../../hooks/useAuth';

// Import types from the Users feature
import type { UserData, UserFilters as UserFiltersType, UserCreateInput, UserUpdateInput, User } from '@rentalshop/ui';

// Import the users API client
import { usersApi } from '../../lib/api/users';

export default function UsersPage() {
  const { user, logout } = useAuth();
  
  // State for users and UI
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  
  // Initialize filters
  const [filters, setFilters] = useState<UserFiltersType>({
    search: '',
    role: 'all',
    merchant: 'all'
  });

  // Separate search state to prevent unnecessary re-renders
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const hasInitializedRef = useRef(false);
  
  // Add a refresh timestamp to force re-renders
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());
  
  // Force refresh function
  const forceRefresh = useCallback(() => {
    setRefreshTimestamp(Date.now());
  }, []);

  // Mock data for when API fails - MUST be at top level
  const mockUsers: User[] = [
    {
      id: 'mock-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      role: 'ADMIN',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      merchant: undefined,
      admin: undefined,
      outletStaff: undefined
    },
    {
      id: 'mock-2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+0987654321',
      role: 'MERCHANT',
      isActive: true,
      createdAt: '2024-01-02T00:00:00Z',
      merchant: {
        id: 'merchant-1',
        companyName: 'Test Company'
      },
      admin: undefined,
      outletStaff: undefined
    }
  ];

  // Transform API data to match the modular component's expected format - MUST be at top level
  const transformUsersForComponent = useCallback((apiUsers: any[]) => {
    const transformed = apiUsers.map(user => ({
      id: user.id,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      phone: user.phone,
      role: user.role as 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF',
      isActive: user.isActive,
      createdAt: user.createdAt,
      merchant: user.merchant ? {
        id: user.merchant.id,
        companyName: user.merchant.companyName || user.merchant.name
      } : undefined,
      admin: undefined,
      outletStaff: undefined
    }));
    return transformed;
  }, []);

  // Use mock data if no users loaded from API - MUST be at top level
  const displayUsers = users.length > 0 ? users : mockUsers;
  const displayTotal = totalUsers > 0 ? totalUsers : mockUsers.length;
  const displayPages = totalPages > 0 ? totalPages : 1;
  
  console.log('Display state:', { 
    displayUsers: displayUsers.length, 
    displayTotal, 
    displayPages, 
    currentPage,
    users: users.length,
    totalUsers,
    totalPages
  });

  // Transform data for the modular Users component - memoized to prevent unnecessary re-renders - MUST be at top level
  const userData: UserData = useMemo(() => {
    const transformedUsers = transformUsersForComponent(displayUsers);
    console.log('Transformed users for component:', transformedUsers);
    console.log('Pagination state:', { currentPage, totalPages: displayPages, total: displayTotal, hasMore: currentPage < displayPages });
    console.log('UserData being sent to component:', {
      usersCount: transformedUsers.length,
      total: displayTotal,
      currentPage,
      totalPages: displayPages,
      hasMore: currentPage < displayPages
    });
    return {
      users: transformedUsers,
      total: displayTotal,
      currentPage,
      totalPages: displayPages,
      hasMore: currentPage < displayPages
    };
  }, [displayUsers, displayTotal, currentPage, displayPages, transformUsersForComponent]);

  const fetchUsers = useCallback(async (pageOverride?: number) => {
    const pageToFetch = pageOverride !== undefined ? pageOverride : currentPage;
    
    try {
      console.log('Fetching users with params:', { pageToFetch, currentPage, searchQuery, role: filters.role });
      console.log('Current state before fetch:', { users: users.length, totalPages, totalUsers });
      
      // Show appropriate loading state
      if (searchQuery !== undefined && hasInitializedRef.current) {
        setIsSearching(true); // Table-only loading for search operations
      } else if (!isInitialLoad) {
        setLoading(true); // Full page loading for other operations
      }
      
      // Use the new users API client
      const response = await usersApi.getUsers({
        search: searchQuery || undefined,
        role: filters.role !== 'all' ? filters.role : undefined,
        page: pageToFetch,
        limit: 20
      });

      console.log('API response:', response);

      if (response.success && response.data) {
        const { users: newUsers, total, totalPages } = response.data;
        console.log('Setting users:', { usersCount: newUsers.length, total, totalPages });
        console.log('Users data:', newUsers);
        
        setUsers(newUsers);
        setTotalPages(totalPages);
        setTotalUsers(total);
        
        console.log('State updated:', { usersCount: newUsers.length, total, totalPages });
        
        // If current page is beyond total pages after search, reset to page 1
        if (pageToFetch > totalPages && totalPages > 0) {
          console.log('Current page beyond total pages, resetting to page 1');
          setCurrentPage(1);
        }
      } else {
        console.error('Failed to fetch users:', response.error);
        // Fallback to mock data if API fails
        setUsers(mockUsers);
        setTotalPages(1);
        setTotalUsers(mockUsers.length);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      // Fallback to mock data if API fails
      setUsers(mockUsers);
      setTotalPages(1);
      setTotalUsers(mockUsers.length);
    } finally {
      setLoading(false);
      setIsSearching(false);
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  }, [currentPage, searchQuery, filters.role, mockUsers, isInitialLoad]);

  // Effect for initial load - only runs once
  useEffect(() => {
    fetchUsers();
    // Mark as initialized after first load
    hasInitializedRef.current = true;
  }, []); // Remove fetchUsers dependency

  // Effect for all data changes - intelligently handles search vs. other operations
  useEffect(() => {
    if (hasInitializedRef.current) {
      console.log('Effect triggered - fetching users:', { searchQuery, currentPage, filters: filters.role });
      fetchUsers();
    }
  }, [searchQuery, currentPage, filters.role]); // Remove fetchUsers dependency

  // Separate handler for search changes - only updates search state
  const handleSearchChange = useCallback((searchValue: string) => {
    setSearchQuery(searchValue);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  // Handler for other filter changes - only reloads table data
  const handleFiltersChange = useCallback((newFilters: UserFiltersType) => {
    // Check if the filters actually changed to prevent unnecessary updates
    const hasChanged = Object.keys(newFilters).some(key => 
      newFilters[key as keyof UserFiltersType] !== filters[key as keyof UserFiltersType]
    );
    
    if (hasChanged) {
      setFilters(newFilters);
      setCurrentPage(1); // Reset to first page when filters change
    }
  }, [filters]);

  // Handler for clearing all filters - only reloads table data
  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      role: 'all',
      merchant: 'all'
    });
    setSearchQuery(''); // This will trigger the search effect to reload table
    setCurrentPage(1);
    // Don't call fetchUsers directly - let the search effect handle it
  }, []);

  const handleViewModeChange = useCallback((mode: 'grid' | 'table') => {
    setViewMode(mode);
  }, []);

  // API Integration Functions
  const handleUserCreated = useCallback(async (userData: UserCreateInput | UserUpdateInput) => {
    try {
      setLoading(true);
      console.log('🔄 Creating user with data:', userData);
      
      // Check if this is a create or update operation
      if ('password' in userData) {
        // This is a create operation with automatic refresh
        console.log('📡 Calling createUserAndRefresh...');
        const result = await usersApi.createUserAndRefresh(userData as UserCreateInput, {
          page: 1,
          limit: 20
        });
        
        console.log('✅ User created successfully:', result.created);
        console.log('🔄 User list refreshed automatically');
        
        // Transform the refreshed data to match UI component expectations
        const transformedUsers = transformUsersForComponent(result.refreshed.users);
        console.log('✅ Transformed users:', transformedUsers);
        
        // Update local state with transformed data
        setUsers(transformedUsers);
        setTotalUsers(result.refreshed.total);
        setTotalPages(result.refreshed.totalPages);
        setCurrentPage(1);
        
        // Force a refresh to ensure UI updates
        forceRefresh();
        
        // Show success message
        console.log('✅ User creation completed successfully');
      } else {
        // This is an update operation - should not happen here, but handle gracefully
        console.warn('⚠️ Update operation received in create handler');
        throw new Error('Invalid operation: Update received in create handler');
      }
    } catch (error) {
      console.error('❌ Error creating user:', error);
      
      // Show error message to user
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
      console.error('User creation failed:', errorMessage);
      
      // Re-throw to let the form handle the error
      throw error;
    } finally {
      setLoading(false);
    }
  }, [forceRefresh, transformUsersForComponent]);

  const handleUserUpdated = useCallback(async (userData: User) => {
    try {
      setLoading(true);
      console.log('🔄 Starting user update process...');
      console.log('📝 Update data:', userData);
      
      // Update user with automatic refresh
      console.log('📡 Calling updateUserAndRefresh...');
      const result = await usersApi.updateUserAndRefresh(userData.id, userData, {
        page: currentPage,
        limit: 20
      });
      
      console.log('✅ User updated successfully:', result.updated);
      console.log('🔄 Refresh result:', result.refreshed);
      console.log('📊 Refreshed users count:', result.refreshed.users?.length);
      
      // Transform the refreshed data to match UI component expectations
      console.log('🔄 Transforming refreshed data...');
      const transformedUsers = transformUsersForComponent(result.refreshed.users);
      console.log('✅ Transformed users:', transformedUsers);
      console.log('📊 Transformed users count:', transformedUsers.length);
      
      // Update local state with transformed data
      console.log('🔄 Updating local state...');
      setUsers(transformedUsers);
      setTotalUsers(result.refreshed.total);
      setTotalPages(result.refreshed.totalPages);
      
      console.log('✅ State updated successfully');
      console.log('📊 New state:', {
        usersCount: transformedUsers.length,
        totalUsers: result.refreshed.total,
        totalPages: result.refreshed.totalPages
      });
      
      // Force a refresh to ensure UI updates
      forceRefresh();
      console.log('🔄 Force refresh triggered');
      
      // Fallback: If the transformed data looks wrong, try a manual refresh
      if (transformedUsers.length === 0 || !transformedUsers.some(u => u.id === userData.id)) {
        console.log('⚠️ Transformed data looks incomplete, attempting manual refresh...');
        try {
          const manualRefresh = await usersApi.getUsers({
            page: currentPage,
            limit: 20
          });
          
          if (manualRefresh.success && manualRefresh.data) {
            const manualTransformed = transformUsersForComponent(manualRefresh.data.users);
            console.log('✅ Manual refresh successful:', manualTransformed);
            setUsers(manualTransformed);
            setTotalUsers(manualRefresh.data.total);
            setTotalPages(manualRefresh.data.totalPages);
          }
        } catch (manualError) {
          console.error('❌ Manual refresh failed:', manualError);
        }
      }
      
    } catch (error) {
      console.error('❌ Error updating user:', error);
      
      // Show error message to user
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
      console.error('User update failed:', errorMessage);
      
      // Fallback: Try to refresh the list manually on error
      console.log('🔄 Attempting manual refresh after error...');
      try {
        const manualRefresh = await usersApi.getUsers({
          page: currentPage,
          limit: 20
        });
        
        if (manualRefresh.success && manualRefresh.data) {
          const manualTransformed = transformUsersForComponent(manualRefresh.data.users);
          console.log('✅ Manual refresh successful after error:', manualTransformed);
          setUsers(manualTransformed);
          setTotalUsers(manualRefresh.data.total);
          setTotalPages(manualRefresh.data.totalPages);
        }
      } catch (manualError) {
        console.error('❌ Manual refresh failed after error:', manualError);
      }
      
      // Re-throw to let the form handle the error
      throw error;
    } finally {
      setLoading(false);
      console.log('🏁 Update process completed');
    }
  }, [currentPage, forceRefresh, transformUsersForComponent]);

  const handleError = useCallback((error: string) => {
    console.error('User operation error:', error);
  }, []);

  const handleUserAction = useCallback(async (action: string, userId: string) => {
    try {
      switch (action) {
        case 'view':
          console.log('View user:', userId);
          break;
        case 'edit':
          console.log('Edit user:', userId);
          // Edit operation is handled by handleUserUpdated from UserFormDialog
          // No need to reload here as the dialog handles the update
          break;
        case 'delete':
          console.log('Delete user:', userId);
          break;
        case 'activate':
          const activateResponse = await usersApi.activateUserAndRefresh(userId, {
            page: currentPage,
            limit: 20
          });
          if (activateResponse.activated) {
            console.log('✅ User activated successfully, refreshing user list...');
            // Update local state with refreshed data
            const transformedUsers = transformUsersForComponent(activateResponse.refreshed.users);
            setUsers(transformedUsers);
            setTotalUsers(activateResponse.refreshed.total);
            setTotalPages(activateResponse.refreshed.totalPages);
            // Force a refresh to ensure UI updates
            forceRefresh();
            console.log('✅ User activated successfully');
          } else {
            console.error('❌ Failed to activate user');
          }
          break;
        case 'deactivate':
          const deactivateResponse = await usersApi.deactivateUserAndRefresh(userId, {
            page: currentPage,
            limit: 20
          });
          if (deactivateResponse.deactivated) {
            console.log('✅ User deactivated successfully, refreshing user list...');
            // Update local state with refreshed data
            const transformedUsers = transformUsersForComponent(deactivateResponse.refreshed.users);
            setUsers(transformedUsers);
            setTotalUsers(deactivateResponse.refreshed.total);
            setTotalPages(deactivateResponse.refreshed.totalPages);
            // Force a refresh to ensure UI updates
            forceRefresh();
            console.log('✅ User deactivated successfully');
          } else {
            console.error('❌ Failed to deactivate user');
          }
          break;
        case 'add':
          console.log('Add new user');
          // Add operation is handled by handleUserCreated, no need to reload here
          break;
        case 'edit':
          console.log('Edit user:', userId);
          // Edit operation is handled by handleUserUpdated, no need to reload here
          break;

        default:
          console.log('Unknown action:', action, userId);
      }
    } catch (error) {
      console.error('Error performing user action:', error);
    }
  }, [currentPage, forceRefresh, transformUsersForComponent]);

  const handlePageChange = useCallback((page: number) => {
    console.log('Page change requested:', { from: currentPage, to: page });
    setCurrentPage(page);
  }, [currentPage]);

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>User Management</PageTitle>
        </PageHeader>
        <PageContent>
          <UsersLoading />
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>User Management</PageTitle>
            <p className="text-gray-600">Manage users in the system</p>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        <Users
          data={userData}
          filters={filters}
          viewMode={viewMode}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onViewModeChange={handleViewModeChange}
          onUserAction={handleUserAction}
          onPageChange={handlePageChange}
          onUserCreated={handleUserCreated}
          onUserUpdated={handleUserUpdated}
          onError={handleError}
        />
      </PageContent>
    </PageWrapper>
  );
} 