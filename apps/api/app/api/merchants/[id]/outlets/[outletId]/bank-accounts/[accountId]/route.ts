import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
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
 * Bank account update schema
 */
const bankAccountUpdateSchema = z.object({
  accountHolderName: z.string().min(1).optional(),
  accountNumber: z.string().min(8).max(16).optional(),
  bankName: z.string().min(1).optional(),
  bankCode: z.string().optional(),
  branch: z.string().optional(),
  isDefault: z.boolean().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/merchants/[id]/outlets/[outletId]/bank-accounts/[accountId]
 * Get a specific bank account
 * 
 * Authorization: ADMIN, MERCHANT (own merchant), OUTLET_ADMIN (own outlet), OUTLET_STAFF (own outlet)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; outletId: string; accountId: string }> | { id: string; outletId: string; accountId: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const merchantId = parseInt(resolvedParams.id);
  const outletId = parseInt(resolvedParams.outletId);
  const accountId = parseInt(resolvedParams.accountId);
  
  return withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT, USER_ROLE.OUTLET_ADMIN, USER_ROLE.OUTLET_STAFF])(async (request, { user, userScope }) => {
    try {
      if (isNaN(merchantId) || isNaN(outletId) || isNaN(accountId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_ID_FORMAT'),
          { status: 400 }
        );
      }

      // Check authorization
      if (user.role === USER_ROLE.MERCHANT && userScope.merchantId !== merchantId) {
        return NextResponse.json(
          ResponseBuilder.error('FORBIDDEN'),
          { status: 403 }
        );
      }

      if ((user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) && userScope.outletId !== outletId) {
        return NextResponse.json(
          ResponseBuilder.error('FORBIDDEN'),
          { status: 403 }
        );
      }

      // Get bank account
      const bankAccount = await prisma.bankAccount.findFirst({
        where: {
          id: accountId,
          outletId,
          outlet: {
            merchantId
          }
        }
      });

      if (!bankAccount) {
        return NextResponse.json(
          ResponseBuilder.error('BANK_ACCOUNT_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      return NextResponse.json(
        ResponseBuilder.success('BANK_ACCOUNT_FOUND', bankAccount)
      );

    } catch (error) {
      console.error('Error fetching bank account:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * PUT /api/merchants/[id]/outlets/[outletId]/bank-accounts/[accountId]
 * Update a bank account
 * 
 * Authorization: ADMIN, MERCHANT (own merchant), OUTLET_ADMIN (own outlet)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; outletId: string; accountId: string }> | { id: string; outletId: string; accountId: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const merchantId = parseInt(resolvedParams.id);
  const outletId = parseInt(resolvedParams.outletId);
  const accountId = parseInt(resolvedParams.accountId);
  
  return withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT, USER_ROLE.OUTLET_ADMIN])(async (request, { user, userScope }) => {
    try {
      if (isNaN(merchantId) || isNaN(outletId) || isNaN(accountId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_ID_FORMAT'),
          { status: 400 }
        );
      }

      // Check authorization
      if (user.role === USER_ROLE.MERCHANT && userScope.merchantId !== merchantId) {
        return NextResponse.json(
          ResponseBuilder.error('FORBIDDEN'),
          { status: 403 }
        );
      }

      if (user.role === USER_ROLE.OUTLET_ADMIN && userScope.outletId !== outletId) {
        return NextResponse.json(
          ResponseBuilder.error('FORBIDDEN'),
          { status: 403 }
        );
      }

      // Verify bank account exists and belongs to outlet
      const existingAccount = await prisma.bankAccount.findFirst({
        where: {
          id: accountId,
          outletId,
          outlet: {
            merchantId
          }
        }
      });

      if (!existingAccount) {
        return NextResponse.json(
          ResponseBuilder.error('BANK_ACCOUNT_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      const body = await request.json();
      
      // Validate input
      const parsed = bankAccountUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        );
      }

      const data = parsed.data;

      // Prepare update data
      const updateData: any = {};
      
      if (data.accountHolderName !== undefined) {
        updateData.accountHolderName = data.accountHolderName;
      }
      if (data.accountNumber !== undefined) {
        updateData.accountNumber = data.accountNumber;
      }
      if (data.bankName !== undefined) {
        updateData.bankName = data.bankName;
      }
      if (data.bankCode !== undefined) {
        updateData.bankCode = data.bankCode;
      }
      if (data.branch !== undefined) {
        updateData.branch = data.branch;
      }
      if (data.notes !== undefined) {
        updateData.notes = data.notes;
      }
      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
      }

      // If setting as default, unset other defaults for this outlet
      if (data.isDefault === true) {
        await prisma.bankAccount.updateMany({
          where: {
            outletId,
            id: { not: accountId },
            isDefault: true
          },
          data: {
            isDefault: false
          }
        });
        updateData.isDefault = true;
      } else if (data.isDefault === false) {
        updateData.isDefault = false;
      }

      // Regenerate QR code if account info changed
      if (data.accountNumber || data.accountHolderName || data.bankName || data.bankCode) {
        const accountNumber = data.accountNumber || existingAccount.accountNumber;
        const accountHolderName = data.accountHolderName || existingAccount.accountHolderName;
        const bankName = data.bankName || existingAccount.bankName;
        const bankCode = data.bankCode || data.bankName ? getBankCode(data.bankName || existingAccount.bankName) : existingAccount.bankCode;
        
        updateData.qrCode = generateBankQRCodeData({
          accountNumber,
          accountHolderName,
          bankName,
          bankCode: bankCode || getBankCode(bankName),
          branch: data.branch || existingAccount.branch
        });
      }

      // Update bank account
      const updatedAccount = await prisma.bankAccount.update({
        where: { id: accountId },
        data: updateData
      });

      return NextResponse.json(
        ResponseBuilder.success('BANK_ACCOUNT_UPDATED_SUCCESS', updatedAccount)
      );

    } catch (error) {
      console.error('Error updating bank account:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * DELETE /api/merchants/[id]/outlets/[outletId]/bank-accounts/[accountId]
 * Delete (soft delete) a bank account
 * 
 * Authorization: ADMIN, MERCHANT (own merchant), OUTLET_ADMIN (own outlet)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; outletId: string; accountId: string }> | { id: string; outletId: string; accountId: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const merchantId = parseInt(resolvedParams.id);
  const outletId = parseInt(resolvedParams.outletId);
  const accountId = parseInt(resolvedParams.accountId);
  
  return withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT, USER_ROLE.OUTLET_ADMIN])(async (request, { user, userScope }) => {
    try {
      if (isNaN(merchantId) || isNaN(outletId) || isNaN(accountId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_ID_FORMAT'),
          { status: 400 }
        );
      }

      // Check authorization
      if (user.role === USER_ROLE.MERCHANT && userScope.merchantId !== merchantId) {
        return NextResponse.json(
          ResponseBuilder.error('FORBIDDEN'),
          { status: 403 }
        );
      }

      if (user.role === USER_ROLE.OUTLET_ADMIN && userScope.outletId !== outletId) {
        return NextResponse.json(
          ResponseBuilder.error('FORBIDDEN'),
          { status: 403 }
        );
      }

      // Verify bank account exists and belongs to outlet
      const existingAccount = await prisma.bankAccount.findFirst({
        where: {
          id: accountId,
          outletId,
          outlet: {
            merchantId
          }
        }
      });

      if (!existingAccount) {
        return NextResponse.json(
          ResponseBuilder.error('BANK_ACCOUNT_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Soft delete: set isActive to false
      const deletedAccount = await prisma.bankAccount.update({
        where: { id: accountId },
        data: { isActive: false }
      });

      return NextResponse.json(
        ResponseBuilder.success('BANK_ACCOUNT_DELETED_SUCCESS', deletedAccount)
      );

    } catch (error) {
      console.error('Error deleting bank account:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

