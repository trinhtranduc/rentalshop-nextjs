import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { 
  handleApiError, 
  ResponseBuilder,
  customerCreateSchema
} from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { z } from 'zod';

const MAX_IMPORT_ROWS = 3000;

const bulkImportSchema = z.object({
  customers: z
    .array(customerCreateSchema)
    .min(1, 'At least one customer is required')
    .max(MAX_IMPORT_ROWS, `Maximum allowed is ${MAX_IMPORT_ROWS} rows`)
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

    // Get merchant CUID (for database operations)
    const merchant = await db.merchants.findById(merchantId);
    if (!merchant) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Step 1: Validate ALL customers BEFORE transaction (all-or-nothing)
    const validationErrors: Array<{ row: number; error: string }> = [];
    const validatedCustomers: any[] = [];

      for (let i = 0; i < customers.length; i++) {
        const customerData = customers[i];
        const rowNumber = i + 1; // Start from 1 (matching UI display)

        try {
        // Validate firstName (required)
        const firstName = (customerData.firstName || '').trim();
        if (!firstName || firstName === '') {
          validationErrors.push({ 
            row: rowNumber, 
            error: 'First name is required' 
          });
          continue;
        }

        // Validate customer data with schema
        const validationResult = customerCreateSchema.safeParse(customerData);
        if (!validationResult.success) {
          // Format detailed validation errors
          const errorMessages = validationResult.error.errors.map(e => {
            const field = e.path.join('.') || 'unknown';
            return `${field}: ${e.message}`;
          });
          
          validationErrors.push({ 
            row: rowNumber, 
            error: errorMessages.join('; ') || 'Validation failed'
          });
          
          // Log for debugging
          console.error(`Validation error at row ${rowNumber}:`, {
            errors: validationResult.error.errors,
            customerData: customerData
          });
          
          continue;
        }

        // Ensure merchantId is set
        const customerInput = {
          ...validationResult.data,
          merchantId
        };

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

        validatedCustomers.push({
          rowNumber,
          data: customerInput,
          dateOfBirth
        });
      } catch (error: any) {
        // Format user-friendly error message
        let errorMessage = 'Failed to validate customer';
        
        if (error.message) {
          // Check if it's a Zod validation error
          if (error.name === 'ZodError' && error.errors) {
            const zodErrors = error.errors.map((e: any) => {
              const field = e.path.join('.') || 'unknown';
              return `${field}: ${e.message}`;
            });
            errorMessage = zodErrors.join('; ');
          } else {
            // Check if it's a technical error or user-friendly
            const technicalErrors = [
              'Invalid value provided',
              'Expected',
              'prisma',
              'Prisma',
              'invocation',
              'route.js'
            ];
            
            const isTechnicalError = technicalErrors.some(tech => error.message.includes(tech));
            
            if (isTechnicalError) {
              // Technical error - use generic message but include field info if available
              errorMessage = 'Invalid data format or missing required information';
              
              // Try to extract field name from error message
              const fieldMatch = error.message.match(/(?:at|for|field)\s+["']?(\w+)["']?/i);
              if (fieldMatch) {
                errorMessage = `Invalid ${fieldMatch[1]} format or missing required information`;
              }
            } else {
              // User-friendly error - use as is
              errorMessage = error.message;
            }
          }
        }
        
        validationErrors.push({ 
          row: rowNumber, 
          error: errorMessage
        });
        
        // Log technical details for debugging
        console.error(`Error validating customer at row ${rowNumber}:`, {
          message: error.message,
          name: error.name,
          code: error.code,
          customerData: customerData,
          stack: error.stack
        });
      }
    }

    // Step 2: If ANY validation errors, return errors WITHOUT importing anything (all-or-nothing)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        ResponseBuilder.success('CUSTOMERS_IMPORTED', {
          imported: 0,
          failed: validationErrors.length,
          total: customers.length,
          errors: validationErrors
        })
      );
    }

    // Step 3: Check for duplicates and filter them out
    const customersToImport: any[] = [];
    const skipped: Array<{ row: number; reason: string }> = [];

    // Check duplicates before transaction
    for (const validatedCustomer of validatedCustomers) {
      try {
        // Check if customer with same phone or email already exists
        const whereClause: any = {
          merchantId: merchant.id
        };

        const orConditions: any[] = [];
        if (validatedCustomer.data.phone) {
          const phoneStr = String(validatedCustomer.data.phone).trim();
          if (phoneStr !== '') {
            orConditions.push({ phone: phoneStr });
          }
        }
        if (validatedCustomer.data.email) {
          const emailStr = String(validatedCustomer.data.email).trim();
          if (emailStr !== '') {
            orConditions.push({ email: emailStr });
          }
        }

        if (orConditions.length > 0) {
          whereClause.OR = orConditions;

          const existingCustomer = await prisma.customer.findFirst({
            where: whereClause
          });

          if (existingCustomer) {
            skipped.push({
              row: validatedCustomer.rowNumber,
              reason: 'Customer with this phone number or email already exists'
            });
            continue;
          }
        }

        customersToImport.push(validatedCustomer);
      } catch (error: any) {
        // If error checking duplicate, skip this customer
        skipped.push({
          row: validatedCustomer.rowNumber,
          reason: 'Failed to check duplicate'
        });
        console.error(`Error checking duplicate for customer at row ${validatedCustomer.rowNumber}:`, error);
      }
    }

    // Step 4: Import non-duplicate customers in a single transaction
    if (customersToImport.length === 0) {
      return NextResponse.json(
        ResponseBuilder.success('CUSTOMERS_IMPORTED', {
          imported: 0,
          skipped: skipped.length,
          failed: 0,
          total: customers.length,
          errors: []
        })
      );
    }

    try {
      const results = await prisma.$transaction(async (tx: any) => {
        const imported: any[] = [];
        const transactionSkipped: Array<{ row: number; reason: string }> = [];

        for (const validatedCustomer of customersToImport) {
          try {
          const customer = await tx.customer.create({
            data: {
                firstName: validatedCustomer.data.firstName || '',
                lastName: validatedCustomer.data.lastName ? String(validatedCustomer.data.lastName).trim() || null : null,
                phone: validatedCustomer.data.phone ? String(validatedCustomer.data.phone).trim() || null : null,
                email: validatedCustomer.data.email ? String(validatedCustomer.data.email).trim() || null : null,
                address: validatedCustomer.data.address ? String(validatedCustomer.data.address).trim() || null : null,
                city: validatedCustomer.data.city ? String(validatedCustomer.data.city).trim() || null : null,
                state: validatedCustomer.data.state ? String(validatedCustomer.data.state).trim() || null : null,
                zipCode: validatedCustomer.data.zipCode ? String(validatedCustomer.data.zipCode).trim() || null : null,
                country: validatedCustomer.data.country ? String(validatedCustomer.data.country).trim() || null : null,
                idNumber: validatedCustomer.data.idNumber ? String(validatedCustomer.data.idNumber).trim() || null : null,
                notes: validatedCustomer.data.notes ? String(validatedCustomer.data.notes).trim() || null : null,
                dateOfBirth: validatedCustomer.dateOfBirth,
                idType: validatedCustomer.data.idType || null,
              isActive: true,
                merchantId: merchant.id // Use merchant.id (number/publicId)
            }
          });

          imported.push(customer);
        } catch (error: any) {
            // If duplicate (P2002), skip and continue instead of throwing
            if (error.code === 'P2002') {
              // Unique constraint violation - skip this customer and continue
              transactionSkipped.push({
                row: validatedCustomer.rowNumber,
                reason: 'Customer with this phone number or email already exists'
              });
              console.log(`Skipping duplicate customer at row ${validatedCustomer.rowNumber}`);
              continue; // Skip this customer and continue with next
            }
            
            // For other errors, throw to rollback transaction
            let errorMessage = 'Failed to import customer';
            
            if (error.code === 'P2003') {
              // Foreign key constraint violation
              errorMessage = 'Invalid merchant reference';
            } else if (error.message) {
              // Check if it's a technical error or user-friendly
              const technicalErrors = [
                'Invalid value provided',
                'Expected',
                'prisma',
                'Prisma',
                'invocation',
                'route.js'
              ];
              
              const isTechnicalError = technicalErrors.some(tech => error.message.includes(tech));
              
              if (isTechnicalError) {
                // Technical error - use generic message
                errorMessage = 'Invalid data format or missing required information';
              } else {
                // User-friendly error - use as is
                errorMessage = error.message;
              }
            }
            
            // Log technical details for debugging
            console.error(`Error importing customer at row ${validatedCustomer.rowNumber}:`, {
              message: error.message,
              code: error.code,
              stack: error.stack
            });
            
            // Throw error with row number to rollback entire transaction (all-or-nothing)
            throw new Error(`Row ${validatedCustomer.rowNumber}: ${errorMessage}`);
          }
        }

        return { imported, skipped: transactionSkipped };
      });

      // Combine pre-transaction skipped with transaction skipped
      const allSkipped = [...skipped, ...(results.skipped || [])];

      return NextResponse.json(
        ResponseBuilder.success('CUSTOMERS_IMPORTED', {
          imported: results.imported.length,
          skipped: allSkipped.length,
          failed: 0,
          total: customers.length,
          errors: []
        })
      );
    } catch (transactionError: any) {
      // Transaction failed - rollback occurred automatically
      // Format user-friendly error message
      let errorMessage = 'Failed to import customers. Transaction rolled back.';
      
      if (transactionError.message) {
        // Check if error message contains row number
        if (transactionError.message.includes('Row ')) {
          // Extract row number and error
          const match = transactionError.message.match(/Row (\d+): (.+)/);
          if (match) {
            const rowNumber = parseInt(match[1]);
            const rowError = match[2];
            
            return NextResponse.json(
              ResponseBuilder.success('CUSTOMERS_IMPORTED', {
                imported: 0,
                failed: 1,
                total: customers.length,
                errors: [{ row: rowNumber, error: rowError }]
              })
            );
          }
        }
        
        // Check if it's a technical error or user-friendly
        const technicalErrors = [
          'Invalid value provided',
          'Expected',
          'prisma',
          'Prisma',
          'invocation',
          'route.js'
        ];
        
        const isTechnicalError = technicalErrors.some(tech => transactionError.message.includes(tech));
        
        if (!isTechnicalError) {
          errorMessage = transactionError.message;
        }
      }
      
      // Log technical details for debugging
      console.error('Transaction error in bulk import:', {
        message: transactionError.message,
        code: transactionError.code,
        stack: transactionError.stack
    });

    return NextResponse.json(
      ResponseBuilder.success('CUSTOMERS_IMPORTED', {
          imported: 0,
          failed: customers.length,
        total: customers.length,
          errors: [{ row: 1, error: errorMessage }]
      })
    );
    }
  } catch (error) {
    console.error('Error in bulk import:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

