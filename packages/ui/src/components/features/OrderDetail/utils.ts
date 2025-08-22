import { OrderData, SettingsForm } from '@rentalshop/types';

export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'CONFIRMED': 'bg-blue-100 text-blue-800',
    'ACTIVE': 'bg-green-100 text-green-800',
    'COMPLETED': 'bg-gray-100 text-gray-800',
    'CANCELLED': 'bg-red-100 text-red-800',
    'OVERDUE': 'bg-orange-100 text-orange-800',
    'DAMAGED': 'bg-red-100 text-red-800',
    'DRAFT': 'bg-gray-100 text-gray-800',
    'RESERVED': 'bg-red-100 text-red-800',
    'PICKUP': 'bg-orange-100 text-orange-800',
    'RETURNED': 'bg-green-100 text-green-800'
  };
  return statusColors[status] || 'bg-gray-100 text-gray-800';
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
    case 'DRAFT':
      return order.depositAmount;
    case 'RESERVED':
      return order.totalAmount - order.depositAmount + (settingsForm.bailAmount || 0);
    case 'PICKUP':
      return -((settingsForm.bailAmount || 0) - (settingsForm.damageFee || 0));
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
    case 'DRAFT':
    case 'RESERVED':
      return 'Collect from customer';
    case 'PICKUP':
      return 'Return to customer';
    case 'RETURNED':
      return 'No collection';
    default:
      return 'No collection';
  }
};