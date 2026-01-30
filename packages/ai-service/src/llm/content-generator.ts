import { HuggingFaceClient } from './huggingface-client';
import { generateBlogPostPrompt, type BlogPostPromptParams } from './prompt-templates';
import { generateSlug } from '@rentalshop/utils';

export interface GeneratePostInput extends BlogPostPromptParams {
  keyword: string;
}

export interface GeneratedPost {
  title: string;
  content: string; // HTML content
  excerpt: string;
  metaDescription: string;
  suggestedSlug: string;
  keywords: string[];
  seoTitle?: string;
  seoKeywords?: string;
}

/**
 * Generate blog post content using HuggingFace API
 */
export class ContentGenerator {
  private client: HuggingFaceClient;

  constructor(apiKey: string, model?: string) {
    this.client = new HuggingFaceClient({
      apiKey,
      model: model || process.env.HUGGINGFACE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2',
    });
  }

  /**
   * Generate a complete blog post
   */
  async generateBlogPost(input: GeneratePostInput): Promise<GeneratedPost> {
    const prompt = generateBlogPostPrompt(input);
    
    // Generate content
    const rawResponse = await this.client.generate(prompt, {
      maxLength: Math.min((input.wordCount || 1500) * 2, 4000), // Allow more tokens for generation
      temperature: 0.7,
      topP: 0.95,
    });

    // Parse the response
    const parsed = this.parseAIResponse(rawResponse, input.keyword);
    
    return parsed;
  }

  /**
   * Parse AI response to extract structured content
   */
  private parseAIResponse(response: string, keyword: string): GeneratedPost {
    // Try to extract structured format first
    const titleMatch = response.match(/Title:\s*(.+?)(?:\n|Meta Description:|$)/i);
    const metaDescMatch = response.match(/Meta Description:\s*(.+?)(?:\n|Keywords:|Content:|$)/i);
    const keywordsMatch = response.match(/Keywords:\s*(.+?)(?:\n|Content:|$)/i);
    const contentMatch = response.match(/Content:\s*([\s\S]+)$/i);

    let title = titleMatch?.[1]?.trim() || '';
    let metaDescription = metaDescMatch?.[1]?.trim() || '';
    let keywords = keywordsMatch?.[1]?.split(',').map(k => k.trim()).filter(Boolean) || [];
    let content = contentMatch?.[1]?.trim() || '';

    // If structured format not found, try to extract from response
    if (!title || !content) {
      // Try to find H1 tag
      const h1Match = response.match(/<h1[^>]*>(.+?)<\/h1>/i);
      if (h1Match) {
        title = h1Match[1].trim();
        content = response;
      } else {
        // Fallback: use first line as title, rest as content
        const lines = response.split('\n').filter(line => line.trim());
        title = lines[0]?.replace(/^#+\s*/, '').trim() || `Blog Post about ${keyword}`;
        content = lines.slice(1).join('\n').trim() || response;
      }
    }

    // Ensure content is HTML
    if (!content.includes('<')) {
      // Convert markdown-like content to HTML
      content = this.convertToHTML(content);
    }

    // Generate meta description if not provided
    if (!metaDescription) {
      metaDescription = this.generateMetaDescription(content, keyword);
    }

    // Extract keywords if not provided
    if (keywords.length === 0) {
      keywords = this.extractKeywords(content, keyword);
    }

    // Generate excerpt from first paragraph
    const excerpt = this.generateExcerpt(content);

    // Generate slug from title
    const suggestedSlug = generateSlug(title);

    // Extract SEO title (first 60 chars of title)
    const seoTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;

    return {
      title,
      content,
      excerpt,
      metaDescription,
      suggestedSlug,
      keywords,
      seoTitle,
      seoKeywords: keywords.join(', '),
    };
  }

  /**
   * Convert plain text to HTML
   */
  private convertToHTML(text: string): string {
    let html = text;

    // Convert headers
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Convert lists
    html = html.replace(/^-\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
      return '<ul>' + match.replace(/\n/g, '') + '</ul>';
    });

    // Convert paragraphs
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs
      .map(p => p.trim())
      .filter(p => p && !p.startsWith('<'))
      .map(p => `<p>${p}</p>`)
      .join('\n');

    return html;
  }

  /**
   * Generate meta description from content
   */
  private generateMetaDescription(content: string, keyword: string): string {
    // Extract text from HTML
    const textContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Take first 150-160 characters
    let description = textContent.substring(0, 160);
    
    // Ensure keyword is included
    if (!description.toLowerCase().includes(keyword.toLowerCase())) {
      description = `${keyword}: ${description.substring(0, 140)}`;
    }
    
    // Trim to last complete sentence
    const lastPeriod = description.lastIndexOf('.');
    if (lastPeriod > 100) {
      description = description.substring(0, lastPeriod + 1);
    }
    
    return description.trim();
  }

  /**
   * Extract keywords from content
   */
  private extractKeywords(content: string, primaryKeyword: string): string[] {
    const keywords: string[] = [primaryKeyword];
    
    // Extract text from HTML
    const textContent = content.replace(/<[^>]+>/g, ' ').toLowerCase();
    
    // Find common words (excluding stop words)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those']);
    
    const words = textContent
      .split(/\s+/)
      .filter(word => word.length > 4 && !stopWords.has(word))
      .filter(word => /^[a-z]+$/.test(word));
    
    // Count word frequency
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Get top 4 keywords (excluding primary keyword)
    const sortedWords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .filter(word => !word.includes(primaryKeyword.toLowerCase()))
      .slice(0, 4);
    
    keywords.push(...sortedWords);
    
    return keywords.slice(0, 5); // Max 5 keywords
  }

  /**
   * Generate excerpt from content
   */
  private generateExcerpt(content: string): string {
    // Extract text from HTML
    const textContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Take first 150-200 characters
    let excerpt = textContent.substring(0, 200);
    
    // Trim to last complete sentence
    const lastPeriod = excerpt.lastIndexOf('.');
    if (lastPeriod > 100) {
      excerpt = excerpt.substring(0, lastPeriod + 1);
    } else {
      excerpt = excerpt.trim() + '...';
    }
    
    return excerpt;
  }
}
