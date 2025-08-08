import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('GET /api/test called');
  
  return NextResponse.json({
    success: true,
    message: 'Test route working',
    timestamp: new Date().toISOString()
  });
} 