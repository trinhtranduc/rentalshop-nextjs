'use client';

import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'default' | 'role' | 'user' | 'system' | 'audit';
  className?: string;
}

export default function AdminStatusBadge({ status, type = 'default', className = '' }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (type) {
      case 'role':
        return {
          'ADMIN': { color: 'bg-red-100 text-red-800', text: 'Admin' },
          'MERCHANT': { color: 'bg-blue-100 text-blue-800', text: 'Merchant' },
          'OUTLET_ADMIN': { color: 'bg-green-100 text-green-800', text: 'Outlet Admin' },
          'OUTLET_STAFF': { color: 'bg-gray-100 text-gray-800', text: 'Outlet Staff' }
        };
      
      case 'user':
        return {
          'ACTIVE': { color: 'bg-green-100 text-green-800', text: 'Active' },
          'INACTIVE': { color: 'bg-gray-100 text-gray-800', text: 'Inactive' },
          'PENDING': { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
          'SUSPENDED': { color: 'bg-red-100 text-red-800', text: 'Suspended' }
        };
      
      case 'system':
        return {
          'HEALTHY': { color: 'bg-green-100 text-green-800', text: 'Healthy' },
          'WARNING': { color: 'bg-yellow-100 text-yellow-800', text: 'Warning' },
          'ERROR': { color: 'bg-red-100 text-red-800', text: 'Error' },
          'MAINTENANCE': { color: 'bg-blue-100 text-blue-800', text: 'Maintenance' }
        };
      
      case 'audit':
        return {
          'SUCCESS': { color: 'bg-green-100 text-green-800', text: 'Success' },
          'FAILED': { color: 'bg-red-100 text-red-800', text: 'Failed' },
          'WARNING': { color: 'bg-yellow-100 text-yellow-800', text: 'Warning' },
          'LOW': { color: 'bg-gray-100 text-gray-800', text: 'Low' },
          'MEDIUM': { color: 'bg-blue-100 text-blue-800', text: 'Medium' },
          'HIGH': { color: 'bg-orange-100 text-orange-800', text: 'High' },
          'CRITICAL': { color: 'bg-red-100 text-red-800', text: 'Critical' }
        };
      
      default:
        return {
          'SUCCESS': { color: 'bg-green-100 text-green-800', text: 'Success' },
          'ERROR': { color: 'bg-red-100 text-red-800', text: 'Error' },
          'WARNING': { color: 'bg-yellow-100 text-yellow-800', text: 'Warning' },
          'INFO': { color: 'bg-blue-100 text-blue-800', text: 'Info' }
        };
    }
  };

  const config = getStatusConfig()[status as keyof ReturnType<typeof getStatusConfig>];
  
  if (!config) {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ${className}`}>
        {status}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} ${className}`}>
      {config.text}
    </span>
  );
}
