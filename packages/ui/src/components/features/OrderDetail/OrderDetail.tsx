import React, { useState } from 'react';
import { TrendingUp, Package, DollarSign, User, MapPin, Info, Settings, Save, Edit, X, RotateCcw, Printer } from 'lucide-react';
import { OrderDetailProps, SettingsForm } from '@rentalshop/types';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Label, Textarea, Badge, useToasts, ToastContainer, Skeleton, CardSkeleton } from '@rentalshop/ui';
import { formatCurrency } from '@rentalshop/utils';

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
  const [settingsForm, setSettingsForm] = useState<SettingsForm>({
    damageFee: order.damageFee || 0,
    securityDeposit: order.securityDeposit || 0,
    collateralType: order.collateralType || '',
    collateralDetails: order.collateralDetails || '',
    notes: order.notes || ''
  });
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState<SettingsForm>(settingsForm);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  // Show skeleton loading when loading is true
  if (loading) {
    return <OrderDetailSkeleton />;
  }

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

  const handlePickupOrder = () => {
    if (onPickup) {
      try {
        onPickup(order.id);
        // Success toast will be handled by the parent component after API call
      } catch (error) {
        showError('Pickup Failed', 'Failed to process order pickup. Please try again.');
      }
    }
  };

  const handleReturnOrder = () => {
    if (onReturn) {
      try {
        onReturn(order.id);
        // Success toast will be handled by the parent component after API call
      } catch (error) {
        showError('Return Failed', 'Failed to process order return. Please try again.');
      }
    }
  };

  const handleCancelOrder = () => {
    if (onCancel) {
      try {
        onCancel(order);
        // Success toast will be handled by the parent component after API call
      } catch (error) {
        showError('Cancellation Failed', 'Failed to cancel order. Please try again.');
      }
    }
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
                <Badge variant={order.orderType === 'RENT' ? 'default' : 'secondary'}>
                  {order.orderType === 'RENT' ? 'RENT' : 'SALE'}
                </Badge>
              </div>
              {/* Deposit Status */}
              {order.orderType === 'RENT' && order.depositAmount > 0 && (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  DEPOSITED
                </Badge>
              )}
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
                              {item.productName || 'Unknown Product'}
                            </div>
                            <div className="text-xs text-gray-500">
                              # ID: {item.productId || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-600">
                              {formatCurrency(item.unitPrice)} x {item.quantity}
                            </div>
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

                {/* Discount */}
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount:</span>
                  <span className="font-medium">-{formatCurrency(0)}</span>
                </div>

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
                    {/* Damage Fee */}
                    <div>
                      <Label htmlFor="damageFee" className="text-sm font-medium text-gray-700">
                        Damage Fee
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
                      />
                    </div>

                    {/* Security Deposit */}
                    <div>
                      <Label htmlFor="securityDeposit" className="text-sm font-medium text-gray-700">
                        Security Deposit
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
                      />
                    </div>

                    {/* Collateral Type */}
                    <div>
                      <Label htmlFor="collateralType" className="text-sm font-medium text-gray-700">
                        Collateral Type
                      </Label>
                      <Input
                        id="collateralType"
                        type="text"
                        value={tempSettings.collateralType || ''}
                        onChange={(e) => handleSettingsChange({ collateralType: e.target.value })}
                        className="mt-1"
                        placeholder="Enter collateral type"
                      />
                    </div>

                    {/* Collateral Details */}
                    <div>
                      <Label htmlFor="collateralDetails" className="text-sm font-medium text-gray-700">
                        Collateral Details
                      </Label>
                      <Input
                        id="collateralDetails"
                        type="text"
                        value={tempSettings.collateralDetails || ''}
                        onChange={(e) => handleSettingsChange({ collateralDetails: e.target.value })}
                        className="mt-1"
                        placeholder="Enter collateral details"
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
                        <span className="text-sm font-medium">{formatCurrency(settingsForm.damageFee || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Security Deposit:</span>
                        <span className="text-sm font-medium">{formatCurrency(settingsForm.securityDeposit || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Collateral Type:</span>
                        <span className="text-sm font-medium">{settingsForm.collateralType || 'Not specified'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Collateral Details:</span>
                        <span className="text-sm font-medium">{settingsForm.collateralDetails || 'No details'}</span>
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
                  {onCancel && order.status !== 'PICKUPED' && 
                   order.status !== 'RETURNED' && 
                   order.status !== 'CANCELLED' && (
                    <Button
                      variant="destructive"
                      onClick={handleCancelOrder}
                      className="px-6"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel Order
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
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Order
                    </Button>
                  )}

                  {/* Pickup Order */}
                  {onPickup && order.orderType === 'RENT' && 
                   order.status !== 'PICKUPED' && 
                   order.status !== 'RETURNED' && 
                   order.status !== 'CANCELLED' && (
                    <Button
                      variant="default"
                      onClick={handlePickupOrder}
                      className="px-6"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Pickup Order
                    </Button>
                  )}

                  {/* Return Order */}
                  {onReturn && order.orderType === 'RENT' && 
                   order.status === 'PICKUPED' && (
                    <Button
                      variant="default"
                      onClick={handleReturnOrder}
                      className="px-4"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Return Order
                    </Button>
                  )}

                  {/* Print Order - Always visible */}
                  <Button
                    variant="outline"
                    onClick={handlePrintOrder}
                    className="px-4"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print Order
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};