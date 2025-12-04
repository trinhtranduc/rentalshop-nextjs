import React from 'react';
import { Separator } from '@rentalshop/ui';
import { OrderDetailData } from '@rentalshop/types';
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  ShoppingCart 
} from 'lucide-react';
import { formatDate } from '@rentalshop/utils';
import { VALIDATION } from '@rentalshop/constants';

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

const CustomerInfo: React.FC<{ customer: OrderDetailData['customer']; customerName?: string; customerPhone?: string }> = ({ 
  customer, 
  customerName,
  customerPhone
}) => (
  <InfoSection
    icon={<User className="w-4 h-4 text-gray-600" />}
    title="Customer"
  >
    <div className="space-y-2">
      <div className="font-medium text-gray-900">
        {customerName || (customer ? [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() : 'Guest Customer')}
      </div>
      {(customerPhone || (customer?.phone && customer.phone.trim() !== '')) && (
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Phone className="w-4 h-4" />
          <span>{customerPhone || customer?.phone}</span>
        </div>
      )}
      {/* Note: Email is not available in the customer type, using customerName from order instead */}
    </div>
  </InfoSection>
);

const OutletInfo: React.FC<{ outlet: OrderDetailData['outlet'] }> = ({ outlet }) => (
  <InfoSection
    icon={<MapPin className="w-4 h-4 text-gray-600" />}
    title="Outlet"
  >
    <div className="space-y-2">
      {outlet ? (
        <>
          <div className="font-medium text-gray-900">{outlet.name}</div>
          {outlet.address && (
            <div className="text-sm text-gray-600">{outlet.address}</div>
          )}
        </>
      ) : (
        <div className="text-sm text-gray-500">No outlet information available</div>
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
      {/* Order creation date - always displayed */}
      <div className="flex justify-between">
        <span>Created:</span>
        <span>{formatDate(new Date(order.createdAt))}</span>
      </div>
      
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
        <span>{order.orderItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
      </div>
      {order.orderType === 'RENT' && order.pickupPlanAt && order.returnPlanAt && (
        <div className="flex justify-between">
          <span>Duration:</span>
          <span>
            {(() => {
              const days = Math.ceil((new Date(order.returnPlanAt).getTime() - new Date(order.pickupPlanAt).getTime()) / (1000 * 60 * 60 * 24));
              if (days < VALIDATION.MIN_RENTAL_DAYS) {
                return `${days} days (Minimum: ${VALIDATION.MIN_RENTAL_DAYS} day)`;
              } else if (days > VALIDATION.MAX_RENTAL_DAYS) {
                return `${days} days (Maximum: ${VALIDATION.MAX_RENTAL_DAYS} days)`;
              }
              return `${days} days`;
            })()}
          </span>
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
        customerName={order.customerName}
        customerPhone={order.customerPhone}
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
