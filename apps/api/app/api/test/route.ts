import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    code: 'TEST_API_WORKING', message: 'Test API working',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({
    success: true,
    code: 'TEST_POST_WORKING', message: 'Test POST working',
    receivedData: body,
    timestamp: new Date().toISOString()
  });
}
