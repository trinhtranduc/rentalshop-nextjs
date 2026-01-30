export interface SEOAnalysis {
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
  issues: SEOIssue[];
  recommendations: string[];
}

export interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  fix?: string;
}

/**
 * Calculate Flesch Reading Ease score
 * Higher score = easier to read (0-100 scale)
 */
function calculateFleschScore(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((count, word) => {
    return count + countSyllables(word);
  }, 0);

  if (sentences.length === 0 || words.length === 0) {
    return 0;
  }

  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;

  const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  return Math.max(0, Math.min(100, score));
}

/**
 * Count syllables in a word
 */
function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

/**
 * Extract text content from HTML (remove tags)
 */
function extractTextFromHTML(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
    .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Extract headings from HTML using regex
 */
function extractHeadings(html: string): { h1: string[]; h2: string[]; h3: string[] } {
  const h1Matches = html.match(/<h1[^>]*>(.*?)<\/h1>/gi) || [];
  const h2Matches = html.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
  const h3Matches = html.match(/<h3[^>]*>(.*?)<\/h3>/gi) || [];

  return {
    h1: h1Matches.map(match => extractTextFromHTML(match)),
    h2: h2Matches.map(match => extractTextFromHTML(match)),
    h3: h3Matches.map(match => extractTextFromHTML(match)),
  };
}

/**
 * Extract links from HTML
 */
function extractLinks(html: string): string[] {
  const linkMatches = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi) || [];
  return linkMatches.map(match => {
    const hrefMatch = match.match(/href=["']([^"']+)["']/i);
    return hrefMatch ? hrefMatch[1] : '';
  }).filter(Boolean);
}

/**
 * Extract images from HTML
 */
function extractImages(html: string): Array<{ hasAlt: boolean }> {
  const imgMatches = html.match(/<img[^>]*>/gi) || [];
  return imgMatches.map(match => ({
    hasAlt: /alt=["'][^"']+["']/i.test(match),
  }));
}

/**
 * Analyze SEO metrics for blog content
 */
