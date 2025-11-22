import React from 'react';
import { Badge } from '@rentalshop/ui';
import { OrderDetailData } from '@rentalshop/types';
import { 
  Clock, 
  CheckCircle, 
  Package, 
  XCircle 
} from 'lucide-react';
import { getOrderStatusClassName } from '@rentalshop/constants';

interface StatusBadgesProps {
  order: OrderDetailData;
}

const getStatusColor = (status: string) => {
  return getOrderStatusClassName(status);
};

const getStatusIcon = (status: string) => {
  switch (status.toUpperCase()) {
    case 'RESERVED':
      return <CheckCircle className="w-4 h-4" />;
    case 'PICKUPED':
      return <Package className="w-4 h-4" />;
    case 'COMPLETED':
      return <CheckCircle className="w-4 h-4" />;
    case 'CANCELLED':
      return <XCircle className="w-4 h-4" />;
    case 'RETURNED':
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

export const StatusBadges: React.FC<StatusBadgesProps> = ({ order }) => {
  const orderData = order.order;
  // Calculate overdue status from order dates
  const isOverdue = orderData.status === 'PICKUPED' && orderData.returnPlanAt && new Date() > new Date(orderData.returnPlanAt);
  const daysOverdue = isOverdue && orderData.returnPlanAt 
    ? Math.ceil((new Date().getTime() - new Date(orderData.returnPlanAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700">Status:</span>
        <Badge 
          className={`px-3 py-1.5 text-sm font-medium border ${getStatusColor(orderData.status)}`}
        >
          <div className="flex items-center space-x-2">
            {getStatusIcon(orderData.status)}
            <span>{orderData.status.replace('_', ' ')}</span>
          </div>
        </Badge>
      </div>
      
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700">Type:</span>
        <Badge className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200">
          {orderData.orderType.replace('_', ' ')}
        </Badge>
      </div>
      
      {isOverdue && daysOverdue > 0 && (
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Overdue:</span>
          <Badge className="px-3 py-1.5 text-sm font-medium bg-red-100 text-red-800 border border-red-200">
            {daysOverdue} days
          </Badge>
        </div>
      )}
    </div>
  );
};
