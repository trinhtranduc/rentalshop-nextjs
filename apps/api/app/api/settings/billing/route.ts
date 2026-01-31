import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';
import { withApiLogging } from '../../../../lib/api-logging-wrapper';

// Simple in-memory storage (in production, use database)
let billingConfig = {
  intervals: [
    { id: 'month', name: 'Monthly', months: 1, discountPercentage: 0, isActive: true },
    { id: 'quarter', name: 'Quarterly', months: 3, discountPercentage: 0, isActive: true },
    { id: '6months', name: '6 Months', months: 6, discountPercentage: 5, isActive: true },
    { id: 'year', name: 'Yearly', months: 12, discountPercentage: 10, isActive: true }
  ]
};

export const GET = withApiLogging(async () => {
  try {
    return NextResponse.json({
      success: true,
      data: billingConfig
    });
    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);

export const POST = withApiLogging(async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    // Validate the billing configuration
    if (!body.intervals || !Array.isArray(body.intervals)) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_BILLING_CONFIG'),
        { status: 400 }
      );
    }

    // Validate each interval
    for (const interval of body.intervals) {
      if (!interval.id || !interval.name || typeof interval.months !== 'number' || typeof interval.discountPercentage !== 'number') {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_INTERVAL_CONFIG'),
          { status: 400 }
        );
      }
    }

    // Update the configuration
    billingConfig = body;

    return NextResponse.json(
      ResponseBuilder.success('BILLING_CONFIG_UPDATED_SUCCESS', billingConfig)
    );
    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);
