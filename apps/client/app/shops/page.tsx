'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@rentalshop/ui';
import { DashboardWrapper } from '@rentalshop/ui';
import { useAuth } from '../../hooks/useAuth';

export default function ShopsPage() {
  const { user, logout } = useAuth();
  
  return (
    <DashboardWrapper user={user} onLogout={logout} currentPath="/shops">
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Cửa hàng</h1>
        <p className="text-gray-600">Quản lý thông tin cửa hàng</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cửa hàng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-medium mb-2">Tính năng đang phát triển</h3>
              <p>Trang quản lý cửa hàng sẽ sớm có mặt.</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardWrapper>
  );
} 