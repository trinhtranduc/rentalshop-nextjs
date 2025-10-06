import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

// Simple in-memory storage (in production, use database)
let billingConfig = {
  intervals: [
    { id: 'month', name: 'Monthly', months: 1, discountPercentage: 0, isActive: true },
    { id: 'quarter', name: 'Quarterly', months: 3, discountPercentage: 5, isActive: true },
    { id: '6months', name: '6 Months', months: 6, discountPercentage: 10, isActive: true },
    { id: 'year', name: 'Yearly', months: 12, discountPercentage: 20, isActive: true }
  ]
};

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: billingConfig
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch billing configuration' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the billing configuration
    if (!body.intervals || !Array.isArray(body.intervals)) {
      return NextResponse.json(
        { success: false, message: 'Invalid billing configuration' },
        { status: 400 }
      );
    }

    // Validate each interval
    for (const interval of body.intervals) {
      if (!interval.id || !interval.name || typeof interval.months !== 'number' || typeof interval.discountPercentage !== 'number') {
        return NextResponse.json(
          { success: false, message: 'Invalid interval configuration' },
          { status: 400 }
        );
      }
    }

    // Update the configuration
    billingConfig = body;

    return NextResponse.json({
      success: true,
      message: 'Billing configuration updated successfully',
      data: billingConfig
    });
  } catch (error) {
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
