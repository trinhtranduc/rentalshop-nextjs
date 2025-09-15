import { NextRequest, NextResponse } from 'next/server';

export const GET = async (request: NextRequest) => {
  // TODO: Implement billing cycle functionality when model is added to schema
  return NextResponse.json(
    { success: false, message: 'Billing cycle functionality not yet implemented' },
    { status: 501 }
  );
};

export const POST = async (request: NextRequest) => {
  // TODO: Implement billing cycle functionality when model is added to schema
  return NextResponse.json(
    { success: false, message: 'Billing cycle functionality not yet implemented' },
    { status: 501 }
  );
};
