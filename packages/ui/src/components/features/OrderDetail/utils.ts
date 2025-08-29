import { OrderData, OrderDetailData, SettingsForm } from '@rentalshop/types';
import * as CONSTANTS from '@rentalshop/constants';

// Type definitions for calculation items
interface CalculationItem {
  label: string;
  value: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  isReturn?: boolean;
  isNegative?: boolean;
  isCollateral?: boolean;
  collateralInfo?: string;
}

// Centralized calculation function to ensure consistency
export const calculateCollectionTotal = (order: OrderDetailData, settingsForm: SettingsForm): number => {
  if (order.orderType === 'SALE') {
    return order.totalAmount;
  }
  
  // For RENT orders: remaining amount + security deposit
  const remainingAmount = order.totalAmount - order.depositAmount;
  const securityDeposit = settingsForm.securityDeposit || 0;
  return remainingAmount + securityDeposit;
};

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

// Collection calculation - USER'S ORIGINAL LOGIC
export const calculateCollectionAmount = (order: OrderDetailData, settingsForm: SettingsForm): number => {
  return calculateCollectionTotal(order, settingsForm);
};

// Collection title - USER'S ORIGINAL LOGIC
export const getCollectionTitle = (order: OrderDetailData): string => {
  if (order.orderType === 'SALE') {
    return 'Collect from customer';
  }
  
  switch (order.status) {
    case 'RESERVED':
      return 'Collect from customer';
    case 'PICKUPED':
      return 'No collection needed';
    case 'RETURNED':
      return 'No collection needed';
    default:
      return 'No collection';
  }
};

// Return amount calculation - USER'S ORIGINAL LOGIC
export const calculateReturnAmount = (order: OrderDetailData, settingsForm: SettingsForm): number => {
  if (order.orderType === 'SALE') {
    // Sale orders don't have returns
    return 0;
  }
  
  // For rent orders - USER'S ORIGINAL LOGIC
  switch (order.status) {
    case 'PICKUPED':
      // When returning, calculate what to return to customer
      const securityDeposit = settingsForm.securityDeposit || 0;
      const damageFee = settingsForm.damageFee || 0;
      return securityDeposit - damageFee; // Return security deposit minus damage fee
      
    case 'RETURNED':
      // Already returned
      return 0;
      
    default:
      return 0;
  }
};

// Return title - USER'S ORIGINAL LOGIC
export const getReturnTitle = (order: OrderDetailData): string => {
  if (order.orderType === 'SALE') {
    return 'No return needed';
  }
  
  switch (order.status) {
    case 'PICKUPED':
      return 'Return to customer';
    case 'RETURNED':
      return 'Already returned';
    default:
      return 'No return needed';
  }
};

// Collection details - Focus on WHAT TO COLLECT and HOW IT'S CALCULATED
export const getCollectionDetails = (order: OrderDetailData, settingsForm: SettingsForm) => {
  if (order.orderType === 'SALE') {
    return {
      title: 'Sale Order - What to Collect',
      description: 'Collect the full sale amount',
      calculation: [
        {
          label: 'Collect from customer',
          value: order.totalAmount,
          isTotal: true
        }
      ]
    };
  }
  
  // For rent orders - Show calculation breakdown
  switch (order.status) {
    case 'RESERVED':
      const remainingAmount = order.totalAmount - order.depositAmount;
      const securityDeposit = settingsForm.securityDeposit || 0;
      const collectionTotal = calculateCollectionTotal(order, settingsForm);
      const hasCollateral = settingsForm.collateralType && settingsForm.collateralType.trim() !== '';
      
      return {
        title: 'Rental Order - What to Collect',
        description: hasCollateral 
          ? 'Collect remaining amount, security deposit, and collateral'
          : 'Collect remaining amount plus security deposit',
        calculation: [
          {
            label: 'Total amount',
            value: order.totalAmount
          },
          {
            label: 'Deposit paid',
            value: -order.depositAmount,
            isNegative: true
          },
          {
            label: 'Security deposit',
            value: securityDeposit
          },
          ...(hasCollateral ? [
            {
              label: 'Collateral type',
              value: 0,
              isCollateral: true,
              collateralInfo: `${settingsForm.collateralType}${settingsForm.collateralDetails ? ` - ${settingsForm.collateralDetails}` : ''}`
            }
          ] : []),
          {
            label: 'Collect from customer',
            value: collectionTotal,
            isTotal: true,
            isCollateral: hasCollateral
          }
        ]
      };
      
    case 'PICKUPED':
      return {
        title: 'No Collection Needed',
        description: 'Order is already picked up',
        calculation: []
      };
      
    case 'RETURNED':
      return {
        title: 'Order Completed',
        description: 'Order has been returned',
        calculation: []
      };
      
    default:
      return {
        title: 'No Collection',
        description: 'No collection required',
        calculation: []
      };
  }
};

// Return details - Focus on WHAT TO RETURN and HOW IT'S CALCULATED
export const getReturnDetails = (order: OrderDetailData, settingsForm: SettingsForm) => {
  if (order.orderType === 'SALE') {
    return {
      title: 'No Return Needed',
      description: 'Sale orders do not require returns',
      calculation: []
    };
  }
  
  // For rent orders - Show calculation breakdown
  switch (order.status) {
    case 'PICKUPED':
      const securityDeposit = settingsForm.securityDeposit || 0;
      const damageFee = settingsForm.damageFee || 0;
      const returnAmount = securityDeposit - damageFee;
      
      return {
        title: 'Rental Order - What to Return',
        description: 'Return security deposit minus damage fees',
        calculation: [
          {
            label: 'Security deposit',
            value: securityDeposit
          },
          {
            label: 'Damage fee',
            value: -damageFee,
            isNegative: true
          },
          {
            label: 'Return to customer',
            value: returnAmount,
            isTotal: true,
            isReturn: true
          }
        ]
      };
      
    case 'RETURNED':
      return {
        title: 'Already Returned',
        description: 'Order has already been returned',
        calculation: []
      };
      
    default:
      return {
        title: 'No Return Needed',
        description: 'No return required',
        calculation: []
      };
  }
};