import { NextRequest, NextResponse } from 'next/server';
import { withPermissions, validateMerchantAccess } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { USER_ROLE } from '@rentalshop/constants';
import { 
  handleApiError, 
  ResponseBuilder,
  generateBankQRCodeData,
  validateBankAccountInfo,
  getBankCode
} from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { z } from 'zod';

/**
 * Bank account creation schema
 */
const bankAccountSchema = z.object({
  accountHolderName: z.string().min(1, 'Account holder name is required'),
  accountNumber: z.string().min(8, 'Account number must be at least 8 digits').max(16, 'Account number must be at most 16 digits'),
  bankName: z.string().min(1, 'Bank name is required'),
  bankCode: z.string().optional(),
  branch: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
  notes: z.string().optional(),
});

/**
 * GET /api/merchants/[id]/outlets/[outletId]/bank-accounts
 * Get all bank accounts for an outlet
 * 
 * Authorization: Roles with 'outlet.view' permission can access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; outletId: string }> | { id: string; outletId: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const merchantId = parseInt(resolvedParams.id);
  const outletId = parseInt(resolvedParams.outletId);
  
  return withPermissions(['outlet.view'])(async (request, { user, userScope }) => {
    try {
      // Validate merchant and outlet access (format, exists, association, scope)
      const validation = await validateMerchantAccess(merchantId, user, userScope, outletId);
      if (!validation.valid) {
        return validation.error!;
      }
      const { merchant, outlet } = validation;

      // Get bank accounts (use outlet.id which is the CUID)
      const bankAccounts = await prisma.bankAccount.findMany({
        where: {
          outletId: outlet.id,
          isActive: true
        },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      return NextResponse.json(
        ResponseBuilder.success('BANK_ACCOUNTS_FOUND', bankAccounts)
      );

    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * POST /api/merchants/[id]/outlets/[outletId]/bank-accounts
 * Create a new bank account for an outlet
 * 
 * Authorization: ADMIN, MERCHANT, and OUTLET_ADMIN can create bank accounts
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; outletId: string }> | { id: string; outletId: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const merchantId = parseInt(resolvedParams.id);
  const outletId = parseInt(resolvedParams.outletId);
  
  return withPermissions(['outlet.view'])(async (request, { user, userScope }) => {
    try {
      // Block OUTLET_STAFF from creating bank accounts
      if (user.role === USER_ROLE.OUTLET_STAFF) {
        return NextResponse.json(
          ResponseBuilder.error('FORBIDDEN'),
          { status: 403 }
        );
      }

      // Validate merchant and outlet access (format, exists, association, scope)
      const validation = await validateMerchantAccess(merchantId, user, userScope, outletId);
      if (!validation.valid) {
        return validation.error!;
      }
      const { merchant, outlet } = validation;

      const body = await request.json();
      
      // Validate input
      const parsed = bankAccountSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        );
      }

      const data = parsed.data;

      // Validate bank account info
      const bankAccountValidation = validateBankAccountInfo({
        accountNumber: data.accountNumber,
        accountHolderName: data.accountHolderName,
        bankName: data.bankName,
        bankCode: data.bankCode || getBankCode(data.bankName)
      });

      if (!bankAccountValidation.valid) {
        return NextResponse.json(
          ResponseBuilder.validationError(bankAccountValidation.errors.join(', ')),
          { status: 400 }
        );
      }

      // Generate QR code
      const qrCode = generateBankQRCodeData({
        accountNumber: data.accountNumber,
        accountHolderName: data.accountHolderName,
        bankName: data.bankName,
        bankCode: data.bankCode || getBankCode(data.bankName),
        branch: data.branch
      });

      // If setting as default, unset other defaults for this outlet
      if (data.isDefault) {
        await prisma.bankAccount.updateMany({
          where: {
            outletId: outlet.id,
            isDefault: true
          },
          data: {
            isDefault: false
          }
        });
      }

      // Create bank account (use outlet.id which is the CUID)
      const bankAccount = await prisma.bankAccount.create({
        data: {
          outletId: outlet.id,
          accountHolderName: data.accountHolderName,
          accountNumber: data.accountNumber,
          bankName: data.bankName,
          bankCode: data.bankCode || getBankCode(data.bankName),
          branch: data.branch,
          isDefault: data.isDefault || false,
          qrCode,
          notes: data.notes,
          isActive: true
        }
      });

      return NextResponse.json(
        ResponseBuilder.success('BANK_ACCOUNT_CREATED_SUCCESS', bankAccount),
        { status: 201 }
      );

    } catch (error) {
      console.error('Error creating bank account:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

