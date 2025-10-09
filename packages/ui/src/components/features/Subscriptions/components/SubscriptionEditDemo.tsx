"use client";

import React, { useState } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@rentalshop/ui';
import { SubscriptionEditDialog } from './SubscriptionEditDialog';
import type { Subscription, Plan, Merchant, SubscriptionUpdateInput } from '@rentalshop/types';

// Mock data for demo
const mockSubscription: Subscription = {
  id: 1,
  merchantId: 1,
  planId: 1,
  status: 'active',
  currentPeriodStart: new Date('2024-01-01'),
  currentPeriodEnd: new Date('2024-02-01'),
  trialStart: new Date('2023-12-01'),
  trialEnd: new Date('2023-12-31'),
  cancelAtPeriodEnd: false,
  amount: 29.99,
  currency: 'USD',
  interval: 'month',
  intervalCount: 1,
  period: 1,
  discount: 0,
  savings: 0,
  createdAt: new Date('2023-12-01'),
  updatedAt: new Date('2024-01-01'),
  merchant: {
    id: 1,
    name: 'Demo Merchant',
    email: 'demo@merchant.com',
    subscriptionStatus: 'active'
  },
  plan: {
    id: 1,
    name: 'Professional Plan',
    description: 'Professional features for growing businesses',
    basePrice: 29.99,
    currency: 'USD',
    trialDays: 30,
    limits: {
      outlets: 5,
      users: 10,
      products: 100,
      customers: 500
    },
    features: ['Advanced Analytics', 'Priority Support', 'Custom Branding'],
    isActive: true,
    isPopular: false,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-01')
  }
};

const mockPlans: Plan[] = [
  {
    id: 1,
    name: 'Professional Plan',
    description: 'Professional features for growing businesses',
    basePrice: 29.99,
    currency: 'USD',
    trialDays: 30,
    limits: {
      outlets: 5,
      users: 10,
      products: 100,
      customers: 500
    },
    features: ['Advanced Analytics', 'Priority Support', 'Custom Branding'],
    isActive: true,
    isPopular: false,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 2,
    name: 'Enterprise Plan',
    description: 'Enterprise features for large businesses',
    basePrice: 99.99,
    currency: 'USD',
    trialDays: 14,
    limits: {
      outlets: 50,
      users: 100,
      products: 1000,
      customers: 5000
    },
    features: ['Advanced Analytics', 'Priority Support', 'Custom Branding', 'API Access', 'White Label'],
    isActive: true,
    isPopular: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

const mockMerchants: Merchant[] = [
  {
    id: 'merchant_123',
    name: 'Demo Merchant',
    email: 'demo@merchant.com',
    phone: '+1-555-0123',
    address: '123 Demo Street',
    city: 'Demo City',
    state: 'DC',
    zipCode: '12345',
    country: 'US',
    subscriptionStatus: 'active',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'merchant_456',
    name: 'Acme Corporation',
    email: 'contact@acme.com',
    phone: '+1-555-0456',
    address: '456 Business Ave',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'US',
    subscriptionStatus: 'active',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'merchant_789',
    name: 'Tech Solutions Inc',
    email: 'info@techsolutions.com',
    phone: '+1-555-0789',
    address: '789 Innovation Blvd',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    country: 'US',
    subscriptionStatus: 'active',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'merchant_101',
    name: 'Global Enterprises',
    email: 'hello@global.com',
    phone: '+1-555-0101',
    address: '101 World Street',
    city: 'Chicago',
    state: 'IL',
    zipCode: '60601',
    country: 'US',
    subscriptionStatus: 'active',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'merchant_202',
    name: 'Startup Ventures',
    email: 'team@startup.com',
    phone: '+1-555-0202',
    address: '202 Future Lane',
    city: 'Austin',
    state: 'TX',
    zipCode: '73301',
    country: 'US',
    subscriptionStatus: 'active',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

export function SubscriptionEditDemo() {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEdit = async (data: SubscriptionUpdateInput) => {
    setLoading(true);
    try {
      console.log('Updating subscription with data:', data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Subscription updated successfully!');
      setShowEditDialog(false);
    } catch (error) {
      console.error('Failed to update subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Subscription Edit Dialog with Searchable Merchant Field</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Current Subscription:</h3>
            <div className="text-sm space-y-1">
              <p><strong>Merchant:</strong> {mockSubscription.merchant.name}</p>
              <p><strong>Plan:</strong> {mockSubscription.plan.name}</p>
              <p><strong>Status:</strong> {mockSubscription.status}</p>
              <p><strong>Amount:</strong> ${mockSubscription.amount}/{mockSubscription.interval}</p>
              <p><strong>Period:</strong> {mockSubscription.currentPeriodStart.toLocaleDateString()} - {mockSubscription.currentPeriodEnd.toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">✨ New Feature: Searchable Merchant Field</h3>
            <p className="text-sm text-gray-600 mb-3">
              The merchant field now uses a searchable input that allows you to:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Search by merchant name</li>
              <li>Search by email address</li>
              <li>Search by location (city, state)</li>
              <li>See merchant details in the dropdown</li>
              <li>Handle large numbers of merchants efficiently</li>
            </ul>
          </div>
          
          <div className="flex gap-4">
            <Button onClick={() => setShowEditDialog(true)}>
              Edit Subscription
            </Button>
            <Button variant="outline" onClick={() => console.log('View subscription details')}>
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>

      <SubscriptionEditDialog
        subscription={mockSubscription}
        plans={mockPlans}
        merchants={mockMerchants}
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSave={handleEdit}
        loading={loading}
      />
    </div>
  );
}