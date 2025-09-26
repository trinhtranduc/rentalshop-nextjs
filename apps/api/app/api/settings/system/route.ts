import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';
import { z } from 'zod';
import {API} from '@rentalshop/constants';

// Validation schemas
const systemSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'json']).default('string'),
  category: z.enum(['general', 'security', 'email', 'notifications', 'system']).default('general'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  isReadOnly: z.boolean().default(false)
});

const updateSystemSettingSchema = z.object({
  value: z.string(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

// GET /api/settings/system - Get all system settings
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    // Build where clause
    const where: any = {};
    if (category) {
      where.category = category;
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const settings = await prisma.systemSetting.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    });

    // Transform settings to include typed values
    const transformedSettings = settings.map((setting: any) => ({
      id: setting.id,
      key: setting.key,
      value: parseSettingValue(setting.value, setting.type),
      type: setting.type,
      category: setting.category,
      description: setting.description,
      isActive: setting.isActive,
      isReadOnly: setting.isReadOnly,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt
    }));

    return NextResponse.json({
      success: true,
      data: transformedSettings
    });

  } catch (error) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch system settings' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// POST /api/settings/system - Create new system setting
export async function POST(request: NextRequest) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Only ADMIN users can create system settings
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions. Admin access required.' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const body = await request.json();
    const validatedData = systemSettingSchema.parse(body);

    // Check if setting with this key already exists
    const existingSetting = await prisma.systemSetting.findUnique({
      where: { key: validatedData.key }
    });

    if (existingSetting) {
      return NextResponse.json(
        { success: false, message: 'Setting with this key already exists' },
        { status: API.STATUS.CONFLICT }
      );
    }

    // Get next public ID
    const lastSetting = await prisma.systemSetting.findFirst({
      orderBy: { id: 'desc' }
    });
    const nextPublicId = (lastSetting?.id || 0) + 1;

    const setting = await prisma.systemSetting.create({
      data: {
        id: nextPublicId,
        key: validatedData.key,
        value: validatedData.value,
        type: validatedData.type,
        category: validatedData.category,
        description: validatedData.description,
        isActive: validatedData.isActive,
        isReadOnly: validatedData.isReadOnly
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: setting.id,
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
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating system setting:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create system setting' },
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
