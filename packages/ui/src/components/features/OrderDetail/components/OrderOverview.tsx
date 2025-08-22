import React from 'react';
import { Separator } from '@rentalshop/ui';
import { OrderDetailData } from '@rentalshop/types';

interface OrderOverviewProps {
  order: OrderDetailData;
}

const InfoSection: React.FC<{ 
  icon: React.ReactNode; 
  title: string; 
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <div className="space-y-3">
    <div className="flex items-center space-x-2">
      {icon}
      <h4 className="font-medium text-gray-700">{title}</h4>
    </div>
    {children}
  </div>
);

const CustomerInfo: React.FC<{ customer: OrderDetailData['customer']; customerFullName?: string }> = ({ 
  customer, 
  customerFullName 
}) => (
  <InfoSection
    icon={<User className="w-4 h-4 text-gray-600" />}
    title="Customer"
  >
    <div className="space-y-2">
      <div className="font-medium text-gray-900">
        {customerFullName || 'Guest Customer'}
      </div>
      {customer?.phone && (
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Phone className="w-4 h-4" />
          <span>{customer.phone}</span>
        </div>
      )}
      {customer?.email && (
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Mail className="w-4 h-4" />
          <span>{customer.email}</span>
        </div>
      )}
    </div>
  </InfoSection>
);

const OutletInfo: React.FC<{ outlet: OrderDetailData['outlet'] }> = ({ outlet }) => (
  <InfoSection
    icon={<MapPin className="w-4 h-4 text-gray-600" />}
    title="Outlet"
  >
    <div className="space-y-2">
      <div className="font-medium text-gray-900">{outlet.name}</div>
      {outlet.address && (
        <div className="text-sm text-gray-600">{outlet.address}</div>
      )}
    </div>
  </InfoSection>
);

const ImportantDates: React.FC<{ order: OrderDetailData }> = ({ order }) => (
  <InfoSection
    icon={<Calendar className="w-4 h-4 text-gray-600" />}
    title="Important Dates"
  >
    <div className="space-y-2 text-sm text-gray-600">
      {order.pickupPlanAt && (
        <div className="flex justify-between">
          <span>Pickup:</span>
          <span>{formatDate(new Date(order.pickupPlanAt))}</span>
        </div>
      )}
      {order.returnPlanAt && (
        <div className="flex justify-between">
          <span>Return:</span>
          <span>{formatDate(new Date(order.returnPlanAt))}</span>
        </div>
      )}
      {order.pickedUpAt && (
        <div className="flex justify-between">
          <span>Picked Up:</span>
          <span>{formatDate(new Date(order.pickedUpAt))}</span>
        </div>
      )}
      {order.returnedAt && (
        <div className="flex justify-between">
          <span>Returned:</span>
          <span>{formatDate(new Date(order.returnedAt))}</span>
        </div>
      )}
    </div>
  </InfoSection>
);

const OrderSummaryInfo: React.FC<{ order: OrderDetailData }> = ({ order }) => (
  <InfoSection
    icon={<ShoppingCart className="w-4 h-4 text-gray-600" />}
    title="Order Summary"
  >
    <div className="space-y-2 text-sm text-gray-600">
      <div className="flex justify-between">
        <span>Total Items:</span>
        <span>{order.totalItems || order.orderItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
      </div>
      {order.isRental && order.rentalDuration && (
        <div className="flex justify-between">
          <span>Duration:</span>
          <span>{order.rentalDuration} days</span>
        </div>
      )}
      <div className="flex justify-between">
        <span>Type:</span>
        <span>{order.orderType.replace('_', ' ')}</span>
      </div>
    </div>
  </InfoSection>
);

export const OrderOverview: React.FC<OrderOverviewProps> = ({ order }) => (
  <div className="space-y-6">
    {/* Customer and Outlet Info */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <CustomerInfo 
        customer={order.customer} 
        customerFullName={order.customerFullName} 
      />
      <OutletInfo outlet={order.outlet} />
    </div>

    <Separator className="my-6" />
    
    {/* Dates and Summary */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ImportantDates order={order} />
      <OrderSummaryInfo order={order} />
    </div>
  </div>
);
