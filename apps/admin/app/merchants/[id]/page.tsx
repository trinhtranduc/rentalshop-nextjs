'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  MerchantDetail,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Button
} from '@rentalshop/ui';
import { ArrowLeft } from 'lucide-react';
import type { Merchant } from '@rentalshop/types';

export default function MerchantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const merchantId = params.id as string;
  
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMerchantDetails();
  }, [merchantId]);

  const fetchMerchantDetails = async () => {
    try {
      setLoading(true);
      
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        setError('Authentication required');
        return;
      }

      const response = await fetch(`http://localhost:3002/api/merchants/${merchantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMerchant(data.data);
        } else {
          setError(data.message || 'Failed to fetch merchant details');
        }
      } else {
        console.error('Failed to fetch merchant details');
        // Fallback to mock data for now
      }
    } catch (error) {
      console.error('Error fetching merchant details:', error);
      setError('Failed to fetch merchant details');
      // Fallback to mock data for now
    } finally {
      setLoading(false);
    }
  };

  const handleMerchantAction = (action: string, merchantId: number) => {
    switch (action) {
      case 'edit':
        router.push(`/merchants/${merchantId}/edit`);
        break;
      default:
        console.log('Merchant action:', action, merchantId);
    }
  };

  const handleOutletAction = (action: string, outletId: number) => {
    console.log('Outlet action:', action, outletId);
    // Handle outlet actions
  };

  const handleUserAction = (action: string, userId: number) => {
    console.log('User action:', action, userId);
    // Handle user actions
  };

  const handleProductAction = (action: string, productId: number) => {
    console.log('Product action:', action, productId);
    // Handle product actions
  };

  const handleOrderAction = (action: string, orderId: number) => {
    console.log('Order action:', action, orderId);
    // Handle order actions
  };

  if (loading) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="animate-pulse">
            <div className="h-8 bg-bg-tertiary rounded w-1/4 mb-6"></div>
            <div className="h-12 bg-bg-tertiary rounded mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-bg-tertiary rounded"></div>
              ))}
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (error || !merchant) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium mb-2">Error Loading Merchant</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {error || 'Merchant not found'}
            </p>
            <Button
              onClick={() => router.push('/merchants')}
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Merchants
            </Button>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  // Prepare data for MerchantDetail component
  const merchantData = merchant;

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/merchants')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Merchants
            </Button>
            <PageTitle subtitle={`Manage merchant: ${merchant.merchant.name}`}>
              Merchant Details
            </PageTitle>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/merchants/${merchantId}/edit`)}
            >
              Edit Merchant
            </Button>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        <MerchantDetail
          data={merchantData}
          onMerchantAction={handleMerchantAction}
          onOutletAction={handleOutletAction}
          onUserAction={handleUserAction}
          onProductAction={handleProductAction}
          onOrderAction={handleOrderAction}
        />
      </PageContent>
    </PageWrapper>
  );
}
