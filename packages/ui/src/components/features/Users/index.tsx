import React from 'react';
import { 
  UserHeader, 
  UserFilters, 
  UserGrid, 
  UserTable, 
  UserPagination 
} from './components';
import type { UserData, UserFilters as UserFiltersType } from './types';

interface UsersProps {
  data: UserData;
  filters: UserFiltersType;
  viewMode: 'grid' | 'table';
  onFiltersChange: (filters: UserFiltersType) => void;
  onViewModeChange: (mode: 'grid' | 'table') => void;
  onUserAction: (action: string, userId: string) => void;
  onPageChange: (page: number) => void;
}

export function Users({ 
  data, 
  filters, 
  viewMode, 
  onFiltersChange, 
  onViewModeChange, 
  onUserAction, 
  onPageChange 
}: UsersProps) {
  const handleAddUser = () => {
    onUserAction('add', '');
  };

  return (
    <div className="space-y-6">
      <UserHeader 
        onViewModeChange={onViewModeChange}
        viewMode={viewMode}
        onAddUser={handleAddUser}
      />
      
      <UserFilters 
        filters={filters}
        onFiltersChange={onFiltersChange}
      />
      
      {viewMode === 'grid' ? (
        <UserGrid 
          users={data.users}
          onUserAction={onUserAction}
        />
      ) : (
        <UserTable 
          users={data.users}
          onUserAction={onUserAction}
        />
      )}
      
      <UserPagination 
        currentPage={data.currentPage}
        totalPages={data.totalPages}
        total={data.total}
        onPageChange={onPageChange}
      />
    </div>
  );
}

export default Users;
