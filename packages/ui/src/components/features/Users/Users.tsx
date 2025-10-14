'use client';

import React from 'react';
import { 
  PageWrapper,
  PageContent,
  Pagination,
  EmptyState,
  Button,
  Card,
  CardContent
} from '@rentalshop/ui';
import { UserPageHeader, UserFilters as UserFiltersComponent, UserTable } from './components';
import { 
  User as UserIcon, 
  Download
} from 'lucide-react';
import type { User, UserFilters } from '@rentalshop/types';
import { useUserRole } from '@rentalshop/hooks';

// Data interface for users list
export interface UsersData {
  users: User[];
  items?: User[]; // Alias for compatibility
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  hasMore: boolean;
}

export interface UsersProps {
  // Data props (required for external data mode - URL state pattern)
  data?: UsersData;
  filters?: UserFilters;
  onFiltersChange?: (filters: UserFilters) => void;
  onSearchChange?: (searchValue: string) => void;
  onClearFilters?: () => void;
  onUserAction?: (action: string, userId: number) => void;
  onPageChange?: (page: number) => void;
  onSort?: (column: string) => void;
  
  // Display props
  title?: string;
  subtitle?: string;
  showExportButton?: boolean;
  showAddButton?: boolean;
  addButtonText?: string;
  exportButtonText?: string;
  showStats?: boolean;
  currentUser?: any;
  onExport?: () => void;
  className?: string;
}

/**
 * ✅ SIMPLIFIED USERS COMPONENT (Modern Pattern)
 * 
 * - Clean presentation component (like Orders, Products, Customers)
 * - No internal state management
 * - Works with external data (URL state pattern)
 * - Single responsibility: render users UI
 */
export const Users: React.FC<UsersProps> = ({
  // Data props
  data,
  filters = {},
  onFiltersChange = () => {},
  onSearchChange = () => {},
  onClearFilters = () => {},
  onUserAction = () => {},
  onPageChange = () => {},
  onSort = () => {},
  
  // Display props
  title = "User Management",
  subtitle = "Manage users in the system",
  showExportButton = false,
  showAddButton = false,
  addButtonText = "Add User",
  exportButtonText = "Export Users",
  showStats = false,
  currentUser,
  onExport,
  className = ""
}) => {
  
  // User role check for permissions
  const { canManageUsers } = useUserRole(currentUser);
  
  // Debug: Log received data
  console.log('👥 Users Component - Received data:', {
    hasData: !!data,
    usersCount: data?.users?.length || 0,
    total: data?.total,
    page: data?.page,
    filters
  });
  
  // Handler for export button
  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      console.log('Export functionality not implemented');
    }
  };

  // Handler for add user button
  const handleAddUser = () => {
    console.log('Add user functionality should be implemented in page');
  };

  // Default empty data
  const users = data?.users || [];
  const totalUsers = data?.total || 0;
  const currentPage = data?.page || 1;
  const totalPages = data?.totalPages || 1;
  const limit = data?.limit || 25;
  
  console.log('👥 Users Component - Processed data:', {
    usersCount: users.length,
    totalUsers,
    currentPage,
    totalPages,
    limit
  });

  // Memoize handlers to prevent child re-renders
  const memoizedOnFiltersChange = React.useCallback(onFiltersChange, [onFiltersChange]);
  const memoizedOnSearchChange = React.useCallback(onSearchChange, [onSearchChange]);
  const memoizedOnClearFilters = React.useCallback(onClearFilters, [onClearFilters]);
  const memoizedOnUserAction = React.useCallback(onUserAction, [onUserAction]);
  const memoizedOnPageChange = React.useCallback(onPageChange, [onPageChange]);
  const memoizedOnSort = React.useCallback(onSort, [onSort]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 space-y-4">
        <UserPageHeader
          title={title}
          subtitle={subtitle}
          showExportButton={showExportButton}
          showAddButton={showAddButton && canManageUsers}
          onExport={handleExport}
          onAdd={handleAddUser}
          addButtonText={addButtonText}
          exportButtonText={exportButtonText}
        />

        {/* Compact Filters - All in one row */}
        <Card className="shadow-sm border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <UserFiltersComponent
                filters={filters}
                onFiltersChange={memoizedOnFiltersChange}
                onSearchChange={memoizedOnSearchChange}
                onClearFilters={memoizedOnClearFilters}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scrollable Table Section */}
      <div className="flex-1 min-h-0 mt-4">
        {users.length > 0 ? (
          <UserTable
            users={users}
            onUserAction={memoizedOnUserAction}
            sortBy={filters.sortBy || "createdAt"}
            sortOrder={filters.sortOrder || "desc"}
            onSort={memoizedOnSort}
          />
        ) : (
          <EmptyState
            icon={UserIcon}
            title="No users found"
            description={
              filters.search || filters.q || filters.role
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first user'
            }
            actionLabel={canManageUsers ? addButtonText : undefined}
            onAction={canManageUsers ? handleAddUser : undefined}
          />
        )}
      </div>

      {/* Fixed Pagination Section - Always at Bottom */}
      {users.length > 0 && totalUsers > limit && (
        <div className="flex-shrink-0 py-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={totalUsers}
            limit={limit}
            onPageChange={memoizedOnPageChange}
            itemName="users"
          />
        </div>
      )}
    </div>
  );
};

export default Users;
