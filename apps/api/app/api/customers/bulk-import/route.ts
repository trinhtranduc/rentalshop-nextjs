import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db, prisma } from '@rentalshop/database';
import { 
  handleApiError, 
  ResponseBuilder,
  customerCreateSchema
} from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { z } from 'zod';

const bulkImportSchema = z.object({
  customers: z.array(customerCreateSchema).min(1, 'At least one customer is required')
});

/**
 * POST /api/customers/bulk-import
 * Bulk import customers from Excel file
 * 
 * Authorization: All roles with 'customers.manage' permission can access
 */
export const POST = withPermissions(['customers.manage'])(async (request, { user, userScope }) => {
  try {
    const body = await request.json();
    
    // Validate request body
    const parsed = bulkImportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { customers } = parsed.data;

    // Resolve merchant ID
    const merchantId = userScope.merchantId;
    if (!merchantId) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_ID_REQUIRED'),
        { status: 400 }
      );
    }

    // Import customers with transaction
    const results = await prisma.$transaction(async (tx: any) => {
      const imported: any[] = [];
      const errors: Array<{ row: number; error: string }> = [];

      for (let i = 0; i < customers.length; i++) {
        const customerData = customers[i];
        const rowNumber = i + 2; // +2 because Excel row 1 is header, data starts at row 2

        try {
          // Ensure merchantId is set
          const customerInput = {
            ...customerData,
            merchantId
          };

          // Create customer using transaction client
          const merchant = await tx.merchant.findUnique({
            where: { id: merchantId }
          });

          if (!merchant) {
            errors.push({ row: rowNumber, error: 'Merchant not found' });
            continue;
          }

          const customer = await tx.customer.create({
            data: {
              firstName: customerInput.firstName || '',
              lastName: customerInput.lastName && customerInput.lastName.trim() !== '' ? customerInput.lastName.trim() : null,
              phone: customerInput.phone && customerInput.phone.trim() !== '' ? customerInput.phone.trim() : null,
              email: customerInput.email && customerInput.email.trim() !== '' ? customerInput.email.trim() : null,
              address: customerInput.address && customerInput.address.trim() !== '' ? customerInput.address.trim() : null,
              city: customerInput.city && customerInput.city.trim() !== '' ? customerInput.city.trim() : null,
              state: customerInput.state && customerInput.state.trim() !== '' ? customerInput.state.trim() : null,
              zipCode: customerInput.zipCode && customerInput.zipCode.trim() !== '' ? customerInput.zipCode.trim() : null,
              country: customerInput.country && customerInput.country.trim() !== '' ? customerInput.country.trim() : null,
              idNumber: customerInput.idNumber && customerInput.idNumber.trim() !== '' ? customerInput.idNumber.trim() : null,
              notes: customerInput.notes && customerInput.notes.trim() !== '' ? customerInput.notes.trim() : null,
              dateOfBirth: customerInput.dateOfBirth || null,
              idType: customerInput.idType || null,
              isActive: true,
              merchantId: merchant.id
            }
          });

          imported.push(customer);
        } catch (error: any) {
          errors.push({ 
            row: rowNumber, 
            error: error.message || 'Failed to import customer' 
          });
        }
      }

      return { imported, errors };
    });

    return NextResponse.json(
      ResponseBuilder.success('CUSTOMERS_IMPORTED', {
        imported: results.imported.length,
        failed: results.errors.length,
        total: customers.length,
        errors: results.errors
      })
    );
  } catch (error) {
    console.error('Error in bulk import:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

