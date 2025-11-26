import { NextRequest, NextResponse } from 'next/server';
import { comprehensiveSwaggerConfig } from '../../../lib/swagger/comprehensive';

export async function GET(request: NextRequest) {
  const specs = comprehensiveSwaggerConfig;

  return NextResponse.json(specs);
} 
