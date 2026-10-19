/**
 * #1095 — GET /api/admin/embedding-jobs?status=RUNNING&merchantId=N&since=ISO&limit=50
 * ADMIN only, read-only. Newest jobs of one status (default RUNNING) for the admin image-search monitor, counts
 * per status and progress of the last run (jobs updated since `since`, default the last 24 h).
 * `page` pages the rows (`total` = jobs of that status). `format=csv` downloads the whole tab as CSV (at most
 * 10000 rows, read and streamed 1000 at a time).
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { z } from 'zod';
import { embeddingJobsCsv, getEmbeddingJobs, JOB_STATUSES } from '../../../../lib/embedding-monitor';

export const runtime = 'nodejs';

const withAdminOnly = withAuthRoles(['ADMIN'], { requireActiveSubscription: false });

const DAY_MS = 24 * 60 * 60 * 1000;

const querySchema = z.object({
  merchantId: z.coerce.number().int().positive().optional(),
  status: z.enum(JOB_STATUSES).default('RUNNING'),
  since: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'since must be an ISO date')
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(50),
  page: z.coerce.number().int().min(1).default(1),
  format: z.enum(['json', 'csv']).default('json'),
});

export const GET = withAdminOnly(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
    }
    const { merchantId, status, since, limit, page, format } = parsed.data;
    if (merchantId && !(await db.merchants.findById(merchantId))) {
      return NextResponse.json(ResponseBuilder.error('MERCHANT_NOT_FOUND'), { status: 404 });
    }

    const sinceDate = since ? new Date(since) : new Date(Date.now() - DAY_MS);

    if (format === 'csv') {
      const lines = embeddingJobsCsv({ merchantId, status, since: sinceDate });
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
          const next = await lines.next();
          if (next.done) controller.close();
          else controller.enqueue(encoder.encode(next.value));
        },
      });
      const name = `embedding-jobs-${status.toLowerCase()}${merchantId ? `-shop-${merchantId}` : ''}.csv`;
      return new NextResponse(body, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${name}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const data = await getEmbeddingJobs({ merchantId, status, since: sinceDate, limit, page });
    return NextResponse.json(ResponseBuilder.success('EMBEDDING_JOBS_LIST', data));
  } catch (error) {
    console.error('Error in GET /api/admin/embedding-jobs:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
