import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import type { CustomerWithMerchant } from '@rentalshop/database';
import { Package, Calendar, DollarSign, User, MapPin, Clock } from 'lucide-react';
import { ORDER_STATUS_COLORS } from '@rentalshop/constants';

interface CustomerOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerWithMerchant | null;
}

interface CustomerOrder {
  id: number;
  orderNumber: string;
  orderType: 'RENT' | 'SALE' | 'RENT_TO_OWN';
  status: string;
  totalAmount: number;
  depositAmount: number;
  pickupPlanAt?: Date;
  returnPlanAt?: Date;
  pickedUpAt?: Date;
  returnedAt?: Date;
  createdAt: Date;
  outletName: string;
}

export const CustomerOrdersDialog: React.FC<CustomerOrdersDialogProps> = ({
  open,
  onOpenChange,
  customer
}) => {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && customer) {
      fetchCustomerOrders(customer.id);
    }
  }, [open, customer]);

  const fetchCustomerOrders = async (customerId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      // Mock data for now - replace with actual API call
      const mockOrders: CustomerOrder[] = [
        {
          id: 1,
          orderNumber: '1',
          orderType: 'RENT',
          status: 'PICKUPED',
          totalAmount: 150.00,
          depositAmount: 50.00,
          pickupPlanAt: new Date('2024-01-15'),
          returnPlanAt: new Date('2024-01-20'),
          pickedUpAt: new Date('2024-01-15'),
          returnedAt: undefined,
          createdAt: new Date('2024-01-10'),
          outletName: 'Downtown Store'
        },
        {
          id: 2,
          orderNumber: '2',
          orderType: 'SALE',
          status: 'COMPLETED',
          totalAmount: 299.99,
          depositAmount: 0,
          pickupPlanAt: undefined,
          returnPlanAt: undefined,
          pickedUpAt: new Date('2024-01-05'),
          returnedAt: undefined,
          createdAt: new Date('2024-01-01'),
          outletName: 'Downtown Store'
        },
        {
          id: 3,
          orderNumber: '3',
          orderType: 'RENT',
          status: 'PICKUPED',
          totalAmount: 200.00,
          depositAmount: 75.00,
          pickupPlanAt: new Date('2024-01-08'),
          returnPlanAt: new Date('2024-01-12'),
          pickedUpAt: new Date('2024-01-08'),
          returnedAt: undefined,
          createdAt: new Date('2024-01-05'),
          outletName: 'Downtown Store'
        }
      ];
      
      setOrders(mockOrders);
    } catch (err) {
      setError('Failed to fetch customer orders');
      console.error('Error fetching customer orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS] || 'bg-gray-100 text-gray-800';
    return (
      <Badge variant="outline" className={colors}>
        {status}
      </Badge>
    );
  };

  const getOrderTypeBadge = (orderType: string) => {
    const variants = {
      RENT: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      SALE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      RENT_TO_OWN: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
    };
    
    return (
      <Badge variant="outline" className={variants[orderType as keyof typeof variants] || variants.RENT}>
        {orderType}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysOverdue = (returnDate: Date | undefined) => {
    if (!returnDate) return 0;
    const today = new Date();
    const diffTime = today.getTime() - returnDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div>
            <DialogTitle className="text-xl font-semibold">
              Customer Orders
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-1">
              View all orders for {customer.firstName} {customer.lastName}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="mt-6">
          {/* Customer Summary */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                    <p className="text-sm text-gray-500">{customer.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{orders.length} Orders</p>
                    <p className="text-sm text-gray-500">Total Orders</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium">
                      {formatCurrency(orders.reduce((sum, order) => sum + order.totalAmount, 0))}
                    </p>
                    <p className="text-sm text-gray-500">Total Spent</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders List */}
          {loading ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-gray-500">
                  <Package className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p>Loading orders...</p>
                </div>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-red-500">
                  <Package className="w-8 h-8 mx-auto mb-2" />
                  <p>{error}</p>
                </div>
              </CardContent>
            </Card>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-gray-500">
                  <Package className="w-8 h-8 mx-auto mb-2" />
                  <p>No orders found for this customer</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-semibold text-lg">#{order.orderNumber}</h3>
                          {getStatusBadge(order.status)}
                          {getOrderTypeBadge(order.orderType)}
                          {order.status === 'PICKUPED' && order.returnPlanAt && new Date() > order.returnPlanAt && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              {getDaysOverdue(order.returnPlanAt)} days overdue
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600">{order.outletName}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600">
                              Created: {formatDate(order.createdAt)}
                            </span>
                          </div>
                          
                          {order.pickupPlanAt && (
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">
                                Pickup: {formatDate(order.pickupPlanAt)}
                              </span>
                            </div>
                          )}
                          
                          {order.returnPlanAt && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">
                                Return: {formatDate(order.returnPlanAt)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className="text-lg font-semibold text-gray-900">
                          {formatCurrency(order.totalAmount)}
                        </div>
                        {order.depositAmount > 0 && (
                          <div className="text-sm text-gray-500">
                            Deposit: {formatCurrency(order.depositAmount)}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
