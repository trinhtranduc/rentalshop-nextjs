import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  Button,
  Badge
} from '@rentalshop/ui/base';
import { Calculator, Info, DollarSign, Package, RotateCcw } from 'lucide-react';
import { formatCurrency } from '@rentalshop/ui/base';
import { OrderWithDetails } from '@rentalshop/types';

// Define SettingsForm interface locally
interface SettingsForm {
  damageFee: number;
  securityDeposit: number;
  collateralType: string;
  collateralDetails: string;
  notes: string;
}
import { 
  getCollectionDetails, 
  getReturnDetails 
} from '../utils';

interface CollectionReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderWithDetails;
  settingsForm: SettingsForm;
  mode: 'collection' | 'return';
  onConfirmPickup?: () => void;
  onConfirmReturn?: () => void;
}

export const CollectionReturnModal: React.FC<CollectionReturnModalProps> = ({
  isOpen,
  onClose,
  order,
  settingsForm,
  mode,
  onConfirmPickup,
  onConfirmReturn
}) => {
  const isCollectionMode = mode === 'collection';
  const isReturnMode = mode === 'return';
  
  // Get the appropriate details based on mode
  const details = isCollectionMode 
    ? getCollectionDetails(order, settingsForm)
    : getReturnDetails(order, settingsForm);

  const getModalTitle = () => {
    if (isCollectionMode) {
      return 'Pickup Order - Collection Details';
    }
    return 'Return Order - Return Details';
  };

  const getModalIcon = () => {
    if (isCollectionMode) {
      return <Package className="w-5 h-5 text-green-600" />;
    }
    return <RotateCcw className="w-5 h-5 text-blue-700" />;
  };

  const getActionButtonText = () => {
    if (isCollectionMode) {
      return 'Confirm Pickup & Collect';
    }
    return 'Confirm Return & Process Refund';
  };

  const handleConfirm = async () => {
    try {
      if (isCollectionMode && onConfirmPickup) {
        await onConfirmPickup();
      } else if (isReturnMode && onConfirmReturn) {
        await onConfirmReturn();
      }
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Error in modal confirmation:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getModalIcon()}
            <span className="font-semibold">{getModalTitle()}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Order Info Header */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Order #{order.orderNumber}</span>
              <Badge variant={order.orderType === 'RENT' ? 'default' : 'secondary'}>
                {order.orderType}
              </Badge>
            </div>
            <div className="text-sm text-gray-600">
              Customer: {order.customer?.firstName} {order.customer?.lastName}
            </div>
            <div className="text-sm text-gray-600">
              Status: {order.status}
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-4">
            {/* Clean Collection/Return Summary */}
            <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isCollectionMode ? 'Collect from Customer' : 'Return to Customer'}
            </h3>
              
              {/* Simple one-line summary */}
              {details.calculation && details.calculation.length > 0 && (
                <div className="text-xl font-bold text-green-700 bg-green-50 rounded-lg p-4 border border-green-200">
                  <span>
                    {details.calculation.find(item => (item as any).isTotal)?.value !== undefined 
                      ? formatCurrency(details.calculation.find(item => (item as any).isTotal)?.value || 0)
                      : '0.00'
                    }
                  </span>
                  {/* Only show collateral if it actually exists and has a value */}
                  {settingsForm.collateralType && 
                   settingsForm.collateralType !== 'Other' && 
                   settingsForm.collateralType.trim() !== '' && (
                    <span className="ml-2 text-lg font-normal text-blue-700">
                      + {settingsForm.collateralType}
                    </span>
                  )}
                  {settingsForm.collateralType === 'Other' && 
                   settingsForm.collateralDetails && 
                   settingsForm.collateralDetails.trim() !== '' && (
                    <span className="ml-2 text-lg font-normal text-blue-700">
                      + {settingsForm.collateralDetails}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {details.calculation && details.calculation.length > 0 && (
            <Button onClick={handleConfirm}>
              {getActionButtonText()}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
