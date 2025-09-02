import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { verifyTokenSimple } from '../../lib/jwt-edge';
import { z } from 'zod';

// Validation schemas
const merchantSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'json']).default('string'),
  category: z.enum(['general', 'business', 'notifications', 'integrations']).default('general'),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
});

const updateMerchantSettingSchema = z.object({
  value: z.string(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

// GET /api/settings/merchant - Get merchant settings
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user has merchant access
    if (!user.merchantId) {
      return NextResponse.json(
        { success: false, message: 'Merchant access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    // Build where clause
    const where: any = {
      merchantId: user.merchantId
    };
    if (category) {
      where.category = category;
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const settings = await prisma.merchantSetting.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    });

    // Transform settings to include typed values
    const transformedSettings = settings.map(setting => ({
      id: setting.publicId,
      key: setting.key,
      value: parseSettingValue(setting.value, setting.type),
      type: setting.type,
      category: setting.category,
      description: setting.description,
      isActive: setting.isActive,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt
    }));

    return NextResponse.json({
      success: true,
      data: transformedSettings
    });

  } catch (error) {
    console.error('Error fetching merchant settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch merchant settings' },
      { status: 500 }
    );
  }
}

// POST /api/settings/merchant - Create new merchant setting
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user has merchant access and can manage settings
    if (!user.merchantId || !['ADMIN', 'MERCHANT'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions. Merchant admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = merchantSettingSchema.parse(body);

    // Check if setting with this key already exists for this merchant
    const existingSetting = await prisma.merchantSetting.findUnique({
      where: { 
        merchantId_key: {
          merchantId: user.merchantId,
          key: validatedData.key
        }
      }
    });

    if (existingSetting) {
      return NextResponse.json(
        { success: false, message: 'Setting with this key already exists for this merchant' },
        { status: 409 }
      );
    }

    // Get next public ID
    const lastSetting = await prisma.merchantSetting.findFirst({
      orderBy: { publicId: 'desc' }
    });
    const nextPublicId = (lastSetting?.publicId || 0) + 1;

    const setting = await prisma.merchantSetting.create({
      data: {
        publicId: nextPublicId,
        merchantId: user.merchantId,
        key: validatedData.key,
        value: validatedData.value,
        type: validatedData.type,
        category: validatedData.category,
        description: validatedData.description,
        isActive: validatedData.isActive
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: setting.publicId,
        key: setting.key,
        value: parseSettingValue(setting.value, setting.type),
        type: setting.type,
        category: setting.category,
        description: setting.description,
        isActive: setting.isActive,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating merchant setting:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create merchant setting' },
      { status: 500 }
    );
  }
}

// Helper function to parse setting values based on type
function parseSettingValue(value: string, type: string): any {
  try {
    switch (type) {
      case 'number':
        return parseFloat(value);
      case 'boolean':
        return value === 'true';
      case 'json':
        return JSON.parse(value);
      default:
        return value;
    }
  } catch (error) {
    return value; // Return as string if parsing fails
  }
}
