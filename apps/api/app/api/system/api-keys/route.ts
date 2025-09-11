import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@rentalshop/auth';
import { assertAnyRole } from '@rentalshop/auth';
import {API} from '@rentalshop/constants';

// Mock API keys data - in a real implementation, this would come from a database
const mockApiKeys = [
  {
    id: '1',
    name: 'Mobile App Key',
    key: 'sk_live_1234567890abcdef',
    description: 'API key for mobile application',
    permissions: ['read:orders', 'read:products', 'read:customers'],
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    lastUsed: '2024-01-15T10:30:00Z',
    expiresAt: '2024-12-31T23:59:59Z'
  },
  {
    id: '2',
    name: 'Webhook Key',
    key: 'sk_live_abcdef1234567890',
    description: 'API key for webhook integrations',
    permissions: ['write:orders', 'read:orders'],
    status: 'active',
    createdAt: '2024-01-02T00:00:00Z',
    lastUsed: '2024-01-14T15:45:00Z',
    expiresAt: '2024-12-31T23:59:59Z'
  },
  {
    id: '3',
    name: 'Test Key',
    key: 'sk_test_9876543210fedcba',
    description: 'API key for testing purposes',
    permissions: ['read:orders', 'read:products'],
    status: 'inactive',
    createdAt: '2024-01-03T00:00:00Z',
    lastUsed: '2024-01-10T09:15:00Z',
    expiresAt: '2024-06-30T23:59:59Z'
  }
];

export async function GET(request: NextRequest) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Check if user can manage API keys (only ADMIN and MERCHANT roles)
    assertAnyRole(user as any, ['ADMIN', 'MERCHANT']);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Filter API keys based on query parameters
    let filteredKeys = mockApiKeys;

    if (status) {
      filteredKeys = filteredKeys.filter(key => key.status === status);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredKeys = filteredKeys.filter(key => 
        key.name.toLowerCase().includes(searchLower) ||
        key.description.toLowerCase().includes(searchLower) ||
        key.key.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        apiKeys: filteredKeys,
        total: filteredKeys.length
      }
    });

  } catch (error: any) {
    console.error('API Keys GET Error:', error);
    
    if (error.message?.includes('Insufficient permissions')) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to view API keys' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Check if user can create API keys (only ADMIN and MERCHANT roles)
    assertAnyRole(user as any, ['ADMIN', 'MERCHANT']);

    const body = await request.json();
    const { name, description, permissions, expiresAt } = body;

    // Validate required fields
    if (!name || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json(
        { success: false, message: 'Name and permissions are required' },
        { status: 400 }
      );
    }

    // Generate a new API key
    const newApiKey = {
      id: (mockApiKeys.length + 1).toString(),
      name,
      key: `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      description: description || '',
      permissions,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastUsed: null,
      expiresAt: expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
    };

    // In a real implementation, save to database
    mockApiKeys.push(newApiKey);

    return NextResponse.json({
      success: true,
      message: 'API key created successfully',
      data: {
        apiKey: newApiKey
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('API Keys POST Error:', error);
    
    if (error.message?.includes('Insufficient permissions')) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to create API keys' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
