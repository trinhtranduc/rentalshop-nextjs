import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';

/**
 * POST /api/cron/embedding-jobs
 * Process pending embedding jobs from queue.
 *
 * Authorization:
 * - Requires CRON_SECRET via Authorization: Bearer <secret>
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(ResponseBuilder.error('UNAUTHORIZED'), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchSizeParam = Number(searchParams.get('batchSize') || '5');
    const batchSize = Number.isFinite(batchSizeParam) ? batchSizeParam : 5;

    const result = await db.embeddingJobs.processPending({ batchSize });
    return NextResponse.json(ResponseBuilder.success('EMBEDDING_JOBS_PROCESSED', result));
  } catch (error) {
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

export async function GET() {
  return NextResponse.json(
    ResponseBuilder.success('EMBEDDING_JOBS_CRON_HEALTHY', {
      healthy: true,
      timestamp: new Date().toISOString()
    })
  );
}
