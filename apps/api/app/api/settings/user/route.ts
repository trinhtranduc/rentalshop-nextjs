import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { verifyTokenSimple } from '@rentalshop/auth';
import { z } from 'zod';

// Validation schemas
const userPreferenceSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'json']).default('string'),
  category: z.enum(['general', 'ui', 'notifications', 'privacy']).default('general'),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
});

const updateUserPreferenceSchema = z.object({
  value: z.string(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

// GET /api/settings/user - Get user preferences
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    // Build where clause
    const where: any = {
      userId: user.id
    };
    if (category) {
      where.category = category;
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const preferences = await prisma.userPreference.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    });

    // Transform preferences to include typed values
    const transformedPreferences = preferences.map(preference => ({
      id: preference.publicId,
      key: preference.key,
      value: parseSettingValue(preference.value, preference.type),
      type: preference.type,
      category: preference.category,
      description: preference.description,
      isActive: preference.isActive,
      createdAt: preference.createdAt,
      updatedAt: preference.updatedAt
    }));

    return NextResponse.json({
      success: true,
      data: transformedPreferences
    });

  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user preferences' },
      { status: 500 }
    );
  }
}

// POST /api/settings/user - Create new user preference
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

    const body = await request.json();
    const validatedData = userPreferenceSchema.parse(body);

    // Check if preference with this key already exists for this user
    const existingPreference = await prisma.userPreference.findUnique({
      where: { 
        userId_key: {
          userId: user.id,
          key: validatedData.key
        }
      }
    });

    if (existingPreference) {
      return NextResponse.json(
        { success: false, message: 'Preference with this key already exists' },
        { status: 409 }
      );
    }

    // Get next public ID
    const lastPreference = await prisma.userPreference.findFirst({
      orderBy: { publicId: 'desc' }
    });
    const nextPublicId = (lastPreference?.publicId || 0) + 1;

    const preference = await prisma.userPreference.create({
      data: {
        publicId: nextPublicId,
        userId: user.id,
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
        id: preference.publicId,
        key: preference.key,
        value: parseSettingValue(preference.value, preference.type),
        type: preference.type,
        category: preference.category,
        description: preference.description,
        isActive: preference.isActive,
        createdAt: preference.createdAt,
        updatedAt: preference.updatedAt
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating user preference:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create user preference' },
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
