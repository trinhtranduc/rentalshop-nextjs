'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from '@rentalshop/ui/base';
import EmptyState from '../../Admin/components/EmptyState';
import { 
  ShoppingCart, 
  Calendar, 
  User, 
  DollarSign, 
  Package,
  X
} from 'lucide-react';
import type { Product, OrderWithDetails } from '@rentalshop/types';
import { ordersApi } from '@rentalshop/utils';
import { useOrderTranslations } from '@rentalshop/hooks';

interface ProductOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function ProductOrdersDialog({ open, onOpenChange, product }: ProductOrdersDialogProps) {
  const t = useOrderTranslations();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && product) {
      fetchProductOrders();
    }
  }, [open, product]);

  const fetchProductOrders = async () => {
    if (!product) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch orders for this product
      const response = await ordersApi.searchOrders({
        productId: product.id,
        limit: 50
      });
      
      if (response.success && response.data) {
        setOrders(response.data.orders || []);
      } else {
        setError('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching product orders:', error);
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
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

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Orders for {product.name}
              </DialogTitle>
              <DialogDescription>
                View all orders containing this product
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-action-primary"></div>
              <span className="ml-2 text-text-secondary">Loading orders...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 mb-4">❌</div>
              <h3 className="text-lg font-medium text-text-primary mb-2">Error Loading Orders</h3>
              <p className="text-text-secondary mb-4">{error}</p>
              <Button onClick={fetchProductOrders} variant="outline">
                Try Again
              </Button>
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title={t('messages.noOrdersForProduct')}
              description={t('messages.noOrdersForProductDescription')}
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
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
