'use client'

import React from 'react';

interface UserInfoCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const UserInfoCard: React.FC<UserInfoCardProps> = ({
  title,
  children,
  className = ''
}) => {
  return (
    <div className={`bg-white shadow rounded-lg mb-6 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">{title}</h2>
      </div>
      
      <div className="px-6 py-4">
        {children}
      </div>
    </div>
  );
};
