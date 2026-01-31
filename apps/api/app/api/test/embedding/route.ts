/**
 * Test Embedding API Route
 * Simple endpoint to test embedding generation in Next.js
 * 
 * GET /api/test/embedding
 * - Tests embedding service without Qdrant
 * - Returns embedding vector and metadata
 * 
 * POST /api/test/embedding
 * - Accepts image file
 * - Generates embedding
 * - Returns embedding vector
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiLogging } from '@/lib/api-logging-wrapper';

// Force dynamic rendering to prevent Next.js from collecting page data
// This prevents Next.js from trying to load native dependencies (onnxruntime-node) during build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/test/embedding
 * Test embedding service initialization
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export async function GET(request: NextRequest) {
  return withApiLogging(async (request: NextRequest) => {
    try {
      // Lazy load embedding service to avoid loading native deps during build
      const { getEmbeddingService } = await import('@rentalshop/database/server');
      const embeddingService = getEmbeddingService();
      
      return NextResponse.json({
        success: true,
        message: 'Embedding service is ready',
        service: {
          modelName: 'Xenova/clip-vit-base-patch32',
          dimension: 512,
          status: 'initialized'
        }
      });
    } catch (error: any) {
      // Error will be automatically logged by withApiLogging wrapper
      return NextResponse.json(
        {
          success: false,
          error: error?.message || 'Unknown error',
          stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        },
        { status: 500 }
      );
    }
  })(request);
}

/**
 * POST /api/test/embedding
 * Test embedding generation from image
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export async function POST(request: NextRequest) {
  return withApiLogging(async (request: NextRequest) => {
    try {
      // Get image from form data
      const formData = await request.formData();
      const imageFile = formData.get('image') as File | null;
      
      if (!imageFile) {
        return NextResponse.json(
          { success: false, error: 'No image file provided' },
          { status: 400 }
        );
      }
      
      // Convert File to Buffer
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const startTime = Date.now();
      
      // Lazy load embedding service to avoid loading native deps during build
      const { getEmbeddingService } = await import('@rentalshop/database/server');
      const embeddingService = getEmbeddingService();
      const embedding = await embeddingService.generateEmbeddingFromBuffer(buffer);
      
      const duration = Date.now() - startTime;
      
      return NextResponse.json({
        success: true,
        embedding: {
          dimension: embedding.length,
          vector: embedding,
          duration: `${duration}ms`,
          magnitude: Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
        }
      });
    } catch (error: any) {
      // Error will be automatically logged by withApiLogging wrapper
      return NextResponse.json(
        {
          success: false,
          error: error?.message || 'Unknown error',
          stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        },
        { status: 500 }
      );
    }
  })(request);
}
