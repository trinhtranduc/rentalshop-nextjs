import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';
import { z } from 'zod';
import {API} from '@rentalshop/constants';

// Validation schemas
const updateUserPreferenceSchema = z.object({
  value: z.string(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

// GET /api/settings/user/[id] - Get specific user preference
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

    const preferenceId = parseInt(params.id);
    if (isNaN(preferenceId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid preference ID' },
        { status: 400 }
      );
    }

    const preference = await prisma.userPreference.findFirst({
      where: { 
        publicId: preferenceId,
        userId: user.id
      }
    });

    if (!preference) {
      return NextResponse.json(
        { success: false, message: 'Preference not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

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
    });

  } catch (error) {
    console.error('Error fetching user preference:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user preference' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// PUT /api/settings/user/[id] - Update user preference
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

    const preferenceId = parseInt(params.id);
    if (isNaN(preferenceId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid preference ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateUserPreferenceSchema.parse(body);

    // Check if preference exists and belongs to user
    const existingPreference = await prisma.userPreference.findFirst({
      where: { 
        publicId: preferenceId,
        userId: user.id
      }
    });

    if (!existingPreference) {
      return NextResponse.json(
        { success: false, message: 'Preference not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    const updatedPreference = await prisma.userPreference.update({
      where: { publicId: preferenceId },
      data: {
        value: validatedData.value,
        description: validatedData.description,
        isActive: validatedData.isActive
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedPreference.publicId,
        key: updatedPreference.key,
        value: parseSettingValue(updatedPreference.value, updatedPreference.type),
        type: updatedPreference.type,
        category: updatedPreference.category,
        description: updatedPreference.description,
        isActive: updatedPreference.isActive,
        createdAt: updatedPreference.createdAt,
        updatedAt: updatedPreference.updatedAt
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating user preference:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update user preference' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// DELETE /api/settings/user/[id] - Delete user preference
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

    const preferenceId = parseInt(params.id);
    if (isNaN(preferenceId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid preference ID' },
        { status: 400 }
      );
    }

    // Check if preference exists and belongs to user
    const existingPreference = await prisma.userPreference.findFirst({
      where: { 
        publicId: preferenceId,
        userId: user.id
      }
    });

    if (!existingPreference) {
      return NextResponse.json(
        { success: false, message: 'Preference not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    await prisma.userPreference.delete({
      where: { publicId: preferenceId }
    });

    return NextResponse.json({
      success: true,
      message: 'Preference deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user preference:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete user preference' },
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
