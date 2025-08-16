'use client'

import React from 'react';
import type { User } from '../types';

interface UserReadOnlyInfoProps {
  user: User;
}

export const UserReadOnlyInfo: React.FC<UserReadOnlyInfoProps> = ({ user }) => {
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
      <div>
        <dt className="text-sm font-medium text-gray-500">Full Name</dt>
        <dd className="mt-1 text-sm text-gray-900">{user.name}</dd>
      </div>
      
      <div>
        <dt className="text-sm font-medium text-gray-500">Email</dt>
        <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
      </div>
      
      <div>
        <dt className="text-sm font-medium text-gray-500">Phone</dt>
        <dd className="mt-1 text-sm text-gray-900">{user.phone || 'Not provided'}</dd>
      </div>
      
      <div>
        <dt className="text-sm font-medium text-gray-500">Role</dt>
        <dd className="mt-1 text-sm text-gray-900">{user.role}</dd>
      </div>
      
      <div>
        <dt className="text-sm font-medium text-gray-500">Status</dt>
        <dd className="mt-1">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            user.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {user.isActive ? 'Active' : 'Inactive'}
          </span>
        </dd>
      </div>
      
      <div>
        <dt className="text-sm font-medium text-gray-500">Created</dt>
        <dd className="mt-1 text-sm text-gray-900">
          {new Date(user.createdAt).toLocaleDateString()}
        </dd>
      </div>
    </dl>
  );
};
