import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // TODO: Implement authentication logic
    console.log('Login attempt:', body)
    
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: '1',
          email: body.email,
          name: 'Test User',
          role: 'CLIENT'
        },
        token: 'mock-jwt-token'
      }
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Login failed' },
      { status: 500 }
    )
  }
} 