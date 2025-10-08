import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

// Force dynamic rendering - database health check needs runtime connection
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log('Database health check started');
    
    // Test basic connection
    await prisma.$connect();
    console.log('Database connection successful');
    
    // Test products table access
    const productCount = await prisma.product.count();
    console.log('Products table accessible, count:', productCount);
    
    // Test a simple product query
    const testProduct = await prisma.product.findFirst({
      select: {
        id: true,
        name: true,
        isActive: true
      }
    });
    console.log('Test product query successful:', testProduct ? 'Found product' : 'No products');
    
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
    console.log('Test outletStock query successful:', testStock ? 'Found stock' : 'No stock records');
    
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
    console.error('Database health check failed:', error);
    
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown error type',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    };
    
    console.error('Error details:', errorDetails);
    
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
} 