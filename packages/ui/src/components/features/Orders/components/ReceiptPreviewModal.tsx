'use client';

import React, { useState, useRef } from 'react';
import { Printer } from 'lucide-react';
import { 
  Button,
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '../../../ui';
import type { Order, OrderItemWithProduct } from '@rentalshop/types';
import type { OutletReference, MerchantReference } from '@rentalshop/types';
import { formatCurrency } from '@rentalshop/utils';
import { useOrderTranslations, useCommonTranslations } from '@rentalshop/hooks';

interface ReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  outlet?: OutletReference | null;
  merchant?: MerchantReference | null;
  // Preview mode props (before order creation)
  isPreviewMode?: boolean;
  onConfirm?: () => void;
  onEdit?: () => void;
  loading?: boolean;
  confirmText?: string;
  editText?: string;
}

/**
 * Receipt Preview Modal Component
 * Shows receipt preview with print options
 */
export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  isOpen,
  onClose,
  order,
  outlet,
  merchant,
  isPreviewMode = false,
  onConfirm,
  onEdit,
  loading = false,
  confirmText,
  editText
}) => {
  const t = useOrderTranslations();
  const tc = useCommonTranslations();
  const [isPrinting, setIsPrinting] = useState(false);
  const receiptContentRef = useRef<HTMLDivElement>(null);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      // Get receipt content
      const receiptContent = receiptContentRef.current || document.querySelector('[data-receipt-content]');
      if (!receiptContent) {
        throw new Error('Receipt content not found');
      }

      // Create a hidden iframe for printing (better than popup)
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      // Create print HTML with thermal printer format (80mm width)
      const printHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Receipt - ${order?.orderNumber || order?.id}</title>
            <style>
              @page {
                size: 80mm auto;
                margin: 0;
              }
              
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.4;
                width: 80mm;
                padding: 10mm 5mm;
                background: white;
                color: black;
              }
              
              .text-center {
                text-align: center;
              }
              
              .text-right {
                text-align: right;
              }
              
              .font-bold {
                font-weight: bold;
              }
              
              .mb-2 {
                margin-bottom: 8px;
              }
              
              .mb-24 {
                margin-bottom: 96px;
              }
            </style>
          </head>
          <body>
            ${receiptContent.innerHTML}
          </body>
        </html>
      `;

      // Write content to iframe
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Cannot access iframe document');
      }
      
      iframeDoc.open();
      iframeDoc.write(printHTML);
      iframeDoc.close();

      // Wait for content to load, then trigger print
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.print();
          // Remove iframe after printing
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 500);
        }, 250);
      };

      // Fallback: trigger print immediately if onload doesn't fire
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.print();
          setTimeout(() => {
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
          }, 500);
        }
      }, 500);
    } catch (error) {
      console.error('Print error:', error);
      alert(`Lỗi khi in: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPrinting(false);
    }
  };

  if (!isOpen || !order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 border-b border-gray-200">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {t('receipt.previewTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[calc(90vh-140px)]">
          {/* Preview Section */}
          <div className={`flex-1 p-6 overflow-auto flex flex-col ${!isPreviewMode ? 'border-r border-gray-200' : ''}`}>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex justify-center flex-1">
              <div 
                ref={receiptContentRef}
                className="bg-white rounded shadow-sm p-4 min-h-[400px] max-w-lg" 
                data-receipt-content
              >
                <ReceiptPreviewContent 
                  order={order} 
                  outlet={outlet}
                  merchant={merchant}
                />
              </div>
            </div>
            
            {/* Confirm Button - Only in preview mode, moved to bottom */}
            {isPreviewMode && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  onClick={onConfirm}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-3 flex items-center justify-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="font-medium">{confirmText || tc('buttons.confirm')}</div>
                </Button>
              </div>
            )}
          </div>

          {/* Print Options Section - Only show when NOT in preview mode */}
          {!isPreviewMode && (
            <div className="w-80 p-6 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {t('receipt.printOptions')}
                </h3>
              </div>

              {/* Print Options */}
              <div className="space-y-3">
                <Button
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-3 flex items-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">{t('receipt.printViaPDF')}</div>
                    <div className="text-xs opacity-90">{t('receipt.printDescription')}</div>
                  </div>
                </Button>

                <Button
                  onClick={onClose}
                  variant="outline"
                  className="w-full"
                >
                  {tc('buttons.close')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Receipt Preview Content Component
 * Shows a simplified preview of the receipt
 */
interface ReceiptPreviewContentProps {
  order: Order;
  outlet?: OutletReference | null;
  merchant?: MerchantReference | null;
}

const ReceiptPreviewContent: React.FC<ReceiptPreviewContentProps> = ({
  order,
  outlet,
  merchant
}) => {
  const t = useOrderTranslations();
  const tc = useCommonTranslations();
  const orderType = order.orderType || 'RENT';
  const orderItems = order.orderItems || [];
  
  // Get shop name from outlet or merchant
  const shopName = outlet?.name || merchant?.name || 'CUA HANG';
  const phone = (outlet as any)?.phone || merchant?.email || '';
  const address = outlet?.address || '';

  // Format dates
  const formatDate = (date: Date | string | undefined | null): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('vi-VN');
  };

  // Calculate totals
  const subtotal = order.totalAmount || 0;
  const discount = order.discountAmount || 0;
  const total = subtotal - discount;

  return (
    <div className="bg-white p-4 rounded-lg border font-mono text-sm leading-tight max-w-xl mx-auto">
      {/* Store Header */}
      <div className="text-center font-bold mb-2">
        {shopName.toUpperCase()}
      </div>
      <div className="text-center mb-2"></div>
      
      {phone && <div>{tc('labels.phone')}: {phone}</div>}
      {address && <div>{tc('labels.address')}: {address}</div>}
      
      <div className="text-center mb-2">------------------------------------------------</div>
      <div className="text-center mb-2"></div>
      
      {/* Order Details */}
      <div className="text-center font-bold mb-2">
        {t('receipt.order')} #{order.orderNumber || order.id}
      </div>
      <div className="text-center mb-2"></div>
      
      {/* Customer Info */}
      <div className="mb-2">
        <div className="font-bold">
          {t('receipt.customer')}: {order.customerName || 'N/A'} - {order.customerPhone || 'N/A'}
        </div>
      </div>
      <div className="mb-2"></div>
      
      {/* Order Type Specific */}
      {orderType === 'RENT' && (
        <div className="mb-2">
          {order.depositAmount > 0 ? (
            <div>{t('receipt.deposit')}: {formatCurrency(order.depositAmount, 'VND')}</div>
          ) : (
            <div>{t('receipt.deposit')}: {t('receipt.noDeposit')}</div>
          )}
          
          {/* Created Date */}
          {order.createdAt && (
            <div>{t('receipt.createdDate')}: {formatDate(order.createdAt)}</div>
          )}

          {/* Rent Date and Return Date */}
          {order.pickupPlanAt && order.returnPlanAt && (
            <div className="flex justify-between">
              <span>{t('receipt.rentDate')}: {formatDate(order.pickupPlanAt)}</span>
              <span>{t('receipt.returnDate')}: {formatDate(order.returnPlanAt)}</span>
            </div>
          )}
          {/* Fallback: show individually if only one date exists */}
          {order.pickupPlanAt && !order.returnPlanAt && (
            <div>{t('receipt.rentDate')}: {formatDate(order.pickupPlanAt)}</div>
          )}
          {!order.pickupPlanAt && order.returnPlanAt && (
            <div>{t('receipt.returnDate')}: {formatDate(order.returnPlanAt)}</div>
          )}
        </div>
      )}
      
      {orderType !== 'RENT' && (
        <div className="mb-2">
          {/* Created Date */}
          {order.createdAt && (
            <div>{t('receipt.createdDate')}: {formatDate(order.createdAt)}</div>
          )}
          
          {/* Sale Date */}
          {order.createdAt && (
            <div>{t('receipt.saleDate')}: {formatDate(order.createdAt)}</div>
          )}
        </div>
      )}
      
      {/* Products */}
      <div className="mb-2">------------------------------------------------</div>
      {orderItems.map((item: any, index: number) => {
        const productName = item.product?.name || `Product ${index + 1}`;
        const note = item.notes || '';
        const quantity = item.quantity || 1;
        const price = item.unitPrice || 0;
        const itemTotal = item.totalPrice || (quantity * price);
        
        return (
          <div key={item.id || index} className="mb-1">
            <div>
              {index + 1}. {productName} {note && note.length > 0 && `(${note})`}
            </div>
            <div className="text-right">
              {quantity} x {formatCurrency(price, 'VND')} = {formatCurrency(itemTotal, 'VND')}
            </div>
          </div>
        );
      })}
      
      {/* Totals */}
      <div className="mb-2">------------------------------------------------</div>
      <div className="mb-2"></div>
      <div className="text-right font-bold">
        <div>{t('receipt.subtotal')}: {formatCurrency(subtotal, 'VND')}</div>
        {order.discountAmount && order.discountAmount > 0 ? (
          <>
            <div>
              {t('receipt.discount')}: {formatCurrency(order.discountAmount, 'VND')} 
              {order.discountType === 'percentage' && order.discountValue 
                ? ` (${order.discountValue}%)` 
                : ''}
            </div>
            <div>------------------------------------------------</div>
            <div>{t('receipt.total')}: {formatCurrency(total, 'VND')}</div>
            <div></div>
          </>
        ) : (
          <>
            <div>{t('receipt.discount')}: 0</div>
            <div>------------------------------------------------</div>
            <div>{t('receipt.total')}: {formatCurrency(subtotal, 'VND')}</div>
            <div></div>
          </>
        )}
      </div>
      
      {/* Footer for rent orders */}
      {orderType === 'RENT' && (
        <div className="mb-2">
          {order.notes && order.notes.trim() !== '' && (
            <>
              <div className="text-center font-bold">{t('receipt.note')}</div>
              <div>{order.notes}</div>
            </>
          )}
          <div>------------------------------------------------</div>
          <div className="flex justify-between mb-24">
            <div>{t('receipt.customerSignature')}</div>
            <div>{t('receipt.storeSignature')}</div>
          </div>
        </div>
      )}
      
      {/* Thank you */}
      <div className="mb-2"></div>
      <div className="text-center mb-2">
        <div>{t('receipt.thankYou')}</div>
      </div>
      <div className="text-center mb-2"></div>
      
      {/* App info */}
      <div className="text-center">
        <div>------------------------------------------------</div>
        <div>{t('receipt.downloadApp')}</div>
      </div>
    </div>
  );
};

