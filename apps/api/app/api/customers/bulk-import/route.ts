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
        const rowNumber = i + 1; // Start from 1 (matching UI display)

        try {
          // Ensure merchantId is set
          const customerInput = {
            ...customerData,
            merchantId
          };

          // Find merchant by id (userScope.merchantId is the merchant id)
          const merchant = await tx.merchant.findUnique({
            where: { id: merchantId }
          });

          if (!merchant) {
            errors.push({ row: rowNumber, error: `Merchant with ID ${merchantId} not found` });
            continue;
          }

          // Convert dateOfBirth string to Date object if provided
          // Prisma DateTime requires Date object or ISO-8601 string with time
          let dateOfBirth: Date | null = null;
          if (customerInput.dateOfBirth) {
            const dateValue = customerInput.dateOfBirth;
            if (typeof dateValue === 'string') {
              // If it's a date string (e.g., "1990-01-15"), convert to Date
              // Add time component if missing to make it valid ISO-8601
              const dateStr = dateValue.trim();
              if (dateStr) {
                // If it's just a date (YYYY-MM-DD), add time to make it valid
                const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})$/);
                if (dateMatch) {
                  dateOfBirth = new Date(`${dateMatch[1]}T00:00:00.000Z`);
                } else {
                  // Try parsing as-is (might already be ISO-8601)
                  dateOfBirth = new Date(dateStr);
                }
                // Validate the date
                if (isNaN(dateOfBirth.getTime())) {
                  dateOfBirth = null;
                }
              }
            } else if (dateValue && typeof dateValue === 'object' && 'getTime' in dateValue) {
              // It's already a Date object
              dateOfBirth = dateValue as Date;
            }
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
              dateOfBirth: dateOfBirth,
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

