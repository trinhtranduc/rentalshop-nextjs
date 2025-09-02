'use client';

import React, { useState, useEffect } from 'react';
import { 
  PageWrapper,
  PageContent,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  ToastContainer,
  useToasts
} from '@rentalshop/ui';
import { 
  StatsOverview,
  SearchAndFilters,
  StatusBadge,
  ActionButton,
  EmptyState,
  AdminPageHeader,
  UserDetailDialog,
  EditUserForm,
  AddUserForm,
  UserPagination,
  UserRow,
  UserPageHeader,
  UserFilters as UserFiltersComponent,
  UserTable
} from '@rentalshop/ui';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Eye, 
  Shield, 
  User as UserIcon, 
  Building2, 
  Store,
  Mail,
  Phone,
  Calendar,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download
} from 'lucide-react';
import type { User, UserFilters as UserFiltersType } from '@rentalshop/types';
import { usersApi } from '@rentalshop/utils';
import { useAuth } from '@rentalshop/hooks';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pageSize] = useState(10); // Users per page
  
  const { toasts, addToast, removeToast } = useToasts();

  useEffect(() => {
    fetchUsers();
  }, []);

  // Refetch users when filters change (reset to page 1)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when filters change
      fetchUsers(1);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, roleFilter, statusFilter]);

  const fetchUsers = async (page: number = currentPage) => {
    try {
      setLoading(true);
      
      // Build filters based on current search and filter state
      const filters: UserFiltersType = {
        search: searchTerm || undefined,
        role: roleFilter !== 'all' ? (roleFilter as any) : undefined,
        status: statusFilter !== 'all' ? (statusFilter as 'active' | 'inactive') : undefined,
        page: page,
        limit: pageSize
      };
      
      const response = await usersApi.searchUsers(filters);
      
      if (response.success && response.data) {
        console.log('API Response Data:', response.data);
        
        // Extract users array and pagination info from the nested response structure
        const usersData = response.data.users || [];
        const total = response.data.total || 0;
        const totalPagesCount = response.data.totalPages || 1;
        
        console.log('Extracted Users:', usersData);
        console.log('Pagination Info:', { total, totalPages: totalPagesCount, currentPage: page });
        
        setUsers(usersData);
        setTotalUsers(total);
        setTotalPages(totalPagesCount);
        setCurrentPage(page);
      } else {
        console.error('API Error:', response.error);
        setUsers([]); // Set empty array on API error
        setTotalUsers(0);
        setTotalPages(1);
        addToast('error', 'Error', response.error || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]); // Set empty array on network error
      setTotalUsers(0);
      setTotalPages(1);
      addToast('error', 'Error', 'Failed to fetch users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      'ADMIN': { color: 'bg-red-100 text-red-800', icon: Shield, text: 'Admin' },
      'MERCHANT': { color: 'bg-blue-100 text-blue-800', icon: Building2, text: 'Merchant' },
      'OUTLET_ADMIN': { color: 'bg-green-100 text-green-800', icon: Store, text: 'Outlet Admin' },
      'OUTLET_STAFF': { color: 'bg-gray-100 text-gray-800', icon: UserIcon, text: 'Outlet Staff' }
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

  const getStatusBadge = (isActive: boolean) => {
    const statusConfig = {
      true: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Active' },
      false: { color: 'bg-gray-100 text-gray-800', icon: XCircle, text: 'Inactive' }
    };
    
    const config = statusConfig[isActive.toString() as keyof typeof statusConfig];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    );
  };

  const filteredUsers = (users || []).filter(user => {
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

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserDetail(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditDialog(true);
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const response = user.isActive 
        ? await usersApi.deactivateUserByPublicId(user.id)
        : await usersApi.activateUserByPublicId(user.id);
      
      if (response.success) {
        const newStatus = !user.isActive;
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        addToast('success', 'Status Updated', `User "${fullName}" status updated to ${newStatus ? 'Active' : 'Inactive'}.`);
        fetchUsers(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      addToast('error', 'Error', 'Failed to update user status. Please try again.');
    }
  };

  const handleUserUpdated = (updatedUser: User) => {
    setShowEditDialog(false);
    setShowUserDetail(false);
    const fullName = `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim();
    addToast('success', 'User Updated', `User "${fullName}" has been updated successfully.`);
    fetchUsers(); // Refresh the list to get the latest data
  };

  const handleUserError = (error: string) => {
    addToast('error', 'Error', error);
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchUsers(page);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  // Handler for UserRow actions
  const handleUserRowAction = (action: string, userId: number) => {
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
        handleToggleStatus(user);
        break;
      case 'deactivate':
        handleToggleStatus(user);
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  // Handler for header actions
  const handleAddUser = () => {
    setShowCreateForm(true);
  };

  const handleExportUsers = () => {
    // TODO: Implement export functionality
    addToast('info', 'Export', 'Export functionality coming soon!');
  };

  // Handler for UserFilters component
  const handleFiltersChange = (newFilters: UserFiltersType) => {
    console.log('🔄 Filters changed:', newFilters);
    setRoleFilter(newFilters.role || 'all');
    setStatusFilter(newFilters.status || 'all');
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSearchChange = (searchValue: string) => {
    console.log('🔍 Search changed:', searchValue);
    setSearchTerm(searchValue);
    setCurrentPage(1); // Reset to first page when search changes
  };

  const handleClearFilters = () => {
    console.log('🧹 Clearing filters');
    setSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  // Create filters object for UserFilters component
  const filters: UserFiltersType = {
    search: searchTerm,
    role: roleFilter === 'all' ? undefined : roleFilter as any,
    status: statusFilter === 'all' ? undefined : statusFilter as any,
    page: currentPage,
    limit: pageSize
  };

  const calculateStats = () => {
    const usersArray = users || [];
    const totalUsers = usersArray.length;
    const activeUsers = usersArray.filter(u => u.isActive).length;
    const inactiveUsers = usersArray.filter(u => !u.isActive).length;
    const verifiedUsers = usersArray.filter(u => u.emailVerified).length;
    const unverifiedUsers = usersArray.filter(u => !u.emailVerified).length;
    
    return { totalUsers, activeUsers, inactiveUsers, verifiedUsers, unverifiedUsers };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="animate-pulse">
            <div className="h-8 bg-bg-tertiary rounded w-1/4 mb-6"></div>
            <div className="h-12 bg-bg-tertiary rounded mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-bg-tertiary rounded"></div>
              ))}
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageContent>
        {/* Page Header */}
        <UserPageHeader
          title="User Management"
          subtitle="Manage all users across the platform"
          showExportButton={true}
          showAddButton={true}
          onExport={handleExportUsers}
          onAdd={handleAddUser}
          addButtonText="Add User"
          exportButtonText="Export Users"
          className="mb-6"
        />
        {/* Stats Overview */}
        <StatsOverview
          stats={[
            {
              label: 'Total Users',
              value: stats.totalUsers,
              icon: UserIcon,
              color: 'text-blue-600',
              bgColor: 'bg-blue-100'
            },
            {
              label: 'Active Users',
              value: stats.activeUsers,
              icon: CheckCircle,
              color: 'text-green-600',
              bgColor: 'bg-green-100'
            },
            {
              label: 'Inactive Users',
              value: stats.inactiveUsers,
              icon: XCircle,
              color: 'text-gray-600',
              bgColor: 'bg-gray-100'
            },
            {
              label: 'Verified Users',
              value: stats.verifiedUsers,
              icon: CheckCircle,
              color: 'text-green-600',
              bgColor: 'bg-green-100'
            }
          ]}
          className="mb-8"
        />

        {/* Search and Filters */}
        <UserFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
        />

        {/* Users List */}
        <UserTable
          users={filteredUsers}
          onUserAction={handleUserRowAction}
          showActions={true}
          actions={['view', 'edit', 'activate', 'deactivate']}
          className="py-4"
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <UserPagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={totalUsers}
            onPageChange={handlePageChange}
          />
        )}

        {/* Empty State */}
        {filteredUsers.length === 0 && (
          <EmptyState
            icon={UserIcon}
            title="No users found"
            description={
              searchTerm || roleFilter !== 'all' || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first user'
            }
            actionLabel="Add User"
            onAction={() => setShowCreateForm(true)}
          />
        )}
      </PageContent>

      {/* User Detail Dialog */}
      <Dialog open={showUserDetail} onOpenChange={setShowUserDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <UserIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{selectedUser.name}</h2>
                  <p className="text-text-secondary">{selectedUser.email}</p>
                  <div className="flex gap-2 mt-2">
                    {getRoleBadge(selectedUser.role)}
                    {getStatusBadge(selectedUser.isActive)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Phone</label>
                  <p className="text-text-primary">{selectedUser.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Last Login</label>
                  <p className="text-text-primary">
                    {selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString() : 'Never'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Email Verified</label>
                  <p className="text-text-primary">{selectedUser.emailVerified ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Created</label>
                  <p className="text-text-primary">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              {selectedUser.merchant?.name && (
                <div>
                  <label className="text-sm font-medium text-text-secondary">Merchant</label>
                  <p className="text-text-primary">{selectedUser.merchant.name}</p>
                </div>
              )}
              
              {selectedUser.outlet?.name && (
                <div>
                  <label className="text-sm font-medium text-text-secondary">Outlet</label>
                  <p className="text-text-primary">{selectedUser.outlet.name}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User Edit Dialog */}
      {selectedUser && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information for {`${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()}
              </DialogDescription>
            </DialogHeader>
            
            <EditUserForm
              user={selectedUser}
              onSave={async (userData) => {
                try {
                  const response = await usersApi.updateUserByPublicId(selectedUser.id, userData);
                  if (response.success) {
                    addToast('success', 'User Updated', 'User information has been updated successfully.');
                    setShowEditDialog(false);
                    fetchUsers(); // Refresh the list
                  } else {
                    throw new Error(response.error || 'Failed to update user');
                  }
                } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : 'An error occurred';
                  addToast('error', 'Update Failed', errorMessage);
                }
              }}
              onCancel={() => setShowEditDialog(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* User Detail Dialog (View Only) */}
      <UserDetailDialog
        open={showUserDetail}
        onOpenChange={setShowUserDetail}
        user={selectedUser}
        onUserUpdated={handleUserUpdated}
        onError={handleUserError}
      />

      {/* Create User Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with appropriate role and organization assignment.
            </DialogDescription>
          </DialogHeader>
          <AddUserForm
            onSave={async (userData) => {
              try {
                const response = await usersApi.createUser(userData);
                if (response.success) {
                  addToast('success', 'User Created', 'User has been created successfully.');
                  setShowCreateForm(false);
                  fetchUsers(); // Refresh the list
                } else {
                  throw new Error(response.error || 'Failed to create user');
                }
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'An error occurred';
                addToast('error', 'Creation Failed', errorMessage);
                // Don't re-throw - let toast handle the error display
              }
            }}
            onCancel={() => setShowCreateForm(false)}
            currentUser={currentUser}
          />
        </DialogContent>
      </Dialog>
      
      {/* Toast Container for notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </PageWrapper>
  );
}
