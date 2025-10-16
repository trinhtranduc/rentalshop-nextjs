import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    code: 'API_KEYS_WORKING', message: 'API Keys endpoint is working!',
    data: {
      endpoint: '/api/system/api-keys',
      methods: ['GET', 'POST'],
      description: 'Manage API keys for system access',
      authentication: 'Bearer token required',
      permissions: 'ADMIN or MERCHANT role required'
    }
  });
}
