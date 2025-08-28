import { OrderData, SettingsForm } from '@rentalshop/types';
import * as CONSTANTS from '@rentalshop/constants';

export const getStatusColor = (status: string): string => {
  return CONSTANTS.ORDER_STATUS_COLORS[status as keyof typeof CONSTANTS.ORDER_STATUS_COLORS] || 'bg-gray-100 text-gray-800';
};

export const getOrderTypeColor = (type: string): string => {
  const typeColors: Record<string, string> = {
    'RENT': 'bg-blue-100 text-blue-800',
    'SALE': 'bg-green-100 text-green-800',
    'RENT_TO_OWN': 'bg-purple-100 text-purple-800'
  };
  return typeColors[type] || 'bg-gray-100 text-gray-800';
};

export const calculateCollectionAmount = (order: OrderData, settingsForm: SettingsForm): number => {
  if (order.orderType === 'SALE') {
    return order.totalAmount;
  }
  
  switch (order.status) {
    case 'BOOKED':
      return order.depositAmount;
    case 'ACTIVE':
      return order.totalAmount - order.depositAmount;
    case 'RETURNED':
      return 0;
    default:
      return 0;
  }
};

export const getCollectionTitle = (order: OrderData): string => {
  if (order.orderType === 'SALE') {
    return 'Collect from customer';
  }
  
  switch (order.status) {
    case 'BOOKED':
      return 'Collect from customer';
    case 'ACTIVE':
      return 'Collect rental fee';
    case 'RETURNED':
      return 'No collection';
    default:
      return 'No collection';
  }
};