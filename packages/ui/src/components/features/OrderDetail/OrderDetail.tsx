'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Button,
  Badge,
  Input,
  Label,
  Textarea,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ConfirmationDialog
} from '@rentalshop/ui';
import { useFormattedFullDate } from '@rentalshop/utils';
import { 
  Info, 
  Package, 
  DollarSign, 
  Settings, 
  Edit3, 
  Save, 
  X,
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  RotateCcw,
  Printer,
  Edit,
  Calculator
} from 'lucide-react';
import { useFormatCurrency, useToast } from '@rentalshop/ui';
import { getOrderStatusClassName, ORDER_TYPE_COLORS, ORDER_TYPES, ORDER_STATUSES } from '@rentalshop/constants';
import { useOrderTranslations } from '@rentalshop/hooks';
import type { OrderWithDetails } from '@rentalshop/types';
import { CollectionReturnModal } from './components/CollectionReturnModal';
import { OrderInformation } from './components/OrderInformation';
import { OrderProductsList } from './components/OrderProductsList';
import { OrderSummaryCard } from './components/OrderSummaryCard';
import { OrderSettingsCard } from './components/OrderSettingsCard';
import { OrderActionsSection } from './components/OrderActionsSection';
import { calculateCollectionTotal } from './utils';
import { ordersApi } from '@rentalshop/utils';

// Define OrderDetailProps interface locally
interface OrderDetailProps {
  order: OrderWithDetails;
  onEdit?: (order: OrderWithDetails) => void;
  onCancel?: (order: OrderWithDetails) => void;
  onStatusChange?: (orderId: number, status: string) => void;
  onPickup?: (orderId: number, data: any) => void;
  onReturn?: (orderId: number, data: any) => void;
  onSaveSettings?: (settings: SettingsForm) => Promise<void>;
  loading?: boolean;
  showActions?: boolean;
}

// Define SettingsForm interface locally
interface SettingsForm {
  damageFee: number;
  securityDeposit: number;
  collateralType: string;
  collateralDetails: string;
  notes: string;
}

// Skeleton component for OrderDetail
const OrderDetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
        {/* Header Skeleton */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </div>

        {/* Main Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column Skeleton */}
          <div className="lg:col-span-2 space-y-4">
            {/* Order Information Card Skeleton */}
            <div>
              <Card className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column Skeleton */}
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ))}
                  </div>
                  {/* Right Column Skeleton */}
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="flex justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1"></div>
              </CardContent>
              </Card>
            </div>

            {/* Products Card Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-start gap-3">
                        <Skeleton className="w-12 h-12 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column Skeleton */}
          <div className="space-y-4">
            {/* Order Summary Card Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-6 w-28" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Settings Card Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-6 w-28" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons Skeleton */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-10 w-32" />
              <div className="flex gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-24" />
                ))}
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};

