import React from 'react';
import { Badge } from '../../../ui/badge';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from '../../../ui/card';
import { 
  Package, 
  User, 
  Mail 
} from 'lucide-react';
import { formatDate } from '@rentalshop/utils';
import { CalendarDay, PickupOrder } from '../types';

// Utility functions
const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    'CONFIRMED': 'bg-blue-100 text-blue-800',
    'ACTIVE': 'bg-green-100 text-green-800',
    'COMPLETED': 'bg-gray-100 text-gray-800',
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'CANCELLED': 'bg-red-100 text-red-800'
  };
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};

const getOrdersForDate = (calendarDays: CalendarDay[], selectedDate: Date | null): PickupOrder[] => {
  if (!selectedDate) {
    return calendarDays.flatMap(day => day.orders);
  }
  
  const targetDay = calendarDays.find(day => 
    day.date.toDateString() === selectedDate.toDateString()
  );
  
  return targetDay?.orders || [];
};

const getOrderStats = (calendarDays: CalendarDay[], orders: PickupOrder[]) => {
  const daysWithPickups = calendarDays.filter(day => day.pickupCount > 0).length;
  const totalOrders = orders.length;
  
  return { daysWithPickups, totalOrders };
};

// OrderCard Component
interface OrderCardProps {
  order: PickupOrder;
}

const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const customerName = order.customer 
    ? `${order.customer.firstName || 'Unknown'} ${order.customer.lastName || 'Customer'}`
    : 'Unknown Customer';

  const customerPhone = order.customer?.phone || 'No phone';
  const customerEmail = order.customer?.email;
  const outletName = order.outlet?.name || 'Unknown Outlet';

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4 hover:border-blue-300 hover:shadow-sm transition-all duration-200">
      {/* Order Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-900">
          #{order.orderNumber}
        </h3>
        <Badge className={`${getStatusColor(order.status)} text-xs font-medium`}>
          {order.status}
        </Badge>
      </div>

      {/* Customer Information */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{customerName}</p>
            <p className="text-gray-500 text-xs">{customerPhone}</p>
          </div>
        </div>
        
        {customerEmail && (
          <div className="flex items-center gap-2 text-sm text-gray-600 ml-11">
            <Mail className="w-4 h-4" />
            <span>{customerEmail}</span>
          </div>
        )}
      </div>

      {/* Outlet Information */}
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <span className="font-medium">{outletName}</span>
      </div>

      {/* Pickup and Return Times */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-sm text-gray-600">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pickup</p>
          <p className="font-medium">
            {order.pickupPlanAt ? formatDate(new Date(order.pickupPlanAt)) : 'No pickup date'}
          </p>
        </div>
        
        <div className="text-sm text-gray-600">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Return</p>
          <p className="font-medium">
            {order.returnPlanAt ? formatDate(new Date(order.returnPlanAt)) : 'No return date'}
          </p>
        </div>
      </div>

      {/* Products */}
      <div>
        <p className="text-gray-600 text-sm mb-2">Items</p>
        <div className="flex flex-wrap gap-2">
          {order.orderItems && order.orderItems.length > 0 ? (
            order.orderItems.map((item, index) => (
              <span key={index} className="bg-gray-100 px-2 py-1 rounded text-xs">
                {item.product?.name || 'Unknown Product'} (x{item.quantity || 1})
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-xs">No items available</span>
          )}
        </div>
      </div>
      
      {/* Total Amount */}
      <div className="pt-3 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-700">Total:</span>
          <span className="font-semibold text-lg text-green-600">
            ${order.totalAmount.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

// Empty State Component
const EmptyState: React.FC<{ selectedDate: Date | null }> = ({ selectedDate }) => (
  <div className="text-center text-gray-500 py-12">
    <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
    <p className="text-gray-600 font-medium">
      {selectedDate ? 'No pickup orders for this date' : 'No orders available'}
    </p>
    <p className="text-sm text-gray-500 mt-1">
      {selectedDate ? 'Select a different date to view orders' : 'Orders will appear here when available'}
    </p>
  </div>
);

// Main Component
interface OrdersListProps {
  selectedDate: Date | null;
  calendarDays: CalendarDay[];
}

export function OrdersList({ selectedDate, calendarDays }: OrdersListProps) {
  // Get and process orders
  const orders = getOrdersForDate(calendarDays, selectedDate);
  const sortedOrders = React.useMemo(() => 
    orders.sort((a, b) => new Date(a.pickupPlanAt).getTime() - new Date(b.pickupPlanAt).getTime()),
    [orders]
  );

  // Get statistics
  const { daysWithPickups, totalOrders } = getOrderStats(calendarDays, orders);

  // Early return for no date selected
  if (!selectedDate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select a date to view pickup orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Click on a date to view pickup orders</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 shadow-sm">
      {/* Header Section - Only show when no date selected */}
      {!selectedDate && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">All Orders</h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  {totalOrders} Total Orders
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  {daysWithPickups} Days with Pickups
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Content Section */}
      <div className="p-6">
        {orders.length === 0 ? (
          <EmptyState selectedDate={selectedDate} />
        ) : (
          <div className="space-y-4">
            {sortedOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
