// ============================================================================
// AI API CLIENT
// ============================================================================

import { authenticatedFetch, parseApiResponse, type ApiResponse } from '../core';
import { apiUrls } from '../config/api';
import type { AIGeneratePostInput, AIGeneratePostResponse, AISEOAnalysisInput, AISEOAnalysisResponse } from '@rentalshop/types';

export const aiApi = {
  /**
   * Generate blog post content using AI
   */
  async generatePost(input: AIGeneratePostInput): Promise<ApiResponse<AIGeneratePostResponse['data']>> {
    const response = await authenticatedFetch(apiUrls.ai.generatePost, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return await parseApiResponse<AIGeneratePostResponse['data']>(response);
  },

  /**
   * Analyze SEO score for blog post content
   */
  async analyzeSEO(input: AISEOAnalysisInput): Promise<ApiResponse<AISEOAnalysisResponse['data']>> {
    const response = await authenticatedFetch(apiUrls.ai.seoScore, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return await parseApiResponse<AISEOAnalysisResponse['data']>(response);
  },
};