export const OrderDetail: React.FC<OrderDetailProps> = ({
  order,
  onEdit,
  onCancel,
  onStatusChange,
  onPickup,
  onReturn,
  onSaveSettings,
  loading = false,
  showActions = true
}) => {
  // Use formatCurrency hook - automatically uses merchant's currency
  const formatMoney = useFormatCurrency();
  const { toastSuccess, toastError, toastInfo, removeToast } = useToast();
  const t = useOrderTranslations();
  
  // Predefined collateral types
  const COLLATERAL_TYPES = [
    'ID Card',
    'Driver License', 
    'Passport',
    'Other'
  ];
  
  const [settingsForm, setSettingsForm] = useState<SettingsForm>({
    damageFee: order.damageFee || 0,
    securityDeposit: order.securityDeposit || 0,
    collateralType: order.collateralType || 'Other',
    collateralDetails: order.collateralDetails || '',
    notes: order.notes || ''
  });
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState<SettingsForm>(settingsForm);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  // Collection and Return Modal state
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  
  // Loading states for actions
  const [isPickupLoading, setIsPickupLoading] = useState(false);
  const [isReturnLoading, setIsReturnLoading] = useState(false);
  const [isCancelLoading, setIsCancelLoading] = useState(false);
  
  // Confirmation dialog state
  const [showCancelConfirmDialog, setShowCancelConfirmDialog] = useState(false);
  
  // Update settings when order changes
  useEffect(() => {
    if (order) {
      const newSettings: SettingsForm = {
        damageFee: order.damageFee || 0,
        securityDeposit: order.securityDeposit || 0,
        collateralType: order.collateralType || 'Other',
        collateralDetails: order.collateralDetails || '',
        notes: order.notes || ''
      };
      setSettingsForm(newSettings);
      setTempSettings(newSettings);
    }
  }, [order]);
  
  // Show skeleton loading when loading is true
  if (loading) {
    return <OrderDetailSkeleton />;
  }

  // ============================================================================
  // ORDER TYPE & STATUS LOGIC
  // ============================================================================
  
  // Determine if order is RENT type
  const isRentOrder = order.orderType === 'RENT';
  
  // Determine if order is SALE type
  const isSaleOrder = order.orderType === 'SALE';
  
  // Get current order status
  const currentStatus = order.status;
  
  // ============================================================================
  // BUTTON VISIBILITY LOGIC
  // ============================================================================
  
  // Cancel button visibility
  const canCancel = onCancel && 
    currentStatus !== 'PICKUPED' && 
    currentStatus !== 'RETURNED' && 
    currentStatus !== 'CANCELLED';
  
  // Edit button visibility - based on order type and status
  const canEdit = onEdit && (
    // RENT orders: can only edit when RESERVED
    (isRentOrder && currentStatus === 'RESERVED') ||
    // SALE orders: can only edit when COMPLETED
    (isSaleOrder && currentStatus === 'COMPLETED')
  );
  
  // Pickup button visibility (RENT orders only)
  const canPickup = onPickup && 
    isRentOrder && 
    currentStatus === 'RESERVED';
  
  // Return button visibility (RENT orders only)
  const canReturn = onReturn && 
    isRentOrder && 
    currentStatus === 'PICKUPED';
  
  // Print button visibility (always visible)
  const canPrint = true;
  
  // ============================================================================
  // FIELD ENABLEMENT LOGIC
  // ============================================================================
  
  // Damage fee enablement logic
  const isDamageFeeEnabled = () => {
    if (isSaleOrder) return false; // SALE orders don't have damage fees
    
    if (isRentOrder) {
      switch (currentStatus) {
        case 'RESERVED':
          return false; // Disable for reserved orders
        case 'PICKUPED':
        case 'RETURNED':
          return true; // Enable for picked up and returned orders
        default:
          return false;
      }
    }
    
    return false;
  };
  
  // Security deposit enablement logic
  const isSecurityDepositEnabled = () => {
    if (isSaleOrder) return false; // SALE orders don't have security deposits
    
    if (isRentOrder) {
      switch (currentStatus) {
        case 'RESERVED':
        case 'PICKUPED':
        case 'RETURNED':
          return true; // Always enable for RENT orders
        default:
          return false;
      }
    }
    
    return false;
  };
  
  // Collateral type enablement logic
  const isCollateralTypeEnabled = () => {
    if (isSaleOrder) return false; // SALE orders don't have collateral
    
    if (isRentOrder) {
      switch (currentStatus) {
        case 'RESERVED':
        case 'PICKUPED':
        case 'RETURNED':
          return true; // Always enable for RENT orders
        default:
          return false;
      }
    }
    
    return false;
  };
  
  // Collateral details enablement logic
  const isCollateralDetailsEnabled = () => {
    if (isSaleOrder) return false; // SALE orders don't have collateral
    
    if (isRentOrder) {
      switch (currentStatus) {
        case 'RESERVED':
        case 'PICKUPED':
        case 'RETURNED':
          return true; // Always enable for RENT orders
        default:
          return false;
      }
    }
    
    return false;
  };

  const handleSettingsChange = (updates: Partial<SettingsForm>) => {
    setTempSettings(prev => ({ ...prev, ...updates }));
    
    // No toast for every change - only show feedback when saving
  };

  const handleSaveSettings = async () => {
    if (onSaveSettings) {
      setIsSavingSettings(true);
      toastInfo('Saving...', 'Please wait while settings are being saved');
      
      try {
        await onSaveSettings(tempSettings);
        toastSuccess(t('detail.settingsSaved'), t('detail.settingsSavedMessage'));
        setSettingsForm(tempSettings);
        setIsEditingSettings(false);
      } catch (error) {
        toastError(t('detail.saveFailed'), t('detail.saveFailedMessage'));
      } finally {
        setIsSavingSettings(false);
      }
    } else {
      // No API call, just local update
      setSettingsForm(tempSettings);
      setIsEditingSettings(false);
    }
  };

  const handleCancelEdit = () => {
    setTempSettings(settingsForm);
    setIsEditingSettings(false);
    // No toast for cancelling edit - this is just a UI state change
  };

  const handlePrintOrder = () => {
    try {
      window.print();
      // No toast for print - this is a browser action, not an API call
    } catch (error) {
      toastError('Print Error', 'Failed to start printing. Please try again.');
    }
  };

  const handlePickupOrder = async () => {
    try {
      setIsPickupLoading(true);
      await ordersApi.pickupOrder(order.id);
      toastSuccess('Pickup Successful', 'Order pickup has been processed.');
      onStatusChange && onStatusChange(order.id, 'PICKUPED');
      setIsCollectionModalOpen(false); // Close modal after successful pickup
      
      // Trigger page refresh to update order data
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      toastError('Pickup Failed', 'Failed to process order pickup. Please try again.');
    } finally {
      setIsPickupLoading(false);
    }
  };

  const handleReturnOrder = async () => {
    try {
      setIsReturnLoading(true);
      await ordersApi.returnOrder(order.id);
      toastSuccess('Return Successful', 'Order return has been processed.');
      onStatusChange && onStatusChange(order.id, 'RETURNED');
      setIsReturnModalOpen(false); // Close modal after successful return
      
      // Trigger page refresh to update order data
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      toastError('Return Failed', 'Failed to process order return. Please try again.');
    } finally {
      setIsReturnLoading(false);
    }
  };

  const handleCancelOrderClick = () => {
    setShowCancelConfirmDialog(true);
  };

  const handleCancelOrder = async () => {
    try {
      setIsCancelLoading(true);
      await ordersApi.cancelOrder(order.id);
      toastSuccess('Cancellation Successful', 'Order has been cancelled.');
      onStatusChange && onStatusChange(order.id, 'CANCELLED');
      
      // Trigger page refresh to update order data
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      toastError('Cancellation Failed', 'Failed to cancel order. Please try again.');
    } finally {
      setIsCancelLoading(false);
      setShowCancelConfirmDialog(false);
    }
  };

  // Open collection modal for pickup
  const handlePickupClick = () => {
    setIsCollectionModalOpen(true);
  };

  // Open return modal for return
  const handleReturnClick = () => {
    setIsReturnModalOpen(true);
  };

  const handleEditOrder = () => {
    if (onEdit) {
      try {
        onEdit(order);
        // No toast for entering edit mode - this is just a UI state change
      } catch (error) {
        toastError('Edit Failed', 'Failed to enter edit mode. Please try again.');
      }
    }
  };

  // Enhanced edit function that includes settings
  const handleEditOrderWithSettings = () => {
    if (onEdit) {
      try {
        // Create an enhanced order object with current settings
        const enhancedOrder = {
          ...order,
          damageFee: tempSettings.damageFee,
          securityDeposit: tempSettings.securityDeposit,
          collateralType: tempSettings.collateralType,
          collateralDetails: tempSettings.collateralDetails,
          notes: tempSettings.notes
        };
        
        onEdit(enhancedOrder);
        // No toast for entering edit mode - this is just a UI state change
      } catch (error) {
        toastError('Edit Failed', 'Failed to enter edit mode. Please try again.');
      }
    }
  };

  return (
    <div className="space-y-4">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('orderDetails')} #{order.orderNumber}
              </h1>
              <p className="text-sm text-gray-600">
                {t('detail.viewAndManage')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Order Type Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{t('orderType.label')}:</span>
                <Badge 
                  className={ORDER_TYPE_COLORS[order.orderType as keyof typeof ORDER_TYPE_COLORS]}
                >
                  {t(`orderType.${order.orderType}`)}
                </Badge>
              </div>
              {/* Order Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{t('status.label')}:</span>
                <Badge 
                  className={getOrderStatusClassName(order.status)}
                >
                  {t(`status.${order.status}`)}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-screen">
          {/* Left Column - Order Information & Products (2/3 width) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Order Information Card - Using new component with translations */}
            <OrderInformation order={order} />

            {/* Products List - Using new component with translations */}
            <OrderProductsList order={order} />
          </div>

                    {/* Right Column - Order Summary & Settings */}
          <div className="space-y-6">
            {/* Order Summary Card - Using new component with translations */}
            <OrderSummaryCard 
              order={order} 
              tempSettings={tempSettings}
              calculateCollectionTotal={calculateCollectionTotal}
            />

            {/* Order Settings Card - Using new component with translations */}
            <OrderSettingsCard
              order={order}
              settingsForm={settingsForm}
              tempSettings={tempSettings}
              isEditingSettings={isEditingSettings}
              isSavingSettings={isSavingSettings}
              loading={loading}
              isDamageFeeEnabled={isDamageFeeEnabled}
              isSecurityDepositEnabled={isSecurityDepositEnabled}
              isCollateralTypeEnabled={isCollateralTypeEnabled}
              isCollateralDetailsEnabled={isCollateralDetailsEnabled}
              onSettingsChange={handleSettingsChange}
              onSaveSettings={handleSaveSettings}
              onCancelEdit={handleCancelEdit}
              onStartEdit={() => setIsEditingSettings(true)}
              collateralTypes={COLLATERAL_TYPES}
                      />
                    </div>
                    </div>

        {/* Action Buttons - Using new component with translations */}
        {showActions && (
          <OrderActionsSection
            order={order}
            canEdit={canEdit}
            canCancel={canCancel}
            canPickup={canPickup}
            canReturn={canReturn}
            canPrint={canPrint}
            isRentOrder={isRentOrder}
            isSaleOrder={isSaleOrder}
            isPickupLoading={isPickupLoading}
            isReturnLoading={isReturnLoading}
            isCancelLoading={isCancelLoading}
            onEdit={handleEditOrderWithSettings}
            onCancel={handleCancelOrderClick}
            onPickup={handlePickupClick}
            onReturn={handleReturnClick}
            onPrint={handlePrintOrder}
          />
        )}
      
      {/* Collection Modal */}
      <CollectionReturnModal
        isOpen={isCollectionModalOpen}
        onClose={() => setIsCollectionModalOpen(false)}
        order={order}
        settingsForm={tempSettings}
        mode="collection"
        onConfirmPickup={handlePickupOrder}
      />

      {/* Return Modal */}
      <CollectionReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        order={order}
        settingsForm={tempSettings}
        mode="return"
        onConfirmReturn={handleReturnOrder}
      />

      {/* Cancel Order Confirmation Dialog */}
      <ConfirmationDialog
        open={showCancelConfirmDialog}
        onOpenChange={setShowCancelConfirmDialog}
        type="danger"
        title={t('detail.cancelOrderTitle')}
        description={t('detail.cancelOrderMessage')}
        confirmText={t('actions.cancelOrder')}
        cancelText={t('detail.keepOrder')}
        onConfirm={handleCancelOrder}
        onCancel={() => setShowCancelConfirmDialog(false)}
        isLoading={isCancelLoading}
      />
    </div>
  );
};