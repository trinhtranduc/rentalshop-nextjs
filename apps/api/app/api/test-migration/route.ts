import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';

/**
 * Test endpoint to check if UserSession table exists
 */
export async function GET(request: NextRequest) {
  try {
    // Try to query UserSession table
    const sessionCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'UserSession'
    `;

    return NextResponse.json({
      success: true,
      message: 'UserSession table check',
      tableExists: sessionCount[0]?.count > 0,
      sessionCount,
      timestamp: new Date().toISOString(),
      version: 'v2-with-migration-check'
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

