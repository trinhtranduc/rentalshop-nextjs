/**
 * OrderPreviewForm - A reusable component for previewing order details before confirmation
 * 
 * USAGE EXAMPLES:
 * 
 * 1. Basic usage:
 * <OrderPreviewForm
 *   orderData={orderData}
 *   products={products}
 *   onConfirm={handleConfirm}
 *   onEdit={handleEdit}
 *   loading={false}
 * />
 * 
 * 2. With custom actions:
 * <OrderPreviewForm
 *   orderData={orderData}
 *   products={products}
 *   onConfirm={handleConfirm}
 *   onEdit={handleEdit}
 *   onCancel={handleCancel}
 *   confirmText="Create Order"
 *   editText="Go Back"
 *   showValidation={true}
 * />
 */

'use client'

import React from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Badge,
  Separator,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Button,
  Skeleton
} from '@rentalshop/ui';
import { formatCurrency } from '@rentalshop/utils';
import { 
  ShoppingCart, 
  Info, 
  Package, 
  DollarSign, 
  MessageSquare, 
  Calendar, 
  Clock, 
  User, 
  Smartphone, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Edit,
  ArrowLeft
} from 'lucide-react';

export interface OrderPreviewData {
  orderType: 'RENT' | 'SALE' | 'RENT_TO_OWN';
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  outletId: number;
  outletName?: string;
  pickupPlanAt?: string;
  returnPlanAt?: string;
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  depositAmount?: number;
  securityDeposit?: number;
  damageFee?: number;
  lateFee?: number;
  notes?: string;
  orderItems: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    deposit?: number;
    notes?: string;
  }>;
}

export interface ProductInfo {
  id: number;
  name: string;
  barcode?: string;
  description?: string;
  image?: string;
}

