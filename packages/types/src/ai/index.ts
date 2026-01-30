// ============================================================================
// AI SERVICE TYPES
// ============================================================================

export interface AIGeneratePostInput {
  keyword: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'technical';
  wordCount?: number;
  category?: string;
  includeExamples?: boolean;
  targetAudience?: string;
  model?: string;
}

export interface AIGeneratePostResponse {
  success: boolean;
  data?: {
    title: string;
    content: string; // HTML content
    excerpt: string;
    metaDescription: string;
    suggestedSlug: string;
    keywords: string[];
    seoTitle?: string;
    seoKeywords?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface AISEOAnalysisInput {
  content: string; // HTML content
  keyword: string;
  metaTitle: string;
  metaDescription: string;
}

export interface AISEOAnalysisResponse {
  success: boolean;
  data?: {
    score: number; // 0-100
    keywordDensity: number;
    wordCount: number;
    readabilityScore: number;
    headingStructure: {
      hasH1: boolean;
      h1Count: number;
      h2Count: number;
      h3Count: number;
      keywordInH1: boolean;
      keywordInH2: boolean;
    };
    metaTags: {
      titleLength: number;
      descriptionLength: number;
      hasKeywords: boolean;
      titleOptimal: boolean;
      descriptionOptimal: boolean;
    };
    issues: Array<{
      type: 'error' | 'warning' | 'info';
      message: string;
      fix?: string;
    }>;
    recommendations: string[];
  };
  error?: {
    code: string;
    message: string;
  };
}
