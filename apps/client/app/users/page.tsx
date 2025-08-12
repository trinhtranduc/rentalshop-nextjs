'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Button, 
  Input, 
  Badge,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent
} from '@rentalshop/ui';
import { useAuth } from '../../hooks/useAuth';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'CLIENT' | 'MERCHANT' | 'OUTLET_STAFF' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  merchant?: {
    id: string;
    companyName: string;
  };
  admin?: {
    id: string;
    level: string;
  };
  outletStaff?: Array<{
    id: string;
    role: string;
    outlet: {
      id: string;
      name: string;
      merchant: {
        id: string;
        companyName: string;
      };
    };
  }>;
}

export default function UsersPage() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, roleFilter, showActiveOnly]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        console.error('No auth token found');
        return;
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        isActive: showActiveOnly.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter && { role: roleFilter })
      });

      const response = await fetch(`/api/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          alert('You do not have permission to access this page. Only admins can view the user list.');
          return;
        }
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data.users);
        setTotalPages(data.data.totalPages);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchUsers();
  };

  const handleEditUser = (userId: string) => {
    // TODO: Implement edit functionality
    console.log('Edit user:', userId);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        console.error('No auth token found');
        return;
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Refresh the user list
        fetchUsers();
      } else {
        console.error('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames: Record<string, string> = {
      'CLIENT': 'Customer',
      'MERCHANT': 'Merchant',
      'OUTLET_STAFF': 'Staff',
      'ADMIN': 'Admin'
    };
    return roleNames[role] || role;
  };

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>User Management</PageTitle>
        <p className="text-gray-600">Manage users in the system</p>
      </PageHeader>

      {/* Search and Filters */}
      <PageContent>
        <Card className="mb-6 p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Users
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Search by name, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch}>
                  Search
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Roles</option>
                <option value="CLIENT">Customer</option>
                <option value="MERCHANT">Merchant</option>
                <option value="OUTLET_STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showActiveOnly}
                  onChange={(e) => setShowActiveOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active only</span>
              </label>
              
              <Button variant="outline" onClick={() => setSearchTerm('')}>
                Clear Filter
              </Button>
            </div>
          </div>
        </Card>

        {/* Users List */}
        {loading ? (
                  <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading users...</p>
        </div>
        ) : users.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
                          <h3 className="text-lg font-medium mb-2">No users found</h3>
            <p>Try adjusting your search criteria or add new users.</p>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {users.map((user) => (
                <Card key={user.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{user.name}</h3>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                                         <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                       user.isActive 
                         ? 'bg-green-100 text-green-800' 
                         : 'bg-red-100 text-red-800'
                     }`}>
                       {user.isActive ? 'Active' : 'Inactive'}
                     </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                                         <div className="flex justify-between text-sm">
                       <span className="text-gray-500">Role:</span>
                       <span className="font-medium">{getRoleDisplayName(user.role)}</span>
                     </div>
                                         {user.phone && (
                       <div className="flex justify-between text-sm">
                         <span className="text-gray-500">Phone:</span>
                         <span className="font-medium">{user.phone}</span>
                       </div>
                     )}
                     {user.merchant && (
                       <div className="flex justify-between text-sm">
                         <span className="text-gray-500">Company:</span>
                         <span className="font-medium">{user.merchant.companyName}</span>
                       </div>
                     )}
                     <div className="flex justify-between text-sm">
                       <span className="text-gray-500">Created:</span>
                       <span className="font-medium">
                         {new Date(user.createdAt).toLocaleDateString('en-US')}
                       </span>
                     </div>
                  </div>
                  
                  <div className="flex gap-2">
                                         <Button
                       variant="outline"
                       size="sm"
                       onClick={() => handleEditUser(user.id)}
                       className="flex-1"
                     >
                       Edit
                     </Button>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => handleDeleteUser(user.id)}
                       className="flex-1"
                     >
                       Delete
                     </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                                       <Button
                 variant="outline"
                 onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                 disabled={currentPage === 1}
               >
                 Previous
               </Button>
               
               <span className="text-sm text-gray-600">
                 Page {currentPage} of {totalPages}
               </span>
               
               <Button
                 variant="outline"
                 onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                 disabled={currentPage === totalPages}
               >
                 Next
               </Button>
              </div>
            )}
          </>
        )}
      </PageContent>
    </PageWrapper>
  );
} 