export interface OrderPreviewFormProps {
  orderData: OrderPreviewData;
  products: ProductInfo[];
  onConfirm: () => void;
  onEdit: () => void;
  onCancel?: () => void;
  loading?: boolean;
  confirmText?: string;
  editText?: string;
  cancelText?: string;
  showValidation?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const OrderPreviewForm: React.FC<OrderPreviewFormProps> = ({
  orderData,
  products,
  onConfirm,
  onEdit,
  onCancel,
  loading = false,
  confirmText = 'Confirm Order',
  editText = 'Edit Order',
  cancelText = 'Cancel',
  showValidation = true,
  title = 'Order Preview',
  subtitle = 'Review your order details before confirming',
  className = ''
}) => {
  // Calculate rental duration for rental orders
  const getRentalDuration = () => {
    if (orderData.orderType === 'RENT' && orderData.pickupPlanAt && orderData.returnPlanAt) {
      const start = new Date(orderData.pickupPlanAt);
      const end = new Date(orderData.returnPlanAt);
      const durationMs = end.getTime() - start.getTime();
      return Math.ceil(durationMs / (1000 * 60 * 60 * 24));
    }
    return 0;
  };

  // Get validation warnings
  const getValidationWarnings = () => {
    if (!showValidation) return [];
    
    const warnings = [];
    
    if (!orderData.customerId && !orderData.customerName) {
      warnings.push('Customer information is missing');
    }
    
    if (orderData.orderItems.length === 0) {
      warnings.push('No order items added');
    }
    
    if (orderData.orderType === 'RENT' && (!orderData.pickupPlanAt || !orderData.returnPlanAt)) {
      warnings.push('Rental dates are not set');
    }
    
    if (orderData.totalAmount <= 0) {
      warnings.push('Order total amount is invalid');
    }
    
    return warnings;
  };

  const warnings = getValidationWarnings();
  const rentalDuration = getRentalDuration();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
          <ShoppingCart className="w-6 h-6 text-blue-600" />
          {title}
        </h2>
        {subtitle && (
          <p className="text-gray-600">{subtitle}</p>
        )}
      </div>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={orderData.orderType === 'RENT' ? 'default' : 'secondary'}>
                  {orderData.orderType}
                </Badge>
                <span className="text-sm text-gray-600">Order Type</span>
              </div>
              
              {orderData.outletName && (
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">Outlet:</span>
                  <span className="text-sm text-gray-600">{orderData.outletName}</span>
                </div>
              )}
              
              {orderData.orderType === 'RENT' && (
                <>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">Pickup:</span>
                    <span className="text-sm text-gray-600">
                      {orderData.pickupPlanAt ? new Date(orderData.pickupPlanAt).toLocaleDateString() : 'Not set'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">Return:</span>
                    <span className="text-sm text-gray-600">
                      {orderData.returnPlanAt ? new Date(orderData.returnPlanAt).toLocaleDateString() : 'Not set'}
                    </span>
                  </div>
                  {rentalDuration > 0 && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">Duration:</span>
                      <span className="text-sm text-gray-600">{rentalDuration} days</span>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Customer:</span>
                <span className="text-sm text-gray-600">
                  {orderData.customerName || 'Not selected'}
                </span>
              </div>
              
              {orderData.customerPhone && (
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">Phone:</span>
                  <span className="text-sm text-gray-600">{orderData.customerPhone}</span>
                </div>
              )}
              
              {orderData.customerEmail && (
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">Email:</span>
                  <span className="text-sm text-gray-600">{orderData.customerEmail}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-green-600" />
            Order Items ({orderData.orderItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orderData.orderItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No items added to this order</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total Price</TableHead>
                  {orderData.orderType === 'RENT' && <TableHead>Deposit</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderData.orderItems.map((item, index) => {
                  const product = products.find(p => p.id === item.productId);
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            {product?.image ? (
                              <img 
                                src={product.image} 
                                alt={product.name}
                                className="w-8 h-8 rounded object-cover"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{product?.name || 'Unknown Product'}</div>
                            <div className="text-sm text-gray-500">
                              {product?.barcode || 'No barcode'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.quantity}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {formatCurrency(item.totalPrice)}
                      </TableCell>
                      {orderData.orderType === 'RENT' && (
                        <TableCell className="font-mono">
                          {formatCurrency(item.deposit || 0)}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-mono">{formatCurrency(orderData.subtotal)}</span>
            </div>
            
            {orderData.taxAmount && orderData.taxAmount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tax:</span>
                <span className="font-mono">{formatCurrency(orderData.taxAmount)}</span>
              </div>
            )}
            
            {orderData.discountAmount && orderData.discountAmount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Discount:</span>
                <span className="font-mono text-green-600">-{formatCurrency(orderData.discountAmount)}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total Amount:</span>
              <span className="font-mono text-blue-600">{formatCurrency(orderData.totalAmount)}</span>
            </div>
            
            {orderData.depositAmount && orderData.depositAmount > 0 && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Deposit Required:</span>
                  <span className="font-mono text-orange-600">{formatCurrency(orderData.depositAmount)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Remaining Balance:</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(orderData.totalAmount - orderData.depositAmount)}
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      {(orderData.notes || orderData.orderType === 'RENT') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-600" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orderData.notes && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Notes:</span>
                  <p className="text-sm text-gray-600 mt-1">{orderData.notes}</p>
                </div>
              )}
              
              {orderData.orderType === 'RENT' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {orderData.securityDeposit && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Security Deposit:</span>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatCurrency(orderData.securityDeposit)}
                      </p>
                    </div>
                  )}
                  {orderData.damageFee && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Damage Fee:</span>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatCurrency(orderData.damageFee)}
                      </p>
                    </div>
                  )}
                  {orderData.lateFee && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Late Fee:</span>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatCurrency(orderData.lateFee)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Warnings */}
      {warnings.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-5 h-5" />
              Validation Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-orange-700">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        {onCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            {cancelText}
          </Button>
        )}
        
        <Button
          variant="outline"
          onClick={onEdit}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {editText}
        </Button>
        
        <Button
          onClick={onConfirm}
          disabled={loading || warnings.length > 0}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              {confirmText}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default OrderPreviewForm;
