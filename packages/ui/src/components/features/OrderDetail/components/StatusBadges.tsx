import React from 'react';
import { Badge } from '@rentalshop/ui';
import { OrderDetailData } from '@rentalshop/types';
import { 
  Clock, 
  CheckCircle, 
  Package, 
  XCircle 
} from 'lucide-react';

interface StatusBadgesProps {
  order: OrderDetailData;
}

const getStatusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'CONFIRMED':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'ACTIVE':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'OVERDUE':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return <Clock className="w-4 h-4" />;
    case 'CONFIRMED':
      return <CheckCircle className="w-4 h-4" />;
    case 'ACTIVE':
      return <Package className="w-4 h-4" />;
    case 'COMPLETED':
      return <CheckCircle className="w-4 h-4" />;
    case 'CANCELLED':
      return <XCircle className="w-4 h-4" />;
    case 'OVERDUE':
      return <Clock className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

export const StatusBadges: React.FC<StatusBadgesProps> = ({ order }) => {
  // Calculate overdue status from order dates
  const isOverdue = order.status === 'ACTIVE' && order.returnPlanAt && new Date() > new Date(order.returnPlanAt);
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
