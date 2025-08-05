import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { getCustomerById, updateCustomer, deleteCustomer } from '@rentalshop/database';
import type { CustomerUpdateInput } from '@rentalshop/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Get customer
    const customer = await getCustomerById(id);

    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: customer
    });

  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Check if customer exists
    const existingCustomer = await getCustomerById(id);
    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate email format if provided
    if (body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { success: false, message: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: CustomerUpdateInput = {};

    if (body.firstName !== undefined) {
      updateData.firstName = body.firstName.trim();
    }

    if (body.lastName !== undefined) {
      updateData.lastName = body.lastName.trim();
    }

    if (body.email !== undefined) {
      updateData.email = body.email.toLowerCase().trim();
    }

    if (body.phone !== undefined) {
      updateData.phone = body.phone.trim();
    }

    if (body.address !== undefined) {
      updateData.address = body.address?.trim();
    }

    if (body.city !== undefined) {
      updateData.city = body.city?.trim();
    }

    if (body.state !== undefined) {
      updateData.state = body.state?.trim();
    }

    if (body.zipCode !== undefined) {
      updateData.zipCode = body.zipCode?.trim();
    }

    if (body.country !== undefined) {
      updateData.country = body.country?.trim();
    }

    if (body.dateOfBirth !== undefined) {
      updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : undefined;
    }

    if (body.idNumber !== undefined) {
      updateData.idNumber = body.idNumber?.trim();
    }

    if (body.idType !== undefined) {
      updateData.idType = body.idType;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes?.trim();
    }

    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    // Update customer
    const customer = await updateCustomer(id, updateData);

    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Customer updated successfully'
    });

  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Check if customer exists
    const existingCustomer = await getCustomerById(id);
    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    // Soft delete customer
    const customer = await deleteCustomer(id);

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 