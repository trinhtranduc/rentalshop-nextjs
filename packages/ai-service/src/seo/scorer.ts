import { analyzeSEO, type SEOAnalysis } from './analyzer';

/**
 * Calculate SEO score for blog post content
 * This is a wrapper around analyzeSEO for consistency
 */
export function calculateSEOScore(
  htmlContent: string,
  keyword: string,
  metaTitle: string,
  metaDescription: string
): SEOAnalysis {
  return analyzeSEO(htmlContent, keyword, metaTitle, metaDescription);
}
