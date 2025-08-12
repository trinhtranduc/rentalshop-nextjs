'use client';

import React from 'react';
import { 
  Card, 
  CardContent, 
  Button, 
  Input,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent
} from '@rentalshop/ui';
import { useAuth } from '../../hooks/useAuth';

export default function ShopsPage() {
  const { user, logout } = useAuth();
  
  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Cửa hàng</PageTitle>
        <p className="text-gray-600">Quản lý thông tin cửa hàng và chi nhánh</p>
      </PageHeader>

      <PageContent>
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Thông tin cửa hàng</h2>
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-medium mb-2">Tính năng đang phát triển</h3>
              <p>Trang quản lý cửa hàng sẽ sớm có mặt.</p>
            </div>
          </CardContent>
        </Card>
      </PageContent>
    </PageWrapper>
  );
} 