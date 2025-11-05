import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { productsQuerySchema, productCreateSchema, assertPlanLimit, handleApiError, ResponseBuilder, deleteFromS3, commitStagingFiles, generateAccessUrl, processProductImages, uploadToS3, getTenantDbFromRequest } from '@rentalshop/utils/api';
import { searchRateLimiter } from '@rentalshop/middleware';
import { API } from '@rentalshop/constants';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/products
 * Get products with filtering and pagination using simplified database API
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const GET = withManagementAuth(async (request, { user }) => {
  console.log(`🔍 GET /api/products - User: ${user.email} (${user.role})`);
  
  try {
    // Apply rate limiting
    const rateLimitResult = searchRateLimiter(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;

    const { searchParams } = new URL(request.url);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    
    const parsed = productsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      console.log('Validation error:', parsed.error.flatten());
      return NextResponse.json(
        ResponseBuilder.error('VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { 
      page, 
      limit,
      q, 
      search, 
      merchantId: queryMerchantId, // Ignore in multi-tenant
      categoryId, 
      outletId: queryOutletId,
      available,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder
    } = parsed.data;

    console.log('Parsed filters:', { 
      page, limit, q, search, categoryId, queryOutletId, 
      available, minPrice, maxPrice, sortBy, sortOrder 
    });
    
    // Build where clause - NO merchantId needed
    const where: any = {
      isActive: true // Default to active products
    };
    
    // Outlet filtering - use outletStock relationship
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      where.outletStock = {
        some: {
          outletId: user.outletId
        }
      };
    } else if (queryOutletId && user.role === 'MERCHANT') {
      where.outletStock = {
        some: {
          outletId: queryOutletId
        }
      };
    }
    
    // Category filtering
    if (categoryId) {
      where.categoryId = categoryId;
    }
    
    // Price filtering
    if (minPrice || maxPrice) {
      where.rentPrice = {};
      if (minPrice) where.rentPrice.gte = minPrice;
      if (maxPrice) where.rentPrice.lte = maxPrice;
    }
    
    // Available filtering - check outletStock
    if (available !== undefined) {
      if (available === true) {
        where.outletStock = {
          ...where.outletStock,
          some: {
            available: { gt: 0 }
          }
        };
      } else {
        where.outletStock = {
          ...where.outletStock,
          none: {
            available: { gt: 0 }
          }
        };
      }
    }
    
    // Search functionality
    const searchTerm = q || search;
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { barcode: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    const pageNum = page || 1;
    const limitNum = limit || 20;
    const offset = (pageNum - 1) * limitNum;
    
    console.log('🔍 Using Prisma with where clause:', where);
    
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: {
          category: true,
          outletStock: {
            include: { outlet: true }
          }
        },
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
        take: limitNum,
        skip: offset
      }),
      db.product.count({ where })
    ]);
    
    console.log('✅ Search completed, found:', products.length, 'products');

    // Process product images - parse from database format
    const processedProducts = products.map((product: any) => {
      let imageUrls: string[] = [];
      
      // Images are stored as JSON string in database
      if (typeof product.images === 'string') {
        try {
          const parsed = JSON.parse(product.images);
          // Handle both cases: JSON array string or already parsed
          imageUrls = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // Not JSON, treat as comma-separated
          imageUrls = product.images.split(',').filter(Boolean);
        }
      } else if (Array.isArray(product.images)) {
        imageUrls = product.images;
      }
      
      return {
        ...product,
        images: imageUrls
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        products: processedProducts,
        total: total,
        page: pageNum,
        limit: limitNum,
        offset: offset,
        hasMore: pageNum * limitNum < total,
        totalPages: Math.ceil(total / limitNum)
      },
      code: "PRODUCTS_FOUND",
      message: `Found ${total} products`
    });

  } catch (error) {
    console.error('Error in GET /api/products:', error);
    return NextResponse.json(
      ResponseBuilder.error('FETCH_PRODUCTS_FAILED'),
      { status: 500 }
    );
  }
});

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
 * POST /api/products
 * Create a new product using simplified database API
 * SUPPORTS: Both JSON payload and multipart FormData with file uploads
 * REFACTORED: Now uses unified withAuth pattern
 * Requires active subscription
 */
