import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';
import { withApiLogging } from '@/lib/api-logging-wrapper';

// Force dynamic rendering - database health check needs runtime connection
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/health/database
 * Check database connection health
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export async function GET(request: NextRequest) {
  return withApiLogging(async (request: NextRequest) => {
    try {
      // Test basic connection
      await prisma.$connect();
      
      // Test products table access
      const productCount = await prisma.product.count();
      
      // Test a simple product query
      const testProduct = await prisma.product.findFirst({
        select: {
          id: true,
          name: true,
          isActive: true
        }
      });
      
      // Test outletStock relation
      const testStock = await prisma.outletStock.findFirst({
        select: {
          id: true,
          stock: true,
          product: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      
      return NextResponse.json({
        success: true,
        status: 'healthy',
        database: 'connected',
        tables: {
          products: 'accessible',
          outletStock: 'accessible'
        },
        counts: {
          products: productCount
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json({
        status: 'unhealthy',
        database: 'disconnected',
        ...response,
        timestamp: new Date().toISOString()
      }, { status: statusCode });
    } finally {
      await prisma.$disconnect();
    }
  })(request);
} 
