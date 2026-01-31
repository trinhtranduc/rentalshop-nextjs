import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { analyzeSEO } from '@rentalshop/ai-service';
import { z } from 'zod';
import { withApiLogging } from '@/lib/api-logging-wrapper';

const seoAnalysisSchema = z.object({
  content: z.string().min(1),
  keyword: z.string().min(1).max(100),
  metaTitle: z.string().min(1).max(200),
  metaDescription: z.string().min(1).max(500),
});

/**
 * POST /api/ai/seo-score
 * Analyze SEO score for blog post content
 * 
 * Authorization: ADMIN only
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const POST = withApiLogging(
  withPermissions(['posts.manage'])(async (request, { user }) => {
    try {
    const body = await request.json();
    
    const parsed = seoAnalysisSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400 }
      );
    }

    const analysis = analyzeSEO(
      parsed.data.content,
      parsed.data.keyword,
      parsed.data.metaTitle,
      parsed.data.metaDescription
    );

    return NextResponse.json(
      ResponseBuilder.success('SEO_ANALYSIS_SUCCESS', analysis)
    );
    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })
);
