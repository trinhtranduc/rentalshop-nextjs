'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users,
  UsersLoading,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Button
} from '@rentalshop/ui';
import { UserPlus } from 'lucide-react';
import { useAuth } from '@rentalshop/hooks';

// Import types from the types package
import type { UserFilters as UserFiltersType, UserCreateInput, UserUpdateInput, User } from '@rentalshop/types';

// Define UserData interface locally since it's not exported from types
interface UserData {
  users: User[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

// Import the users API client
import { usersApi } from "@rentalshop/utils";

export default function UsersPage() {
  const router = useRouter();
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
    role: undefined,
    merchantId: undefined
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
  const mockUsers: User[] = [];

  // Transform API data to match the modular component's expected format - MUST be at top level
  const transformUsersForComponent = useCallback((apiUsers: any[]) => {
    console.log('🔍 transformUsersForComponent called with:', apiUsers.length, 'users');
    
    const transformed = apiUsers.map(user => {
      // Ensure we have a valid number id (which represents publicId)
      let userId = user.id;
      console.log('🔍 Processing user:', { id: user.id, publicId: user.publicId, idType: typeof userId });
      
      if (!userId || typeof userId !== 'number') {
        console.warn('⚠️ User missing id or invalid type:', { userId: user.id, publicId: user.publicId, type: typeof userId });
        // Don't use user.publicId as fallback since it's not a number
        userId = 0;
      }
      
      const transformedUser: User = {
        id: userId, // Use the validated id (which represents publicId)
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        phone: user.phone,
        role: user.role as 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF',
        isActive: user.isActive,
        createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
        emailVerified: user.emailVerified || false,
        updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
        merchantId: user.merchant?.id,
        outletId: user.outletId,
        lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined,
        
        // Preserve the full merchant and outlet objects for display
        firstName: user.firstName,
        lastName: user.lastName,
        merchant: user.merchant,
        outlet: user.outlet
      };
      
      console.log('🔍 Transformed user:', { id: transformedUser.id, originalPublicId: user.publicId });
      return transformedUser;
    });
    
    // Log the transformation for debugging
    console.log('🔍 Transformation complete:', {
      original: apiUsers[0],
      transformed: transformed[0]
    });
    
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
        role: filters.role,
        page: pageToFetch,
        limit: 20
      });

      console.log('API response:', response);

      if (response.success && response.data) {
        console.log('📊 Raw response data structure:', response.data);
        
        // Handle the standard ApiResponse structure
        // API returns: { success: true, data: { users: [...], total: 8, ... } }
        let users, total, totalPages;
        
        // Check if data has the expected structure
        if (response.data && typeof response.data === 'object' && 'users' in response.data) {
          // Standard structure: response.data.users
          users = (response.data as any).users || [];
          total = (response.data as any).total || users.length;
          totalPages = (response.data as any).totalPages || Math.ceil(total / 10);
          
          console.log('✅ Found standard data structure');
        } else if (response.data && typeof response.data === 'object' && 'data' in response.data) {
          // Nested structure: response.data.data.users
          const nestedData = (response.data as any).data;
          users = nestedData?.users || [];
          total = nestedData?.total || users.length;
          totalPages = nestedData?.totalPages || Math.ceil(total / 10);
          
          console.log('✅ Found nested data structure');
        } else {
          // Fallback: check for any array in the response
          console.warn('⚠️ Unexpected response structure, searching for user data...');
          
          // Try to find users array in any nested object
          const findUsersArray = (obj: any): any[] | null => {
            if (Array.isArray(obj)) {
              // Check if this array contains user-like objects
              if (obj.length > 0 && obj[0]?.firstName && obj[0]?.lastName) {
                return obj;
              }
            } else if (obj && typeof obj === 'object') {
              for (const key in obj) {
                const result = findUsersArray(obj[key]);
                if (result) return result;
              }
            }
            return null;
          };
          
          users = findUsersArray(response.data) || [];
          total = users.length;
          totalPages = Math.ceil(total / 10);
          
          if (users.length > 0) {
            console.log('✅ Found users array in nested structure');
          } else {
            console.error('❌ No users array found in response');
          }
        }
        
        console.log('📊 Processed data:', { 
          users: users?.length || 0, 
          total, 
          totalPages,
          sampleUser: users?.[0] 
        });
        
        // Validate user data structure
        if (users && users.length > 0) {
          const firstUser = users[0];
          console.log('🔍 Sample user structure:', {
            hasId: !!firstUser.id,
            hasFirstName: !!firstUser.firstName,
            hasLastName: !!firstUser.lastName,
            hasEmail: !!firstUser.email,
            hasPhone: !!firstUser.phone,
            hasRole: !!firstUser.role,
            hasMerchant: !!firstUser.merchant,
            keys: Object.keys(firstUser)
          });
        }
        
        // Check if users array is empty and log the full response
        if (!users || users.length === 0) {
          console.warn('⚠️ Users array is empty! Full response data:', response.data);
          console.warn('⚠️ Response data keys:', Object.keys(response.data || {}));
          
          // Try to find any useful information in the response
          if (response.data && typeof response.data === 'object' && 'data' in response.data) {
            const nestedData = (response.data as any).data;
            console.warn('⚠️ Nested data keys:', Object.keys(nestedData || {}));
          }
          
          // Set empty state
          setUsers([]);
          setTotalPages(1);
          setTotalUsers(0);
          return;
        }
        
        setUsers(users);
        setTotalPages(totalPages);
        setTotalUsers(total);
        
        // If current page is beyond total pages after search, reset to page 1
        if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(1);
        }
      } else {
        console.error('❌ API response failed:', response);
        console.error('❌ Response success:', response.success);
        console.error('❌ Response data:', response.data);
        console.error('❌ Response error:', response.error);
        throw new Error(response.error || 'Failed to fetch users');
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
      role: undefined,
      merchantId: undefined
    });
    setSearchQuery(''); // This will trigger the search effect to reload table
    setCurrentPage(1);
    // Don't call fetchUsers directly - let the search effect handle it
  }, []);

  const handleViewModeChange = useCallback((mode: 'grid' | 'table') => {
    setViewMode(mode);
  }, []);

  // API Integration Functions
  const handleUserCreated = useCallback(async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    role: string;
    merchantId?: string;
    outletId?: string;
  }) => {
    try {
      setLoading(true);
      console.log('🔄 Creating user with data:', userData);
      
      // Convert form data to API expected format
      const apiUserData = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        password: userData.password,
        role: userData.role,
        merchantId: userData.merchantId,
        outletId: userData.outletId
      };
      
      console.log('🔄 Converted to API format:', apiUserData);
      
      const result = await usersApi.createUser(apiUserData as any);
        
      if (result.success && result.data) {
        console.log('✅ User created successfully:', result.data);
        console.log('🔍 No data refresh - dialog should stay open');
        
        // Don't refresh data - just let the dialog handle success
        // The user list will be refreshed when the dialog is closed or manually
        console.log('✅ User creation completed successfully (NO RELOAD)');
        
        // CRITICAL: Return success without changing any parent state
        // This prevents the parent from interfering with dialog state
        return;
      } else {
        throw new Error(result.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('❌ Error creating user:', error);
      
      // Show error message to user
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
      console.error('User creation failed:', errorMessage);
      
      // Re-throw to let the form handle the error display
      // The Users component will show the toast
      throw error;
    } finally {
      setLoading(false);
    }
  }, []); // Removed forceRefresh and transformUsersForComponent dependencies

  // Listen for manual refresh requests from the dialog
  useEffect(() => {
    const handleManualRefresh = () => {
      console.log('🔄 Manual refresh requested from dialog');
      // Refresh the user list manually
      fetchUsers();
    };

    window.addEventListener('force-refresh-users', handleManualRefresh);
    return () => window.removeEventListener('force-refresh-users', handleManualRefresh);
  }, [fetchUsers]);

  const handleUserUpdated = useCallback(async (userData: User) => {
    try {
      setLoading(true);
      console.log('🔄 Starting user update process...');
      console.log('📝 Update data:', userData);
      
      // Update user with automatic refresh
      console.log('📡 Calling updateUserAndRefresh...');
      const result = await usersApi.updateUserAndRefresh(userData.id, userData as any, {
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
      
      // TEMPORARILY COMMENTED OUT TO TEST DIALOG BEHAVIOR
      // Force a refresh to ensure UI updates
      // forceRefresh();
      console.log('🔄 Force refresh triggered (COMMENTED OUT)');
      
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
      
      // CRITICAL: Don't refresh on error - let user fix the issue
      console.log('🔍 No refresh on error - user should fix the issue');
      
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
      // Convert userId to number for API calls
      const userIdNumber = parseInt(userId);
      if (isNaN(userIdNumber)) {
        console.error('Invalid user ID:', userId);
        return;
      }

      switch (action) {
        case 'view':
          console.log('View user:', userIdNumber);
          // Navigate to user details page
          window.location.href = `/users/${userIdNumber}`;
          break;
        case 'edit':
          console.log('Edit user:', userIdNumber);
          // Navigate to user page where editing can be done inline
          window.location.href = `/users/${userIdNumber}`;
          break;
        case 'delete':
          try {
            console.log('🗑️ Deleting user:', userIdNumber);
            const deleteResponse = await usersApi.deleteUser(userIdNumber);
            if (deleteResponse.success) {
              console.log('✅ User deleted successfully, refreshing user list...');
              // Refresh the user list manually
              await fetchUsers();
              console.log('✅ User deleted successfully');
            } else {
              console.error('❌ Failed to delete user:', deleteResponse.error);
            }
          } catch (error) {
            console.error('❌ Error deleting user:', error);
          }
          break;
        case 'activate':
          try {
            const activateResponse = await usersApi.activateUser(userIdNumber);
            if (activateResponse.success) {
              console.log('✅ User activated successfully, refreshing user list...');
              // Refresh the user list manually
              await fetchUsers();
              console.log('✅ User activated successfully');
            } else {
              console.error('❌ Failed to activate user:', activateResponse.error);
            }
          } catch (error) {
            console.error('❌ Error activating user:', error);
          }
          break;
        case 'deactivate':
          try {
            const deactivateResponse = await usersApi.deactivateUser(userIdNumber);
            if (deactivateResponse.success) {
              console.log('✅ User deactivated successfully, refreshing user list...');
              // Refresh the user list manually
              await fetchUsers();
              console.log('✅ User deactivated successfully');
            } else {
              console.error('❌ Failed to deactivate user:', deactivateResponse.error);
            }
          } catch (error) {
            console.error('❌ Error deactivating user:', error);
          }
          break;
        case 'add':
          console.log('Add new user');
          // Add operation is handled by handleUserCreated, no need to reload here
          break;
        case 'edit':
          console.log('Edit user:', userIdNumber);
          // Edit operation is handled by handleUserUpdated, no need to reload here
          break;

        default:
          console.log('Unknown action:', action, userIdNumber);
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
          <PageTitle>Users</PageTitle>
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
            <PageTitle>Users</PageTitle>
            <p className="text-gray-600">Manage users in the system</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                // TODO: Implement export functionality
                alert('Export functionality coming soon!');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 rounded-md flex items-center text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export
            </button>
            <Button 
              onClick={() => router.push('/users/add')}
              className="bg-green-600 hover:bg-green-700 text-white h-9 px-4"
            >
              <UserPlus className="w-4 h-4 mr-2" /> Add User
            </Button>
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
          onUserCreated={handleUserCreated as any}
          onUserUpdated={handleUserUpdated}
          onError={handleError}
        />
      </PageContent>
    </PageWrapper>
  );
} 