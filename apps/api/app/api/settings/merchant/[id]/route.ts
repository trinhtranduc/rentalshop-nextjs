import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';
import { z } from 'zod';
import {API} from '@rentalshop/constants';

// Validation schemas
const updateMerchantSettingSchema = z.object({
  value: z.string(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

// GET /api/settings/merchant/[id] - Get specific merchant setting
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Check if user has merchant access
    if (!user.merchantId) {
      return NextResponse.json(
        { success: false, message: 'Merchant access required' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const settingId = parseInt(params.id);
    if (isNaN(settingId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid setting ID' },
        { status: 400 }
      );
    }

    const setting = await prisma.merchantSetting.findFirst({
      where: { 
        publicId: settingId,
        merchantId: user.merchantId
      }
    });

    if (!setting) {
      return NextResponse.json(
        { success: false, message: 'Setting not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

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
    });

  } catch (error) {
    console.error('Error fetching merchant setting:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch merchant setting' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// PUT /api/settings/merchant/[id] - Update merchant setting
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Check if user has merchant access and can manage settings
    if (!user.merchantId || !['ADMIN', 'MERCHANT'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions. Merchant admin access required.' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const settingId = parseInt(params.id);
    if (isNaN(settingId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid setting ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateMerchantSettingSchema.parse(body);

    // Check if setting exists and belongs to user's merchant
    const existingSetting = await prisma.merchantSetting.findFirst({
      where: { 
        publicId: settingId,
        merchantId: user.merchantId
      }
    });

    if (!existingSetting) {
      return NextResponse.json(
        { success: false, message: 'Setting not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    const updatedSetting = await prisma.merchantSetting.update({
      where: { publicId: settingId },
      data: {
        value: validatedData.value,
        description: validatedData.description,
        isActive: validatedData.isActive
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedSetting.publicId,
        key: updatedSetting.key,
        value: parseSettingValue(updatedSetting.value, updatedSetting.type),
        type: updatedSetting.type,
        category: updatedSetting.category,
        description: updatedSetting.description,
        isActive: updatedSetting.isActive,
        createdAt: updatedSetting.createdAt,
        updatedAt: updatedSetting.updatedAt
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating merchant setting:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update merchant setting' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// DELETE /api/settings/merchant/[id] - Delete merchant setting
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Check if user has merchant access and can manage settings
    if (!user.merchantId || !['ADMIN', 'MERCHANT'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions. Merchant admin access required.' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const settingId = parseInt(params.id);
    if (isNaN(settingId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid setting ID' },
        { status: 400 }
      );
    }

    // Check if setting exists and belongs to user's merchant
    const existingSetting = await prisma.merchantSetting.findFirst({
      where: { 
        publicId: settingId,
        merchantId: user.merchantId
      }
    });

    if (!existingSetting) {
      return NextResponse.json(
        { success: false, message: 'Setting not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    await prisma.merchantSetting.delete({
      where: { publicId: settingId }
    });

    return NextResponse.json({
      success: true,
      message: 'Setting deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting merchant setting:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete merchant setting' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
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
