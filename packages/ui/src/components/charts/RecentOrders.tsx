import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

interface RecentOrder {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  productNames: string;
  productImage?: string | null;
  totalAmount: number;
  status: string;
  orderType: string;
  createdAt: string;
  createdBy: string;
  pickupPlanAt?: string;
  returnPlanAt?: string;
}

interface RecentOrdersProps {
  data: RecentOrder[];
  loading?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getOrderTypeColor = (orderType: string) => {
  switch (orderType.toLowerCase()) {
    case 'rent':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'sale':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rent_to_own':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const RecentOrders: React.FC<RecentOrdersProps> = ({ data, loading = false }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No recent orders
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
        <p className="text-sm text-gray-600">
          Latest order activity
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.slice(0, 10).map((order) => (
            <div key={order.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              {/* Product Image */}
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden">
                {order.productImage ? (
                  <img 
                    src={order.productImage} 
                    alt={order.productNames}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                )}
              </div>
              
              {/* Order Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    {order.orderNumber}
                  </h4>
                  <Badge variant="outline" className={`text-xs ${getOrderTypeColor(order.orderType)}`}>
                    {order.orderType.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${getStatusColor(order.status)}`}>
                    {order.status.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">{order.customerName}</span>
                  <span className="mx-2">•</span>
                  <span>{order.productNames}</span>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>${order.totalAmount.toLocaleString()}</span>
                    <span>by {order.createdBy}</span>
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                  
                  {order.pickupPlanAt && (
                    <div className="text-xs text-blue-600">
                      Pickup: {formatDate(order.pickupPlanAt)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}; 