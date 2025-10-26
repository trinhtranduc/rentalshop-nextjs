import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withManagementAuth } from '@rentalshop/auth';
import { productUpdateSchema, handleApiError, ResponseBuilder, processProductImages, uploadToS3, generateAccessUrl, commitStagingFiles } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * Helper function to validate image file
 */
function validateImage(file: File): { isValid: boolean; error?: string } {
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  
  const fileTypeLower = file.type.toLowerCase().trim();
  const fileNameLower = file.name.toLowerCase().trim();
  
  const isValidMimeType = fileTypeLower ? ALLOWED_TYPES.some(type => 
    fileTypeLower === type.toLowerCase()
  ) : false;
  
  const isValidExtension = ALLOWED_EXTENSIONS.some(ext => 
    fileNameLower.endsWith(ext)
  );
  
  if (!isValidMimeType && !isValidExtension) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')} or extensions: ${ALLOWED_EXTENSIONS.join(',')}. File type: "${file.type}", File name: "${file.name}"`
    };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
    };
  }
  
  if (file.size < 100) {
    return {
      isValid: false,
      error: 'File size is too small, file may be corrupted'
    };
  }
  
  return { isValid: true };
}

/**
 * GET /api/products/[id]
 * Get product by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withManagementAuth(async (request, { user, userScope }) => {
    try {
      const { id } = params;
      console.log('🔍 GET /api/products/[id] - Looking for product with ID:', id);

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_PRODUCT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const productId = parseInt(id);
      
      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      if (!userMerchantId) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 400 }
        );
      }
      
      // Get product using the simplified database API
      const product = await db.products.findById(productId);

      if (!product) {
        console.log('❌ Product not found in database for productId:', productId);
        throw new Error('Product not found');
      }

      console.log('✅ Product found, transforming data...');

      // Process images to generate presigned URLs for thumbnail display
      const processedImages = await processProductImages(product.images, 86400 * 7); // 7 days expiration

      // Transform the data to match the expected format
      const transformedProduct = {
        id: product.id, // Return id directly to frontend
        name: product.name,
        description: product.description,
        barcode: product.barcode,
        categoryId: product.categoryId,
        rentPrice: product.rentPrice,
        salePrice: product.salePrice,
        deposit: product.deposit,
        totalStock: product.totalStock,
        images: processedImages,
        isActive: product.isActive,
        category: product.category,
        merchant: product.merchant,
        outletStock: product.outletStock.map((os: any) => ({
          id: os.id,
          outletId: os.outlet.id, // Use id for frontend
          stock: os.stock,
          available: os.available,
          renting: os.renting,
          outlet: {
            id: os.outlet.id, // Use id for frontend
            name: os.outlet.name,
            address: os.outlet.address || null // Include address if available
          }
        })),
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString()
      };

      console.log('✅ Transformed product data:', transformedProduct);

      return NextResponse.json({
        success: true,
        data: transformedProduct,
        code: 'PRODUCT_RETRIEVED_SUCCESS',
        message: 'Product retrieved successfully'
      });

    } catch (error) {
      console.error('❌ Error fetching product:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * PUT /api/products/[id]
 * Update product by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withManagementAuth(async (request, { user, userScope }) => {
    try {
      const { id } = params;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_PRODUCT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const productId = parseInt(id);

      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      if (!userMerchantId) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 400 }
        );
      }

      // Parse and validate request body - handle both JSON and multipart form data
      const contentType = request.headers.get('content-type') || '';
      let productDataFromRequest: any = {};
      let uploadedFiles: string[] = [];

      if (contentType.includes('multipart/form-data')) {
        console.log('🔍 Processing multipart form data with file uploads');
        
        const formData = await request.formData();
        
        // Extract JSON data from form fields
        const jsonDataStr = formData.get('data') as string;
        if (!jsonDataStr) {
          return NextResponse.json(
            ResponseBuilder.error('MISSING_PRODUCT_DATA'),
            { status: 400 }
          );
        }
        
        try {
          productDataFromRequest = JSON.parse(jsonDataStr);
          
          // Fix outletStock if it's a string (mobile app compatibility)
          if (productDataFromRequest.outletStock && typeof productDataFromRequest.outletStock === 'string') {
            try {
              productDataFromRequest.outletStock = JSON.parse(productDataFromRequest.outletStock);
            } catch (parseError) {
              console.log('⚠️ Failed to parse outletStock string:', productDataFromRequest.outletStock);
            }
          }
          
          // Fix images field - handle various formats (mobile app compatibility)
          if (productDataFromRequest.images !== undefined) {
            console.log('🔍 Original images value (PUT):', JSON.stringify(productDataFromRequest.images));
            
            if (Array.isArray(productDataFromRequest.images)) {
              // Process each item in array - handle string JSON objects
              productDataFromRequest.images = productDataFromRequest.images
                .map(img => {
                  // If item is a string that looks like JSON, parse it
                  if (typeof img === 'string' && img.trim().startsWith('[') && img.trim().endsWith(']')) {
                    try {
                      const parsed = JSON.parse(img);
                      console.log('🔍 Parsed JSON string (PUT):', parsed);
                      return Array.isArray(parsed) ? parsed : [img];
                    } catch (e) {
                      console.log('⚠️ Failed to parse JSON (PUT):', e);
                      return [img];
                    }
                  }
                  // Return as single-item array if it's already a string URL
                  return typeof img === 'string' ? [img] : img;
                })
                .flat(); // Flatten nested arrays
              
              console.log('✅ Normalized images (PUT):', JSON.stringify(productDataFromRequest.images));
              
              if (productDataFromRequest.images.length === 0) {
                delete productDataFromRequest.images;
              }
            } else if (typeof productDataFromRequest.images === 'string') {
              // Convert string to array
              if (productDataFromRequest.images.trim() === '') {
                delete productDataFromRequest.images;
              } else {
                try {
                  const parsed = JSON.parse(productDataFromRequest.images);
                  productDataFromRequest.images = Array.isArray(parsed) ? parsed : [productDataFromRequest.images];
                  console.log('✅ Parsed images string (PUT):', productDataFromRequest.images);
                } catch {
                  productDataFromRequest.images = productDataFromRequest.images.split(',').filter(Boolean);
                }
              }
            }
          }
          // If images is undefined or null, leave it as is (optional field)
        } catch (parseError) {
          return NextResponse.json(
            ResponseBuilder.error('INVALID_JSON_DATA'),
            { status: 400 }
          );
        }

        // Handle file uploads
        const imageFiles = formData.getAll('images') as File[];
        console.log(`🔍 Found ${imageFiles.length} image files`);
        
        for (const file of imageFiles) {
          if (file && file.size > 0) {
            const validation = validateImage(file);
            if (!validation.isValid) {
              return NextResponse.json(
                ResponseBuilder.error('IMAGE_VALIDATION_FAILED', { details: validation.error }),
                { status: 400 }
              );
            }
            
            // Convert file to buffer and upload to S3
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            
            const uploadResult = await uploadToS3(buffer, {
              folder: 'staging',
              fileName: file.name,
              contentType: file.type,
              preserveOriginalName: false
            });
            
            if (uploadResult.success && uploadResult.data) {
              // Use CloudFront URL if available, otherwise fallback to S3 URL
              const accessUrl = uploadResult.data.url; // Already uses CloudFront if configured
              uploadedFiles.push(accessUrl);
              console.log(`✅ Uploaded image: ${file.name} -> ${accessUrl}`);
            } else {
              console.error(`❌ Failed to upload ${file.name}:`, uploadResult.error);
              return NextResponse.json(
                ResponseBuilder.error('IMAGE_UPLOAD_FAILED', { details: uploadResult.error }),
                { status: 500 }
              );
            }
          }
        }
        
        // Combine uploaded files with existing images (only if there are files)
        if (uploadedFiles.length > 0) {
          // Extract staging keys from uploaded files
          const stagingKeys = uploadedFiles.map(url => {
            const urlParts = url.split('amazonaws.com/');
            if (urlParts.length > 1) {
              return urlParts[1].split('?')[0];
            }
            return null;
          }).filter(Boolean) as string[];
          
          console.log('🔍 Found staging keys to commit:', stagingKeys);
          
          // Commit staging files to production
          if (stagingKeys.length > 0) {
            const commitResult = await commitStagingFiles(stagingKeys, 'product');
            
            if (commitResult.success) {
              // Generate production URLs using CloudFront directly
              const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
              const productionUrls = commitResult.committedKeys.map(key => {
                // Always use CloudFront URL if configured, otherwise S3 URL
                if (cloudfrontDomain) {
                  return `https://${cloudfrontDomain}/${key}`;
                }
                // Fallback to direct URL if CloudFront not configured
                const region = process.env.AWS_REGION || 'ap-southeast-1';
                const bucketName = process.env.AWS_S3_BUCKET_NAME || 'anyrent-images';
                return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
              });
              
              // Map staging URLs to production URLs
              const updatedUploadedFiles = uploadedFiles.map(url => {
                // Extract key from CloudFront or S3 URL
                let key = '';
                if (url.includes('amazonaws.com/')) {
                  // S3 URL
                  const urlParts = url.split('amazonaws.com/');
                  key = urlParts[1]?.split('?')[0] || '';
                } else if (cloudfrontDomain && url.includes(cloudfrontDomain)) {
                  // CloudFront URL
                  key = url.split(cloudfrontDomain + '/')[1] || '';
                }
                
                if (key) {
                  const committedKey = commitResult.committedKeys.find(ck => 
                    ck.replace('product/', '') === key.replace('staging/', '')
                  );
                  if (committedKey) {
                    return productionUrls[commitResult.committedKeys.indexOf(committedKey)];
                  }
                }
                return url; // Fallback to original URL
              });
              
              const existingImages = productDataFromRequest.images || [];
              const allImages = [
                ...(Array.isArray(existingImages) ? existingImages : existingImages ? [existingImages] : []),
                ...updatedUploadedFiles
              ];
              // Store images as JSON array for database
              productDataFromRequest.images = allImages;
            } else {
              console.error('❌ Failed to commit staging files:', commitResult.errors);
              // Fallback to staging URLs if commit fails
              const existingImages = productDataFromRequest.images || [];
              const allImages = [
                ...(Array.isArray(existingImages) ? existingImages : existingImages ? [existingImages] : []),
                ...uploadedFiles
              ];
              productDataFromRequest.images = allImages;
            }
          }
        }
        
      } else {
        // Handle regular JSON request
        console.log('🔍 Processing JSON request');
      const body = await request.json();
        productDataFromRequest = body;
      }

      console.log('🔍 PUT /api/products/[id] - Update request body:', productDataFromRequest);

      // Validate input data
      const validatedData = productUpdateSchema.parse(productDataFromRequest);
      console.log('✅ Validated update data:', validatedData);
      
      // Extract outletStock from validated data
      const { outletStock, ...productUpdateData } = validatedData;
      console.log('🔍 PUT /api/products/[id] - Processing outletStock:', outletStock);

      // Check if product exists and user has access to it
      const existingProduct = await db.products.findById(productId);
      if (!existingProduct) {
        throw new Error('Product not found');
      }

      // Check for duplicate product name if name is being updated
      if (productUpdateData.name && productUpdateData.name !== existingProduct.name) {
        const duplicateProduct = await db.products.findFirst({
          name: productUpdateData.name,
          merchantId: userMerchantId,
          isActive: true,
          id: { not: productId }
        });

        if (duplicateProduct) {
          console.log('❌ Product name already exists:', productUpdateData.name);
          return NextResponse.json(
            ResponseBuilder.error('PRODUCT_NAME_EXISTS', `A product with the name "${productUpdateData.name}" already exists. Please choose a different name.`),
            { status: 409 }
          );
        }
      }

      // Prepare outletStock nested write if provided
      let finalUpdateData: any = { ...productUpdateData };
      
      if (outletStock && Array.isArray(outletStock) && outletStock.length > 0) {
        console.log('🔄 Preparing outlet stock nested write:', outletStock);
        
        // Verify all outlets exist first using db API
        const validOutletStock = [];
        for (const stock of outletStock) {
          if (stock.outletId && typeof stock.stock === 'number') {
            console.log(`🔍 Verifying outlet ID: ${stock.outletId}`);
            const outlet = await db.outlets.findById(stock.outletId);
            if (outlet) {
              console.log(`✅ Found outlet:`, { id: outlet.id, name: outlet.name });
              // For nested write, we need to use outlet's database ID (number)
              validOutletStock.push({
                outletId: outlet.id, // Use id (number) for nested write
                stock: stock.stock,
                available: stock.stock,
                renting: 0
              });
            } else {
              console.log(`❌ Outlet not found for ID: ${stock.outletId}`);
            }
          } else {
            console.log(`❌ Invalid outletStock entry:`, stock);
          }
        }
        
        if (validOutletStock.length > 0) {
          // Use nested write to replace all outlet stock
          finalUpdateData.outletStock = {
            deleteMany: {}, // Delete all existing outlet stock
            create: validOutletStock // Create new ones
          };
          console.log('✅ Prepared outletStock nested write:', finalUpdateData.outletStock);
        }
      } else {
        console.log('ℹ️ No outletStock provided or empty array');
      }

      // Update the product using the simplified database API with nested write
      const updatedProduct = await db.products.update(productId, finalUpdateData);
      console.log('✅ Product updated successfully with outletStock:', updatedProduct);

      // Transform the response to match frontend expectations
      const transformedProduct = {
        id: updatedProduct.id, // Return id directly to frontend
        name: updatedProduct.name,
        description: updatedProduct.description,
        barcode: updatedProduct.barcode,
        categoryId: updatedProduct.categoryId,
        rentPrice: updatedProduct.rentPrice,
        salePrice: updatedProduct.salePrice,
        deposit: updatedProduct.deposit,
        totalStock: updatedProduct.totalStock,
        images: updatedProduct.images,
        isActive: updatedProduct.isActive,
        category: updatedProduct.category,
        merchant: updatedProduct.merchant,
        createdAt: updatedProduct.createdAt.toISOString(),
        updatedAt: updatedProduct.updatedAt.toISOString()
      };

      return NextResponse.json({
        success: true,
        data: transformedProduct,
        code: 'PRODUCT_UPDATED_SUCCESS',
        message: 'Product updated successfully'
      });

    } catch (error) {
      console.error('❌ Error updating product:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * DELETE /api/products/[id]
 * Delete product by ID (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withManagementAuth(async (request, { user, userScope }) => {
    try {
      const { id } = params;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_PRODUCT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const productId = parseInt(id);

      // Get user scope for merchant isolation
      const userMerchantId = userScope.merchantId;
      
      if (!userMerchantId) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 400 }
        );
      }

      // Check if product exists and user has access to it
      const existingProduct = await db.products.findById(productId);
      if (!existingProduct) {
        throw new Error('Product not found');
      }

      // Soft delete by setting isActive to false
      const deletedProduct = await db.products.update(productId, { isActive: false });
      console.log('✅ Product soft deleted successfully:', deletedProduct);

      return NextResponse.json({
        success: true,
        data: deletedProduct,
        code: 'PRODUCT_DELETED_SUCCESS',
        message: 'Product deleted successfully'
      });

    } catch (error) {
      console.error('❌ Error deleting product:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
