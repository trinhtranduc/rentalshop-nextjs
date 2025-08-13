import React from 'react';
import { Button } from '../../../ui/button';
import { Edit } from 'lucide-react';
import { OrderData } from '../types';

interface OrderHeaderProps {
  order: OrderData;
  showActions: boolean;
  onEdit?: () => void;
  onCancel?: (order: OrderData) => void;
  loading: boolean;
}

export const OrderHeader: React.FC<OrderHeaderProps> = ({ 
  order, 
  showActions, 
  onEdit, 
  onCancel, 
  loading 
}) => (
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        Order #{order.orderNumber}
      </h1>
      <p className="text-sm text-gray-600 mt-1">
        {order.orderType.replace('_', ' ')} • {order.totalItems || order.orderItems.reduce((sum, item) => sum + item.quantity, 0)} items
      </p>
    </div>
    
    {showActions && onEdit && (
      <Button variant="outline" onClick={onEdit} disabled={loading} size="sm">
        <Edit className="w-4 h-4 mr-2" />
        Edit
      </Button>
    )}
  </div>
);
