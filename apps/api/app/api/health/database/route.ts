import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@rentalshop/database';

export async function GET() {
  try {
    const status = await checkDatabaseConnection();
    
    if (status.status === 'connected') {
      return NextResponse.json({
        success: true,
        message: 'Database is connected',
        data: status
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Database connection failed',
        error: status.error
      }, { status: 503 });
    }
    
  } catch (error: any) {
    console.error('Database health check failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Database health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
} 