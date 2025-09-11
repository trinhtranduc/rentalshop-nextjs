import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';
import { getAuditLogger, extractAuditContext } from '@rentalshop/database';
import { z } from 'zod';
import {API} from '@rentalshop/constants';

// Validation schemas
const updateSystemSettingSchema = z.object({
  value: z.string(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

// GET /api/settings/system/[id] - Get specific system setting
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

    // Only ADMIN users can access system settings
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions. Admin access required.' },
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

    const setting = await prisma.systemSetting.findUnique({
      where: { publicId: settingId }
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
        isReadOnly: setting.isReadOnly,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt
      }
    });

  } catch (error) {
    console.error('Error fetching system setting:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch system setting' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// PUT /api/settings/system/[id] - Update system setting
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

    // Only ADMIN users can update system settings
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions. Admin access required.' },
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
    const validatedData = updateSystemSettingSchema.parse(body);

    // Check if setting exists
    const existingSetting = await prisma.systemSetting.findUnique({
      where: { publicId: settingId }
    });

    if (!existingSetting) {
      return NextResponse.json(
        { success: false, message: 'Setting not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Check if setting is read-only
    if (existingSetting.isReadOnly) {
      return NextResponse.json(
        { success: false, message: 'Cannot update read-only setting' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const updatedSetting = await prisma.systemSetting.update({
      where: { publicId: settingId },
      data: {
        value: validatedData.value,
        description: validatedData.description,
        isActive: validatedData.isActive
      }
    });

    // Log audit event
    const auditLogger = getAuditLogger(prisma);
    const context = extractAuditContext(request, user);
    
    await auditLogger.logUpdate(
      'SystemSetting',
      updatedSetting.id,
      updatedSetting.key,
      {
        value: existingSetting.value,
        description: existingSetting.description,
        isActive: existingSetting.isActive
      },
      {
        value: updatedSetting.value,
        description: updatedSetting.description,
        isActive: updatedSetting.isActive
      },
      context,
      `Updated system setting: ${updatedSetting.key}`
    );

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
        isReadOnly: updatedSetting.isReadOnly,
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

    console.error('Error updating system setting:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update system setting' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// DELETE /api/settings/system/[id] - Delete system setting
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

    // Only ADMIN users can delete system settings
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions. Admin access required.' },
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

    // Check if setting exists
    const existingSetting = await prisma.systemSetting.findUnique({
      where: { publicId: settingId }
    });

    if (!existingSetting) {
      return NextResponse.json(
        { success: false, message: 'Setting not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Check if setting is read-only
    if (existingSetting.isReadOnly) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete read-only setting' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    await prisma.systemSetting.delete({
      where: { publicId: settingId }
    });

    return NextResponse.json({
      success: true,
      message: 'Setting deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting system setting:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete system setting' },
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
