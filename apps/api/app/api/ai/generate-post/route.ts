import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { ContentGenerator } from '@rentalshop/ai-service';
import { z } from 'zod';
import { withApiLogging } from '@/lib/api-logging-wrapper';

const generatePostSchema = z.object({
  keyword: z.string().min(1).max(100),
  tone: z.enum(['professional', 'casual', 'friendly', 'technical']).optional(),
  wordCount: z.number().int().min(300).max(5000).optional(),
  category: z.string().optional(),
  includeExamples: z.boolean().optional(),
  targetAudience: z.string().optional(),
  model: z.string().optional(),
});

/**
 * POST /api/ai/generate-post
 * Generate blog post content using AI
 * 
 * Authorization: ADMIN only
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const POST = withApiLogging(
  withPermissions(['posts.manage'])(async (request, { user }) => {
    try {
    const body = await request.json();
    
    const parsed = generatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400 }
      );
    }

    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        ResponseBuilder.error('HUGGINGFACE_API_KEY_NOT_CONFIGURED'),
        { status: 500 }
      );
    }

    const generator = new ContentGenerator(apiKey, parsed.data.model);
    
    const result = await generator.generateBlogPost({
      keyword: parsed.data.keyword,
      tone: parsed.data.tone,
      wordCount: parsed.data.wordCount,
      category: parsed.data.category,
      includeExamples: parsed.data.includeExamples,
      targetAudience: parsed.data.targetAudience,
    });

    return NextResponse.json(
      ResponseBuilder.success('POST_GENERATED_SUCCESS', result)
    );
    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })
);
