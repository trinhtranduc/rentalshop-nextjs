'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@rentalshop/ui';
import DashboardWrapper from '../../components/DashboardWrapper';

export default function OrdersPage() {
  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Đơn hàng</h1>
        <p className="text-gray-600">Quản lý đơn hàng và giao dịch</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Đơn hàng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <h3 className="text-lg font-medium mb-2">Tính năng đang phát triển</h3>
              <p>Trang quản lý đơn hàng sẽ sớm có mặt.</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardWrapper>
  );
} 