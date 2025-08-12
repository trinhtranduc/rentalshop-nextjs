import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';

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
    
    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      database: 'disconnected',
      error: errorDetails,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 