export function analyzeSEO(
  htmlContent: string,
  keyword: string,
  metaTitle: string,
  metaDescription: string
): SEOAnalysis {
  // Extract text content (remove HTML tags)
  const textContent = extractTextFromHTML(htmlContent);
  const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;

  // Keyword analysis
  const keywordLower = keyword.toLowerCase();
  const textLower = textContent.toLowerCase();
  const keywordCount = (textLower.match(new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  const keywordDensity = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;

  // Heading structure
  const headings = extractHeadings(htmlContent);
  const h1Count = headings.h1.length;
  const h2Count = headings.h2.length;
  const h3Count = headings.h3.length;
  
  const h1Text = headings.h1[0]?.toLowerCase() || '';
  const h2Texts = headings.h2.map(h => h.toLowerCase());
  
  const keywordInH1 = h1Text.includes(keywordLower);
  const keywordInH2 = h2Texts.some(text => text.includes(keywordLower));

  // Readability
  const fleschScore = calculateFleschScore(textContent);

  // Calculate score
  let score = 0;
  const issues: SEOIssue[] = [];
  const recommendations: string[] = [];

  // Keyword optimization (20 points)
  if (keywordDensity >= 1 && keywordDensity <= 2) {
    score += 20;
  } else if (keywordDensity >= 0.5 && keywordDensity < 1) {
    score += 15;
    issues.push({
      type: 'warning',
      message: `Keyword density is ${keywordDensity.toFixed(2)}%. Aim for 1-2%.`,
      fix: `Add the keyword "${keyword}" a few more times naturally throughout the content.`,
    });
  } else if (keywordDensity > 2 && keywordDensity <= 3) {
    score += 10;
    issues.push({
      type: 'warning',
      message: `Keyword density is ${keywordDensity.toFixed(2)}%. Slightly high, aim for 1-2%.`,
      fix: `Reduce keyword usage slightly to avoid over-optimization.`,
    });
  } else {
    score += 5;
    issues.push({
      type: keywordDensity < 0.5 ? 'error' : 'warning',
      message: `Keyword density is ${keywordDensity.toFixed(2)}%. Should be 1-2%.`,
      fix: keywordDensity < 0.5
        ? `Add the keyword "${keyword}" more frequently throughout the content.`
        : `Reduce keyword usage to avoid keyword stuffing.`,
    });
  }

  // Content length (15 points)
  if (wordCount >= 300) {
    score += 15;
  } else {
    const lengthScore = Math.max(0, (wordCount / 300) * 15);
    score += lengthScore;
    issues.push({
      type: 'warning',
      message: `Content is ${wordCount} words. Recommended: 300+ words for better SEO.`,
      fix: `Expand the content with more detailed explanations, examples, or sections.`,
    });
  }

  // Heading structure (15 points)
  if (h1Count === 1) {
    score += 5;
  } else if (h1Count === 0) {
    issues.push({
      type: 'error',
      message: 'Missing H1 tag. Should have exactly 1 H1 tag.',
      fix: 'Add a single H1 tag with the main title.',
    });
  } else {
    issues.push({
      type: 'error',
      message: `Found ${h1Count} H1 tags. Should have exactly 1 H1 tag.`,
      fix: 'Keep only one H1 tag for the main title, convert others to H2.',
    });
  }

  if (h2Count >= 2) {
    score += 10;
  } else if (h2Count === 1) {
    score += 5;
    issues.push({
      type: 'warning',
      message: 'Only 1 H2 heading found. Add more H2 headings for better structure.',
      fix: 'Break content into more sections with H2 headings.',
    });
  } else {
    issues.push({
      type: 'warning',
      message: 'No H2 headings found. Add H2 headings for better content structure.',
      fix: 'Organize content with H2 headings for main sections.',
    });
  }

  // Keyword in headings (bonus)
  if (keywordInH1) {
    score += 2; // Bonus points
  } else {
    recommendations.push(`Include the keyword "${keyword}" in the H1 heading.`);
  }

  if (keywordInH2) {
    score += 1; // Bonus points
  } else if (h2Count > 0) {
    recommendations.push(`Include the keyword "${keyword}" in at least one H2 heading.`);
  }

  // Meta tags (20 points)
  const titleLength = metaTitle.length;
  const descriptionLength = metaDescription.length;
  const titleOptimal = titleLength >= 50 && titleLength <= 60;
  const descriptionOptimal = descriptionLength >= 150 && descriptionLength <= 160;
  const hasKeywords = metaTitle.toLowerCase().includes(keywordLower) || 
                      metaDescription.toLowerCase().includes(keywordLower);

  if (titleOptimal) {
    score += 10;
  } else {
    if (titleLength < 50) {
      issues.push({
        type: 'warning',
        message: `Meta title is ${titleLength} characters. Should be 50-60 characters.`,
        fix: `Expand the title to 50-60 characters for better SEO.`,
      });
    } else {
      issues.push({
        type: 'warning',
        message: `Meta title is ${titleLength} characters. Should be 50-60 characters (may be truncated in search results).`,
        fix: `Shorten the title to 50-60 characters.`,
      });
    }
    score += Math.max(0, (titleLength / 60) * 10);
  }

  if (descriptionOptimal) {
    score += 10;
  } else {
    if (descriptionLength < 150) {
      issues.push({
        type: 'warning',
        message: `Meta description is ${descriptionLength} characters. Should be 150-160 characters.`,
        fix: `Expand the description to 150-160 characters for better click-through rates.`,
      });
    } else {
      issues.push({
        type: 'warning',
        message: `Meta description is ${descriptionLength} characters. Should be 150-160 characters (may be truncated).`,
        fix: `Shorten the description to 150-160 characters.`,
      });
    }
    score += Math.max(0, (descriptionLength / 160) * 10);
  }

  if (!hasKeywords) {
    recommendations.push(`Include the keyword "${keyword}" in meta title or description.`);
  }

  // Readability (20 points)
  if (fleschScore >= 60) {
    score += 20;
  } else if (fleschScore >= 40) {
    score += 15;
    recommendations.push('Improve readability by using shorter sentences and simpler words.');
  } else {
    score += 10;
    issues.push({
      type: 'warning',
      message: `Readability score is ${fleschScore.toFixed(1)}. Aim for 60+ for better engagement.`,
      fix: 'Simplify language, use shorter sentences, and avoid complex words.',
    });
  }

  // Internal links (10 points) - Check for links
  const links = extractLinks(htmlContent);
  const internalLinks = links.filter(link => {
    return link.startsWith('/') || link.includes('anyrent.shop');
  }).length;

  if (internalLinks >= 2) {
    score += 10;
  } else if (internalLinks === 1) {
    score += 5;
    recommendations.push('Add more internal links to related content (aim for 2-3 links).');
  } else {
    recommendations.push('Add internal links to related blog posts or pages (aim for 2-3 links).');
  }

  // Images with alt text (10 points)
  const images = extractImages(htmlContent);
  const imagesWithAlt = images.filter(img => img.hasAlt).length;
  
  if (images.length === 0) {
    recommendations.push('Consider adding relevant images with descriptive alt text.');
  } else if (imagesWithAlt === images.length) {
    score += 10;
  } else {
    score += (imagesWithAlt / images.length) * 10;
    issues.push({
      type: 'warning',
      message: `${images.length - imagesWithAlt} image(s) missing alt text.`,
      fix: 'Add descriptive alt text to all images for accessibility and SEO.',
    });
  }

  // Ensure score doesn't exceed 100
  score = Math.min(100, Math.round(score));

  return {
    score,
    keywordDensity: Math.round(keywordDensity * 100) / 100,
    wordCount,
    readabilityScore: Math.round(fleschScore * 10) / 10,
    headingStructure: {
      hasH1: h1Count === 1,
      h1Count,
      h2Count,
      h3Count,
      keywordInH1,
      keywordInH2,
    },
    metaTags: {
      titleLength,
      descriptionLength,
      hasKeywords,
      titleOptimal,
      descriptionOptimal,
    },
    issues,
    recommendations,
  };
}