export const POST = withManagementAuth(async (request, { user }) => {
  console.log(`🔍 POST /api/products - User: ${user.email} (${user.role})`);
  
  // Store parsed data for potential cleanup
  let uploadedImages: string[] = [];
  
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db, subdomain } = result;
    const contentType = request.headers.get('content-type') || '';
    let parsedResult: any;
    let productDataFromRequest: any = {};
    let uploadedFiles: string[] = [];

    // Check if request contains multipart form data
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
      
      // Combine uploaded files with existing images
      const existingImages = productDataFromRequest.images || [];
      const allImages = [
        ...(Array.isArray(existingImages) ? existingImages : existingImages ? [existingImages] : []),
        ...uploadedFiles
      ];
      // Ensure allImages is properly normalized (not stringified JSON)
      productDataFromRequest.images = allImages.map(img => {
        if (typeof img === 'string' && img.trim().startsWith('[') && img.trim().endsWith(']')) {
          try {
            const parsed = JSON.parse(img);
            return Array.isArray(parsed) ? parsed[0] : img;
          } catch {
            return img;
          }
        }
        return img;
      }).flat().filter(Boolean);
      
    } else {
      // Handle regular JSON request
      console.log('🔍 Processing JSON request');
      const body = await request.json();
      productDataFromRequest = body;
      
      // Normalize images to array of strings
      if (productDataFromRequest.images !== undefined) {
        if (Array.isArray(productDataFromRequest.images)) {
          productDataFromRequest.images = productDataFromRequest.images.filter(Boolean);
        } else if (typeof productDataFromRequest.images === 'string') {
          productDataFromRequest.images = productDataFromRequest.images
            .split(',')
            .filter(Boolean)
            .map((url: string) => url.trim());
        }
        
        if (productDataFromRequest.images.length === 0) {
          delete productDataFromRequest.images;
        }
      }
    }

    // Validate product data
    parsedResult = productCreateSchema.safeParse(productDataFromRequest);
    if (!parsedResult.success) {
      return NextResponse.json(
        ResponseBuilder.error('VALIDATION_ERROR', parsedResult.error.flatten()),
        { status: 400 }
      );
    }
    
    const parsed = parsedResult;

    console.log('🔍 Raw outletStock from request:', parsed.data.outletStock);
    
    // Check for duplicate product name (no merchantId needed - DB is isolated)
    const existingProduct = await db.product.findFirst({
      where: {
        name: parsed.data.name,
        isActive: true
      }
    });

    if (existingProduct) {
      console.log('❌ Product name already exists:', parsed.data.name);
      return NextResponse.json(
        ResponseBuilder.error('PRODUCT_NAME_EXISTS', `A product with the name "${parsed.data.name}" already exists. Please choose a different name.`),
        { status: 409 }
      );
    }

    // Handle outletStock
    let outletStock: Array<{ outletId: number; stock: number }>;
    if (parsed.data.outletStock && Array.isArray(parsed.data.outletStock) && parsed.data.outletStock.length > 0) {
      // Use provided outletStock
      outletStock = parsed.data.outletStock.map((os: any) => ({
        outletId: os.outletId,
        stock: os.stock || 0,
      }));
      console.log('🔍 Using provided outletStock:', outletStock);
    } else {
      // Auto-create outletStock from default outlet
      console.log('🔍 No outletStock provided, using default outlet');
      
      const defaultOutlet = await db.outlet.findFirst({
        where: {
          isDefault: true
        }
      });
      
      if (!defaultOutlet) {
        return NextResponse.json(
          ResponseBuilder.error('DEFAULT_OUTLET_NOT_FOUND', 'No default outlet found. Please create an outlet first.'),
          { status: 404 }
        );
      }
      
      outletStock = [{
        outletId: defaultOutlet.id,
        stock: parsed.data.totalStock || 0
      }];
      
      console.log('✅ Using default outlet:', defaultOutlet.name, 'with stock:', outletStock[0].stock);
    }
    
    const totalStock = outletStock.reduce((sum, os) => sum + (Number(os.stock) || 0), 0);
    console.log('🔍 Final outletStock:', outletStock);
    console.log('🔍 Calculated totalStock:', totalStock);

    // Handle images - Support both uploaded files and staging files
    let imagesValue = parsed.data.images;
    let stagingKeys: string[] = [];
    let committedImageUrls: string[] = [];

    if (imagesValue && imagesValue.length > 0) {
      // Parse images (could be array, string, or comma-separated)
      const imageUrls = Array.isArray(imagesValue) 
        ? imagesValue 
        : typeof imagesValue === 'string' 
          ? imagesValue.split(',').filter(Boolean)
          : [];

      // Extract staging keys from URLs (both uploaded files and existing staging files)
      stagingKeys = imageUrls
        .filter(url => url && url.includes('amazonaws.com'))
        .map(url => {
          const urlParts = url.split('amazonaws.com/');
          return urlParts.length > 1 ? urlParts[1].split('?')[0] : null;
        })
        .filter((key): key is string => key !== null && key.startsWith('staging/'));

      console.log('🔍 Found staging keys to commit:', stagingKeys);
      console.log('🔍 All image URLs:', imageUrls);

      // Commit staging files to production (including newly uploaded files)
      if (stagingKeys.length > 0) {
        // Use product/subdomain/ structure for better organization
        const targetFolder = `product/${subdomain}`;
        const commitResult = await commitStagingFiles(stagingKeys, targetFolder);
        
        if (commitResult.success) {
          // Generate production URLs with presigned access
          const productionUrls = await Promise.all(
            commitResult.committedKeys.map(async (key) => {
              const presignedUrl = await generateAccessUrl(key, 86400 * 365); // 1 year expiration
              if (presignedUrl) {
                return presignedUrl;
              }
              // Fallback to direct URL if presigned fails
              const region = process.env.AWS_REGION || 'ap-southeast-1';
              const bucketName = process.env.AWS_S3_BUCKET_NAME || 'anyrent-images';
              return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
            })
          );
          
          // Map staging URLs to production URLs
          committedImageUrls = imageUrls.map(url => {
            const urlParts = url.split('amazonaws.com/');
            if (urlParts.length > 1) {
              const key = urlParts[1].split('?')[0];
              const committedKey = commitResult.committedKeys.find(ck => 
                ck.replace('product/', '') === key.replace('staging/', '')
              );
              if (committedKey) {
                return productionUrls[commitResult.committedKeys.indexOf(committedKey)];
              }
            }
            return url; // Keep original URL if not found in staging
          });
          
          console.log('✅ Committed staging files with presigned URLs:', committedImageUrls);
        } else {
          console.error('❌ Failed to commit staging files:', commitResult.errors);
          // Continue with original URLs if commit fails
          committedImageUrls = imageUrls;
        }
      } else {
        // No staging files, but ensure URLs have presigned access if they're S3 URLs
        committedImageUrls = await Promise.all(
          imageUrls.map(async (url) => {
            // If it's already a presigned URL or external URL, keep it as is
            if (url.includes('?') || !url.includes('amazonaws.com')) {
              return url;
            }
            
            // Extract key from S3 URL and generate presigned URL
            const urlParts = url.split('amazonaws.com/');
            if (urlParts.length > 1) {
              const key = urlParts[1];
              const presignedUrl = await generateAccessUrl(key, 86400 * 365);
              return presignedUrl || url;
            }
            
            return url;
          })
        );
      }
    }

    // Use committed URLs for product data
    if (Array.isArray(imagesValue)) {
      imagesValue = JSON.stringify(committedImageUrls);
    } else if (typeof imagesValue === 'string') {
      imagesValue = committedImageUrls.join(',');
    }

    // Build product data (NO merchant connection needed - DB is isolated)
    const finalProductData: any = {
      name: parsed.data.name,
      description: parsed.data.description,
      barcode: parsed.data.barcode,
      totalStock,
      rentPrice: parsed.data.rentPrice ?? 0,
      salePrice: parsed.data.salePrice ?? undefined,
      deposit: parsed.data.deposit ?? 0,
      images: imagesValue,
      outletStock: {
        create: outletStock.map(os => ({
          outlet: { connect: { id: os.outletId } },
          stock: os.stock
        }))
      }
    };

    // Only add category connection if categoryId is provided
    // If not provided, use default category
    if (parsed.data.categoryId) {
      finalProductData.category = { connect: { id: parsed.data.categoryId } };
    } else {
      // Find default category
      const defaultCategory = await db.category.findFirst({
        where: { isDefault: true }
      });
      if (defaultCategory) {
        finalProductData.category = { connect: { id: defaultCategory.id } };
      }
    }

    console.log('🔍 Creating product with data:', finalProductData);
    
    // Create product using Prisma
    const product = await db.product.create({
      data: finalProductData,
      include: {
        category: true,
        outletStock: {
          include: { outlet: true }
        }
      }
    });
    console.log('✅ Product created successfully:', product);

    // Parse images from database response to return array
    let imageUrls: string[] = [];
    if (typeof product.images === 'string') {
      try {
        const parsed = JSON.parse(product.images);
        imageUrls = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        imageUrls = product.images.split(',').filter(Boolean);
      }
    } else if (Array.isArray(product.images)) {
      imageUrls = product.images as string[];
    }

    // Return product with parsed images
    const responseProduct = {
      ...product,
      images: imageUrls
    };

    return NextResponse.json({
      success: true,
      data: responseProduct,
      code: 'PRODUCT_CREATED_SUCCESS',
      message: 'Product created successfully'
    });

  } catch (error: any) {
    console.error('Error in POST /api/products:', error);
    
    // Note: With Two-Phase Upload Pattern, staging files remain in staging/
    // They will be cleaned up by background job or TTL policy
    // No manual cleanup needed on product creation failure
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

