'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { merchantsApi } from '@rentalshop/utils';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  Users,
  Breadcrumb,
  type BreadcrumbItem,
  AddUserDialog,
  Button,
  useToast
} from '@rentalshop/ui';
import { Users as UsersIcon, Plus } from 'lucide-react';
import { useAuth } from '@rentalshop/hooks';
import type { User, UserFilters, UserCreateInput } from '@rentalshop/types';

/**
 * ✅ MODERN MERCHANT USERS PAGE (URL State Pattern)
 * 
 * Architecture:
 * ✅ URL params as single source of truth
 * ✅ Shareable URLs (bookmarkable filters)
 * ✅ Browser back/forward support
 */
export default function MerchantUsersPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const merchantId = params.id as string;
  const { user: currentUser } = useAuth();
  const { toastSuccess, toastError } = useToast();
  
  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const search = searchParams.get('q') || '';
  const role = searchParams.get('role') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  
  // ============================================================================
  // LOCAL STATE (API không support full filters yet)
  // ============================================================================
  
  const [users, setUsers] = useState<User[]>([]);
  const [merchantName, setMerchantName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    console.log('👤 Merchant Users Page - useEffect triggered, merchantId:', merchantId);
    fetchData();
  }, [merchantId]);

  const fetchData = async () => {
    try {
      console.log('👤 Merchant Users Page - fetchData started for merchantId:', merchantId);
      setLoading(true);
      
      // Fetch merchant info
      console.log('👤 Fetching merchant info...');
      const merchantData = await merchantsApi.getMerchantById(parseInt(merchantId));
      console.log('👤 Merchant data:', merchantData);
      
      if (merchantData.success && merchantData.data) {
        setMerchantName(merchantData.data.name);
        console.log('👤 Merchant name set:', merchantData.data.name);
      }

      // Fetch users
      console.log('👤 Fetching users for merchant:', merchantId);
      const usersRes = await merchantsApi.users.list(parseInt(merchantId));
      const usersData = await usersRes.json();
      console.log('👤 Users API response:', usersData);
      console.log('👤 Users data structure:', {
        isArray: Array.isArray(usersData.data),
        hasUsersProperty: usersData.data && 'users' in usersData.data
      });

      if (usersData.success) {
        // API returns data as direct array OR data.users
        const usersList = Array.isArray(usersData.data) 
          ? usersData.data 
          : usersData.data?.users || [];
        setUsers(usersList);
        console.log('👤 Users set, count:', usersList.length);
      } else {
        setError(usersData.message || 'Failed to fetch users');
        console.error('👤 Failed to fetch users:', usersData.message);
      }
    } catch (error) {
      console.error('👤 Error fetching data:', error);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
      console.log('👤 fetchData completed');
    }
  };

  // ============================================================================
  // CLIENT-SIDE FILTERING & PAGINATION
  // ============================================================================
  
  const filteredUsers = useMemo(() => {
    let filtered = users;
    
    if (search) {
      filtered = filtered.filter(u => 
        u.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (role && role !== 'all') {
      filtered = filtered.filter(u => u.role === role);
    }
    
    if (status && status !== 'all') {
      filtered = filtered.filter(u => 
        status === 'active' ? u.isActive : !u.isActive
      );
    }
    
    return filtered;
  }, [users, search, role, status]);

  const userData = useMemo(() => {
    console.log('👤 Creating userData:', {
      usersCount: users.length,
      filteredUsersCount: filteredUsers.length,
      page,
      limit,
      search,
      role,
      status
    });
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    const total = filteredUsers.length;
    const totalPages = Math.ceil(total / limit);
    
    const result = {
      users: paginatedUsers,
      total,
      page,
      currentPage: page,
      totalPages,
      limit,
      hasMore: endIndex < total
    };
    
    console.log('👤 userData created:', result);
    
    return result;
  }, [filteredUsers, page, limit, users, search, role, status]);

  // ============================================================================
  // URL UPDATE HELPER
  // ============================================================================
  
  const updateURL = useCallback((updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      // Special handling for page: always set it, even if it's 1
      if (key === 'page') {
        const pageNum = typeof value === 'number' ? value : parseInt(String(value || '0'));
        if (pageNum > 0) {
          params.set(key, pageNum.toString());
        } else {
          params.delete(key);
        }
      } else if (value && value !== '' && value !== 'all') {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });
    
    const newURL = `${pathname}?${params.toString()}`;
    router.push(newURL, { scroll: false });
  }, [pathname, router, searchParams]);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleSearchChange = useCallback((searchValue: string) => {
    updateURL({ q: searchValue, page: 1 });
  }, [updateURL]);

  const handleFiltersChange = useCallback((newFilters: UserFilters) => {
    const updates: Record<string, string | number | undefined> = { page: 1 };
    if ('role' in newFilters) updates.role = newFilters.role;
    if ('status' in newFilters) updates.status = newFilters.status;
    updateURL(updates);
  }, [updateURL]);

  const handleClearFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const handlePageChange = useCallback((newPage: number) => {
    updateURL({ page: newPage });
  }, [updateURL]);

  const handleUserAction = useCallback((action: string, userId: number) => {
    switch (action) {
      case 'view':
        router.push(`/merchants/${merchantId}/users/${userId}`);
        break;
      case 'edit':
        router.push(`/merchants/${merchantId}/users/${userId}/edit`);
        break;
      default:
        console.log('User action:', action, userId);
    }
  }, [router, merchantId]);

  const handleUserCreated = useCallback(async (userData: UserCreateInput) => {
    try {
      const response = await merchantsApi.users.create(parseInt(merchantId), userData);
      const data = await response.json();
      
      if (data.success) {
        toastSuccess('User created successfully');
        setShowAddDialog(false);
        // Refresh users list
        fetchData();
      } else {
        throw new Error(data.message || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toastError('Failed to create user', error instanceof Error ? error.message : 'Unknown error');
      throw error; // Re-throw to let dialog handle it
    }
  }, [merchantId, toastSuccess, toastError]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = useMemo(() => [
    { label: 'Merchants', href: '/merchants' },
    { label: merchantName || `Merchant ${merchantId}`, href: `/merchants/${merchantId}` },
    { label: 'Users', icon: <UsersIcon className="w-4 h-4" /> }
  ], [merchantId, merchantName]);

  if (error) {
    return (
      <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
        <PageHeader className="flex-shrink-0">
          <Breadcrumb items={breadcrumbItems} homeHref="/dashboard" />
        </PageHeader>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium mb-2">Error Loading Users</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const filtersData: UserFilters = { 
    q: search || undefined,
    role: role && role !== 'all' ? role as any : undefined,
    isActive: status && status !== 'all' ? (status === 'active') : undefined
  };

  console.log('👤 About to render Users component with:', {
    userData,
    filtersData,
    loading
  });

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <div className="flex justify-between items-center w-full">
          <Breadcrumb items={breadcrumbItems} homeHref="/dashboard" />
          <Button
            onClick={() => setShowAddDialog(true)}
            variant="default"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </PageHeader>

      <div className="flex-1 min-h-0 overflow-auto">
        <Users
          data={userData}
          filters={filtersData}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onUserAction={handleUserAction}
          onPageChange={handlePageChange}
          onAdd={() => setShowAddDialog(true)}
          showAddButton={true}
          addButtonText="Add User"
          currentUser={currentUser}
        />
      </div>

      {/* Add User Dialog */}
      <AddUserDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        currentUser={currentUser}
        onUserCreated={handleUserCreated}
        onError={(error) => {
          toastError('Error', error instanceof Error ? error.message : String(error));
        }}
      />
    </PageWrapper>
  );
}
