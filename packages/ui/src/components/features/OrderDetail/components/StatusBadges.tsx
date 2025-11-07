import React from 'react';
import { Badge } from '@rentalshop/ui/base';
import { OrderDetailData } from '@rentalshop/types';
import { 
  Clock, 
  CheckCircle, 
  Package, 
  XCircle 
} from 'lucide-react';
import { ORDER_STATUS_COLORS } from '@rentalshop/constants';

interface StatusBadgesProps {
  order: OrderDetailData;
}

const getStatusColor = (status: string) => {
  return ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS] || 'bg-gray-100 text-gray-800';
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
  // Calculate overdue status from order dates
  const isOverdue = order.status === 'PICKUPED' && order.returnPlanAt && new Date() > new Date(order.returnPlanAt);
  const daysOverdue = isOverdue && order.returnPlanAt 
    ? Math.ceil((new Date().getTime() - new Date(order.returnPlanAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700">Status:</span>
        <Badge 
          className={`px-3 py-1.5 text-sm font-medium border ${getStatusColor(order.status)}`}
        >
          <div className="flex items-center space-x-2">
            {getStatusIcon(order.status)}
            <span>{order.status.replace('_', ' ')}</span>
          </div>
        </Badge>
      </div>
      
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700">Type:</span>
        <Badge className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200">
          {order.orderType.replace('_', ' ')}
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
