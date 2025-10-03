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
import { formatCurrency } from '@rentalshop/ui';
import { ORDER_STATUS_COLORS } from '@rentalshop/constants';
import type { OrderWithDetails } from '@rentalshop/types';

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
import { useToasts } from '@rentalshop/ui';
import { ToastContainer } from '@rentalshop/ui';
import { CollectionReturnModal } from './components/CollectionReturnModal';
import { calculateCollectionTotal } from './utils';
import { ordersApi } from '@rentalshop/utils';

// Skeleton component for OrderDetail
const OrderDetailSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Skeleton */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Information Card Skeleton */}
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
          <div className="space-y-6">
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
  const { toasts, showSuccess, showError, showInfo, removeToast } = useToasts();
  
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
      showInfo('Saving...', 'Please wait while settings are being saved');
      
      try {
        await onSaveSettings(tempSettings);
        showSuccess('Settings Saved', 'Order settings have been updated successfully');
        setSettingsForm(tempSettings);
        setIsEditingSettings(false);
      } catch (error) {
        showError('Save Failed', 'Failed to save settings. Please try again.');
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
      showError('Print Error', 'Failed to start printing. Please try again.');
    }
  };

  const handlePickupOrder = async () => {
    try {
      setIsPickupLoading(true);
      await ordersApi.pickupOrder(order.id);
      showSuccess('Pickup Successful', 'Order pickup has been processed.');
      onStatusChange && onStatusChange(order.id, 'PICKUPED');
      setIsCollectionModalOpen(false); // Close modal after successful pickup
      
      // Trigger page refresh to update order data
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      showError('Pickup Failed', 'Failed to process order pickup. Please try again.');
    } finally {
      setIsPickupLoading(false);
    }
  };

  const handleReturnOrder = async () => {
    try {
      setIsReturnLoading(true);
      await ordersApi.returnOrder(order.id);
      showSuccess('Return Successful', 'Order return has been processed.');
      onStatusChange && onStatusChange(order.id, 'RETURNED');
      setIsReturnModalOpen(false); // Close modal after successful return
      
      // Trigger page refresh to update order data
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      showError('Return Failed', 'Failed to process order return. Please try again.');
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
      showSuccess('Cancellation Successful', 'Order has been cancelled.');
      onStatusChange && onStatusChange(order.id, 'CANCELLED');
      
      // Trigger page refresh to update order data
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      showError('Cancellation Failed', 'Failed to cancel order. Please try again.');
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
        showError('Edit Failed', 'Failed to enter edit mode. Please try again.');
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
        showError('Edit Failed', 'Failed to enter edit mode. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Order Details #{order.orderNumber}
              </h1>
              <p className="text-sm text-gray-600">
                View and manage order information
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Order Type Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Order Type:</span>
                <Badge 
                  className={order.orderType === 'RENT' 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }
                >
                  {order.orderType}
                </Badge>
              </div>
              {/* Order Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge 
                  className={ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] || 'bg-gray-100 text-gray-800'}
                >
                  {order.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Information & Products (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Information Card */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Order Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Order ID:</span>
                      <span className="text-sm font-medium">{order.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Customer Name:</span>
                      <span className="text-sm font-medium">
                        {order.customer?.firstName} {order.customer?.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Phone:</span>
                      <span className="text-sm font-medium">{order.customer?.phone || 'N/A'}</span>
                    </div>
                    {order.createdBy && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Created By:</span>
                        <span className="text-sm font-medium">
                          {order.createdBy?.name || 'Unknown'}
                        </span>
                      </div>
                    )}
                    
                  </div>

                  {/* Right Column */}
                  <div className="space-y-3">
                    {order.orderType === 'RENT' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Pickup Date:</span>
                          <span className="text-sm font-medium">
                            {order.pickupPlanAt ? new Date(order.pickupPlanAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Return Date:</span>
                          <span className="text-sm font-medium">
                            {order.returnPlanAt ? new Date(order.returnPlanAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Seller:</span>
                      <span className="text-sm font-medium">{order.outlet?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Order Date:</span>
                      <span className="text-sm font-medium">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Spacer to fill remaining height */}
                <div className="flex-1"></div>
              </CardContent>
            </Card>

            {/* Products Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.orderItems.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No products in this order</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {order.orderItems.map((item, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-start gap-3">
                          {/* Product Image */}
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          </div>
                          
                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm">
                              {item.product?.name || 'Unknown Product'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.product?.name ? `Product: ${item.product.name}` : 'Unknown Product'}
                            </div>
                            <div className="text-xs text-gray-600">
                              {formatCurrency(item.unitPrice)} x {item.quantity}
                            </div>
                            {(item as any).notes && (
                              <div className="text-xs text-gray-500 mt-1">
                                Notes: {(item as any).notes || 'No notes'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

                    {/* Right Column - Order Summary & Settings */}
          <div className="space-y-6">
            {/* Order Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(order.totalAmount || 0)}</span>
                </div>

                {/* Discount Display */}
                {(order as any).discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>
                      Discount {(order as any).discountType === 'percentage' && (order as any).discountValue 
                        ? `(${(order as any).discountValue}%)` 
                        : '(amount)'}:
                    </span>
                    <span className="font-medium">-{formatCurrency((order as any).discountAmount)}</span>
                  </div>
                )}

                {/* Deposit */}
                {order.orderType === 'RENT' && order.depositAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Deposit:</span>
                    <span className="font-medium">{formatCurrency(order.depositAmount)}</span>
                  </div>
                )}

                {/* Grand Total */}
                <div className="flex justify-between text-lg font-bold text-green-700 pt-2 border-t border-gray-200">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(order.totalAmount || 0)}</span>
                </div>

                {/* Collection Amount - Single field for RENT orders */}
                {order.orderType === 'RENT' && (
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="text-gray-600">Collection Amount:</span>
                    <span className={`font-medium ${
                      order.status === 'RESERVED' ? 'text-yellow-700' : 
                      order.status === 'PICKUPED' ? 'text-blue-700' : 
                      'text-gray-500'
                    }`}>
                      {order.status === 'RESERVED' ? (
                        <span className="flex items-center gap-2">
                          <span>{formatCurrency(calculateCollectionTotal(order, tempSettings))}</span>
                          {tempSettings.collateralType && tempSettings.collateralType !== 'Other' && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              + {tempSettings.collateralType}
                            </span>
                          )}
                          {tempSettings.collateralType === 'Other' && tempSettings.collateralDetails && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              + {tempSettings.collateralDetails}
                            </span>
                          )}
                          {tempSettings.collateralType === 'Other' && !tempSettings.collateralDetails && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              + Collateral
                            </span>
                          )}
                        </span>
                      ) : 
                       order.status === 'PICKUPED' ? 'Already collected' : 
                       'No collection needed'}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Order Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingSettings ? (
                  <>
                    {/* Damage Fee - Conditionally enabled based on order type and status */}
                    <div>
                      <Label htmlFor="damageFee" className="text-sm font-medium text-gray-700">
                        Damage Fee
                        {!isDamageFeeEnabled() && (
                          <span className="text-xs text-gray-500 ml-2">(Disabled for this order type/status)</span>
                        )}
                      </Label>
                      <Input
                        id="damageFee"
                        type="number"
                        min="0"
                        step="0.01"
                        value={tempSettings.damageFee || 0}
                        onChange={(e) => handleSettingsChange({ damageFee: parseFloat(e.target.value) || 0 })}
                        className="mt-1"
                        placeholder="0"
                        disabled={!isDamageFeeEnabled()}
                      />
                    </div>

                    {/* Security Deposit - Conditionally enabled based on order type and status */}
                    <div>
                      <Label htmlFor="securityDeposit" className="text-sm font-medium text-gray-700">
                        Security Deposit
                        {!isSecurityDepositEnabled() && (
                          <span className="text-xs text-gray-500 ml-2">(Disabled for this order type/status)</span>
                        )}
                      </Label>
                      <Input
                        id="securityDeposit"
                        type="number"
                        min="0"
                        step="0.01"
                        value={tempSettings.securityDeposit || 0}
                        onChange={(e) => handleSettingsChange({ securityDeposit: parseFloat(e.target.value) || 0 })}
                        className="mt-1"
                        placeholder="0"
                        disabled={!isSecurityDepositEnabled()}
                      />
                    </div>

                    {/* Collateral Type - Conditionally enabled based on order type and status */}
                    <div>
                      <Label htmlFor="collateralType" className="text-sm font-medium text-gray-700">
                        Collateral Type
                        {!isCollateralTypeEnabled() && (
                          <span className="text-xs text-gray-500 ml-2">(Disabled for this order type/status)</span>
                        )}
                      </Label>
                      <Select onValueChange={(value) => handleSettingsChange({ collateralType: value })} value={tempSettings.collateralType || ''} onOpenChange={() => setIsEditingSettings(true)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select collateral type" />
                        </SelectTrigger>
                        <SelectContent>
                          {COLLATERAL_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Collateral Details - Conditionally enabled based on order type and status */}
                    <div>
                      <Label htmlFor="collateralDetails" className="text-sm font-medium text-gray-700">
                        Collateral Details
                        {!isCollateralDetailsEnabled() && (
                          <span className="text-xs text-gray-500 ml-2">(Disabled for this order type/status)</span>
                        )}
                      </Label>
                      <Input
                        id="collateralDetails"
                        type="text"
                        value={tempSettings.collateralDetails || ''}
                        onChange={(e) => handleSettingsChange({ collateralDetails: e.target.value })}
                        className="mt-1"
                        placeholder="Enter collateral details"
                        disabled={!isCollateralDetailsEnabled()}
                      />
                    </div>

                    {/* Order Notes */}
                    <div>
                      <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                        Order Notes
                      </Label>
                      <Textarea
                        id="notes"
                        value={tempSettings.notes || ''}
                        onChange={(e) => handleSettingsChange({ notes: e.target.value })}
                        rows={3}
                        className="mt-1"
                        placeholder="Enter order notes"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={handleSaveSettings}
                        disabled={loading || isSavingSettings}
                        className="flex-1 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {isSavingSettings ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Display Mode */}
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Damage Fee:</span>
                        <span className="text-sm font-medium">
                          {isDamageFeeEnabled() 
                            ? formatCurrency(settingsForm.damageFee || 0)
                            : <span className="text-gray-400 italic">Disabled</span>
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Security Deposit:</span>
                        <span className="text-sm font-medium">
                          {isSecurityDepositEnabled() 
                            ? formatCurrency(settingsForm.securityDeposit || 0)
                            : <span className="text-gray-400 italic">Disabled</span>
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Collateral Type:</span>
                        <span className="text-sm font-medium">
                          {isCollateralTypeEnabled() 
                            ? (settingsForm.collateralType || 'Not specified')
                            : <span className="text-gray-400 italic">Disabled</span>
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Collateral Details:</span>
                        <span className="text-sm font-medium">
                          {isCollateralDetailsEnabled() 
                            ? (settingsForm.collateralDetails || 'No details')
                            : <span className="text-gray-400 italic">Disabled</span>
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Notes:</span>
                        <span className="text-sm font-medium">{settingsForm.notes || 'No notes'}</span>
                      </div>
                    </div>

                    {/* Edit Button */}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingSettings(true);
                        // No toast for entering edit mode - this is just a UI state change
                      }}
                      className="w-full flex items-center gap-2 mt-4"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Settings
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons - Bottom */}
        {showActions && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Order Actions</h3>
              
              {/* Actions Layout: Cancel on left, others on right */}
              <div className="flex justify-between items-center">
                {/* Left side - Cancel button */}
                <div>
                  {canCancel && (
                    <Button
                      variant="destructive"
                      onClick={handleCancelOrderClick}
                      className="px-6"
                      disabled={isCancelLoading}
                    >
                      <X className="w-4 h-4 mr-2" />
                      {isCancelLoading ? 'Cancelling...' : 'Cancel Order'}
                    </Button>
                  )}
                </div>

                {/* Right side - Other action buttons */}
                <div className="flex gap-3">
                  {/* Edit Order */}
                  {onEdit && (
                    <Button
                      variant="outline"
                      onClick={handleEditOrderWithSettings}
                      className="px-4"
                      disabled={!canEdit}
                      title={
                        !canEdit 
                          ? isRentOrder 
                            ? 'RENT orders can only be edited when status is RESERVED'
                            : 'SALE orders can only be edited when status is COMPLETED'
                          : 'Edit Order'
                      }
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Order
                    </Button>
                  )}

                  {/* Pickup Order - Only for RENT orders with RESERVED status */}
                  {canPickup && (
                    <Button
                      variant="default"
                      onClick={handlePickupClick}
                      className="px-6"
                      disabled={isPickupLoading}
                    >
                      <Package className="w-4 h-4 mr-2" />
                      {isPickupLoading ? 'Picking up...' : 'Pickup Order'}
                    </Button>
                  )}

                  {/* Return Order - Only for RENT orders with PICKUPED status */}
                  {canReturn && (
                    <Button
                      variant="default"
                      onClick={handleReturnClick}
                      className="px-4"
                      disabled={isReturnLoading}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {isReturnLoading ? 'Returning...' : 'Return Order'}
                    </Button>
                  )}

                  {/* Print Order - Always visible */}
                  {canPrint && (
                    <Button
                      variant="outline"
                      onClick={handlePrintOrder}
                      className="px-4"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print Order
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Edit Rules Information */}
              <div className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-700 mb-1">Editing Rules:</p>
                    <ul className="space-y-1 text-gray-600">
                      <li>• <strong>RENT orders</strong>: Can only be edited when status is <span className="font-mono bg-blue-100 px-1 rounded">RESERVED</span></li>
                      <li>• <strong>SALE orders</strong>: Can only be edited when status is <span className="font-mono bg-green-100 px-1 rounded">COMPLETED</span></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <ToastContainer toasts={toasts} onClose={removeToast} />
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
        title="Cancel Order"
        description={`Are you sure you want to cancel order #${order.orderNumber}? This action cannot be undone.`}
        confirmText="Cancel Order"
        cancelText="Keep Order"
        onConfirm={handleCancelOrder}
        onCancel={() => setShowCancelConfirmDialog(false)}
        isLoading={isCancelLoading}
      />
    </div>
  );
};