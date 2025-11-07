'use client';

// Disable prerendering to avoid module resolution issues
export const dynamic = 'force-dynamic';

// Disable prerendering to avoid module resolution issues

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  EmptyState,
  useToast } from '@rentalshop/ui';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Calendar, 
  User, 
  DollarSign, 
  Package,
  RefreshCw
} from 'lucide-react';
import type { Product, OrderWithDetails } from '@rentalshop/types';
import { ordersApi, productsApi } from '@rentalshop/utils';

export default function ProductOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const { toasts, toastError, removeToast } = useToast();
  const merchantId = params.id as string;
  const productId = params.productId as string;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productId) {
      fetchProductAndOrders();
    }
  }, [productId]);

  const fetchProductAndOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch product details
      const productResult = await productsApi.getProductById(parseInt(productId));
      if (productResult.success && productResult.data) {
        setProduct(productResult.data);
      } else {
        setError('Failed to fetch product details');
        return;
      }
      
      // Fetch orders for this product
      const ordersResult = await ordersApi.searchOrders({
        productId: parseInt(productId),
        limit: 100
      });
      
      if (ordersResult.success && ordersResult.data) {
        setOrders(ordersResult.data.orders || []);
      } else {
        setError('Failed to fetch product orders');
      }
    } catch (err) {
      console.error('Error fetching product and orders:', err);
      setError('An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToProduct = () => {
    router.push(`/merchants/${merchantId}/products/${productId}`);
  };

  const handleBackToProducts = () => {
    router.push(`/merchants/${merchantId}/products`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'RESERVED': { color: 'bg-blue-100 text-blue-800', text: 'Reserved' },
      'PICKUPED': { color: 'bg-green-100 text-green-800', text: 'Picked Up' },
      'RETURNED': { color: 'bg-gray-100 text-gray-800', text: 'Returned' },
      'COMPLETED': { color: 'bg-green-100 text-green-800', text: 'Completed' },
      'CANCELLED': { color: 'bg-red-100 text-red-800', text: 'Cancelled' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['RESERVED'];
    
    return (
      <Badge className={config.color}>
        {config.text}
      </Badge>
    );
  };

  const getOrderTypeBadge = (orderType: string) => {
    const typeConfig = {
      'RENT': { color: 'bg-purple-100 text-purple-800', text: 'Rental' },
      'SALE': { color: 'bg-green-100 text-green-800', text: 'Sale' }
    };
    
    const config = typeConfig[orderType as keyof typeof typeConfig] || typeConfig['RENT'];
    
    return (
      <Badge className={config.color}>
        {config.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToProducts}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Products
            </Button>
            <PageTitle>Product Orders</PageTitle>
          </div>
        </PageHeader>
        <PageContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-action-primary"></div>
            <span className="ml-2 text-text-secondary">Loading orders...</span>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <PageHeader>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToProducts}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Products
            </Button>
            <PageTitle>Product Orders</PageTitle>
          </div>
        </PageHeader>
        <PageContent>
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">❌</div>
            <h3 className="text-lg font-medium text-text-primary mb-2">Error Loading Orders</h3>
            <p className="text-text-secondary mb-4">{error}</p>
            <Button onClick={fetchProductAndOrders} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper>
        <PageHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToProduct}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Product
              </Button>
              <div>
                <PageTitle subtitle={`Orders for ${product?.name || 'Product'}`}>
                  Product Orders
                </PageTitle>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchProductAndOrders}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </PageHeader>

        <PageContent>
          {/* Product Summary */}
          {product && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Product Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary">Product Name</p>
                    <p className="font-medium">{product.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Barcode</p>
                    <p className="font-medium">{product.barcode || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Rent Price</p>
                    <p className="font-medium">{formatCurrency(product.rentPrice)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Orders List */}
          {orders.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="No Orders Found"
              description="This product hasn't been ordered yet."
            />
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="border border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Order #{order.orderNumber}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {getOrderTypeBadge(order.orderType)}
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Customer Info */}
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-text-tertiary" />
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {order.customer?.firstName} {order.customer?.lastName}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {order.customer?.phone}
                          </p>
                        </div>
                      </div>

                      {/* Order Date */}
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-text-tertiary" />
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {formatDate(order.createdAt)}
                          </p>
                          <p className="text-xs text-text-secondary">
                            Created
                          </p>
                        </div>
                      </div>

                      {/* Total Amount */}
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-4 h-4 text-text-tertiary" />
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {formatCurrency(order.totalAmount)}
                          </p>
                          <p className="text-xs text-text-secondary">
                            Total Amount
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Order Items */}
                    {(order as any).orderItems && (order as any).orderItems.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <h4 className="text-sm font-medium text-text-primary mb-2">Order Items:</h4>
                        <div className="space-y-2">
                          {(order as any).orderItems.map((item: any, index: number) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Package className="w-3 h-3 text-text-tertiary" />
                                <span className="text-text-primary">
                                  {item.product?.name || 'Unknown Product'}
                                </span>
                                <span className="text-text-secondary">
                                  (Qty: {item.quantity})
                                </span>
                              </div>
                              <span className="text-text-primary font-medium">
                                {formatCurrency(item.totalPrice)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rental Dates (for rental orders) */}
                    {order.orderType === 'RENT' && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {order.pickupPlanAt && (
                            <div>
                              <p className="text-text-secondary">Pickup Date:</p>
                              <p className="text-text-primary font-medium">
                                {formatDate(order.pickupPlanAt)}
                              </p>
                            </div>
                          )}
                          {order.returnPlanAt && (
                            <div>
                              <p className="text-text-secondary">Return Date:</p>
                              <p className="text-text-primary font-medium">
                                {formatDate(order.returnPlanAt)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </PageContent>
      </PageWrapper>
    </>
  );
}
