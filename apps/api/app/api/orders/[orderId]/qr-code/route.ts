import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db, getDefaultBankAccount } from '@rentalshop/database';
import { ORDER_STATUS, ORDER_TYPE, USER_ROLE } from '@rentalshop/constants';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';
import { generateVietQRString } from '@rentalshop/utils';
import type { BankAccountReference } from '@rentalshop/types';

export const runtime = 'nodejs';

/**
 * GET /api/orders/[orderId]/qr-code
 * Get QR code for order payment
 * 
 * Returns:
 * - qrCodeString: VietQR EMV QR Code string (can be used with QR code libraries)
 * - bankAccount: Bank account information
 * - amount: Amount to collect from customer
 * - orderNumber: Order number for transfer description
 * 
 * Authorization: All roles with 'orders.view' permission can access
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> | { orderId: string } }
) => {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { orderId } = resolvedParams;

  return withPermissions(['orders.view'], { requireActiveSubscription: false })(async (request, { user, userScope }) => {
      try {
        console.log('🔍 GET /api/orders/[orderId]/qr-code - Order ID:', orderId);

        // Validate orderId format
        if (!/^\d+$/.test(orderId)) {
          return NextResponse.json(
            ResponseBuilder.error('INVALID_ORDER_ID_FORMAT', 'Order ID must be numeric'),
            { status: 400 }
          );
        }

        const orderIdNum = parseInt(orderId);

        // Get user scope for merchant isolation
        const userMerchantId = userScope.merchantId;

        if (!userMerchantId) {
          return NextResponse.json(
            ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
            { status: 400 }
          );
        }

        // Get order with details
        const order: any = await db.orders.findByIdDetail(orderIdNum);

        if (!order) {
          return NextResponse.json(
            ResponseBuilder.error('ORDER_NOT_FOUND'),
            { status: 404 }
          );
        }

        // Check merchant access (role-based filtering)
        const isAdmin = user.role === USER_ROLE.ADMIN;
        if (!isAdmin && order.merchantId !== userMerchantId) {
          return NextResponse.json(
            ResponseBuilder.error('ACCESS_DENIED', 'You do not have access to this order'),
            { status: 403 }
          );
        }

        // Get outlet with default bank account
        const outlet = await db.outlets.findById(order.outletId);
        if (!outlet) {
          return NextResponse.json(
            ResponseBuilder.error('OUTLET_NOT_FOUND'),
            { status: 404 }
          );
        }

        // Get default bank account using helper function
        const bankAccountData = await getDefaultBankAccount(order.outletId);
        
        if (!bankAccountData) {
          return NextResponse.json(
            ResponseBuilder.error('NO_DEFAULT_BANK_ACCOUNT', 'No default bank account found for this outlet'),
            { status: 404 }
          );
        }

        const defaultBankAccount: BankAccountReference = {
          id: bankAccountData.id,
          accountHolderName: bankAccountData.accountHolderName,
          accountNumber: bankAccountData.accountNumber,
          bankName: bankAccountData.bankName,
          bankCode: bankAccountData.bankCode,
          branch: bankAccountData.branch,
          isDefault: bankAccountData.isDefault,
          qrCode: bankAccountData.qrCode,
          notes: bankAccountData.notes,
          isActive: bankAccountData.isActive,
          outletId: bankAccountData.outletId,
        };

        // Calculate amount to collect
        // This matches the logic in OrderSummaryCard component
        let amountToPay = 0;

        if (order.orderType === ORDER_TYPE.SALE) {
          // SALE orders: always collect total amount
          amountToPay = order.totalAmount || 0;
        } else if (order.orderType === ORDER_TYPE.RENT && order.status === ORDER_STATUS.RESERVED) {
          // RENT orders RESERVED: collect remaining amount + security deposit
          // Security deposit is stored in order.securityDeposit field
          const remainingAmount = (order.totalAmount || 0) - (order.depositAmount || 0);
          const securityDeposit = order.securityDeposit || 0;
          amountToPay = remainingAmount + securityDeposit;
        } else if (order.orderType === ORDER_TYPE.RENT && order.status === ORDER_STATUS.PICKUPED) {
          // RENT orders PICKUPED: may need to collect additional fees
          // (damage fee, late fee, etc.) when returning
          const damageFee = order.damageFee || 0;
          const lateFee = order.lateFee || 0;
          amountToPay = damageFee + lateFee;
        } else {
          // Other RENT statuses: no collection needed
          amountToPay = 0;
        }

        // Generate transfer description based on order type and status
        let transferDescription: string;
        if (order.orderType === ORDER_TYPE.RENT && order.status === ORDER_STATUS.RESERVED) {
          // Check if this is just deposit collection
          // If amount matches deposit amount, it's deposit collection
          const depositAmount = order.depositAmount || 0;
          if (depositAmount > 0 && Math.abs(amountToPay - depositAmount) < 0.01) {
            // "Thu cọc cho đơn ..."
            transferDescription = `Thu coc cho don ${order.orderNumber}`;
          } else {
            // Otherwise, it's remaining amount + security deposit
            // Check if order has collateral
            const hasCollateral = order.collateralType && order.collateralType.trim() !== '';
            if (hasCollateral) {
              // "Thu tiền còn lại và thế chân cho đơn ..."
              transferDescription = `Thu tien con lai va the chan cho don ${order.orderNumber}`;
            } else {
              // "Thu tiền còn lại cho đơn ..."
              transferDescription = `Thu tien con lai cho don ${order.orderNumber}`;
            }
          }
        } else if (order.orderType === ORDER_TYPE.RENT && order.status === ORDER_STATUS.PICKUPED) {
          // For PICKUPED orders, usually collecting fees (damage, late)
          // Use default description
          transferDescription = `Thanh toan don hang ${order.orderNumber}`;
        } else {
          // Default: "Thanh toán đơn hàng ..." (for SALE orders or other cases)
          transferDescription = `Thanh toan don hang ${order.orderNumber}`;
        }

        // Generate VietQR string
        // Note: Only include amount in QR code if > 0
        // QR code will still be generated without amount (static QR code)
        let qrCodeString: string;
        try {
          qrCodeString = generateVietQRString(
            {
              accountNumber: defaultBankAccount.accountNumber,
              accountHolderName: defaultBankAccount.accountHolderName,
              bankName: defaultBankAccount.bankName,
              bankCode: defaultBankAccount.bankCode,
            },
            amountToPay > 0 ? amountToPay : undefined, // Only include amount if > 0
            transferDescription
          );
        } catch (error: any) {
          console.error('Error generating VietQR string:', error);
          return NextResponse.json(
            ResponseBuilder.error('QR_CODE_GENERATION_FAILED', error.message || 'Failed to generate QR code'),
            { status: 500 }
          );
        }

        // Return QR code data
        return NextResponse.json(
          ResponseBuilder.success('QR_CODE_GENERATED', {
            qrCodeString,
            bankAccount: {
              id: defaultBankAccount.id,
              accountHolderName: defaultBankAccount.accountHolderName,
              accountNumber: defaultBankAccount.accountNumber,
              bankName: defaultBankAccount.bankName,
              bankCode: defaultBankAccount.bankCode,
              branch: defaultBankAccount.branch,
            },
            amount: amountToPay,
            orderNumber: order.orderNumber,
            transferDescription,
          })
        );
      } catch (error) {
        console.error('Error in GET /api/orders/[orderId]/qr-code:', error);
        const { response, statusCode } = handleApiError(error);
        return NextResponse.json(response, { status: statusCode });
      }
    }
  )(request);
};

