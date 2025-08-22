'use client'

import React from 'react';
import type { User } from '@rentalshop/types';

interface UserReadOnlyInfoProps {
  user: User;
}

export const UserReadOnlyInfo: React.FC<UserReadOnlyInfoProps> = ({ user }) => {
  const formatDate = (date: Date | string) => {
    if (!date) return 'Not available';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
      <div>
        <dt className="text-sm font-medium text-gray-500">First Name</dt>
        <dd className="mt-1 text-sm text-gray-900">{user.firstName || 'Not provided'}</dd>
      </div>
      
      <div>
        <dt className="text-sm font-medium text-gray-500">Last Name</dt>
        <dd className="mt-1 text-sm text-gray-900">{user.lastName || 'Not provided'}</dd>
      </div>
      
      <div>
        <dt className="text-sm font-medium text-gray-500">Phone</dt>
        <dd className="mt-1 text-sm text-gray-900">{user.phone || 'Not provided'}</dd>
      </div>
      
      <div>
        <dt className="text-sm font-medium text-gray-500">Email</dt>
        <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
      </div>
      
      <div>
        <dt className="text-sm font-medium text-gray-500">Created</dt>
        <dd className="mt-1 text-sm text-gray-900">{formatDate(user.createdAt)}</dd>
      </div>
      
      {user.merchant && (
        <div>
          <dt className="text-sm font-medium text-gray-500">Merchant</dt>
          <dd className="mt-1 text-sm text-gray-900">{user.merchant.name}</dd>
        </div>
      )}
      
      {user.outlet && (
        <div>
          <dt className="text-sm font-medium text-gray-500">Outlet</dt>
          <dd className="mt-1 text-sm text-gray-900">{user.outlet.name}</dd>
        </div>
      )}
      
      {!user.merchant && !user.outlet && (
        <div className="col-span-2">
          <dt className="text-sm font-medium text-gray-500">Organization</dt>
          <dd className="mt-1 text-sm text-gray-500 italic">No organization assigned</dd>
        </div>
      )}
    </dl>
  );
};
