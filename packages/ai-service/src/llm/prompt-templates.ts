export interface BlogPostPromptParams {
  keyword: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'technical';
  wordCount?: number;
  category?: string;
  includeExamples?: boolean;
  targetAudience?: string;
}

/**
 * Generate SEO-optimized prompt for blog post generation
 */
export function generateBlogPostPrompt(params: BlogPostPromptParams): string {
  const {
    keyword,
    tone = 'professional',
    wordCount = 1500,
    category,
    includeExamples = true,
    targetAudience = 'general readers',
  } = params;

  const toneDescription = {
    professional: 'professional and authoritative',
    casual: 'casual and conversational',
    friendly: 'friendly and approachable',
    technical: 'technical and detailed',
  }[tone];

  const examplesSection = includeExamples
    ? '\n- Include practical examples and use cases\n- Add code snippets or step-by-step guides where relevant'
    : '';

  const categorySection = category
    ? `\n- Category: ${category}`
    : '';

  return `Write a comprehensive, SEO-optimized blog post with the following requirements:

Topic/Keyword: ${keyword}
Tone: ${toneDescription}
Target Audience: ${targetAudience}
Word Count: Approximately ${wordCount} words
${categorySection}

Content Requirements:
- Create an engaging title that includes the keyword "${keyword}"
- Write a compelling introduction that hooks the reader
- Use proper HTML heading structure:
  * One H1 tag for the main title
  * Multiple H2 tags for main sections (at least 3-5 sections)
  * H3 tags for subsections where appropriate
- Naturally incorporate the keyword "${keyword}" throughout the content (aim for 1-2% keyword density)
- Write clear, well-structured paragraphs
- Include actionable tips, insights, or recommendations${examplesSection}
- Write a strong conclusion that summarizes key points
- Optimize for readability (use shorter sentences, clear language)

SEO Requirements:
- Include the keyword in the H1 title
- Use the keyword in at least one H2 heading
- Place the keyword in the first paragraph
- Create a meta description (150-160 characters) that includes the keyword
- Suggest 3-5 related keywords

Format the output as HTML with proper semantic structure. Use <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em> tags appropriately.

Output Format:
Please provide the content in the following structure:
Title: [Your engaging title here]
Meta Description: [150-160 character meta description]
Keywords: [comma-separated list of 3-5 related keywords]
Content: [Full HTML content with proper heading structure]

Begin writing the blog post now:`;
}

/**
 * Generate prompt for improving existing content
 */
export function generateImproveContentPrompt(
  content: string,
  keyword: string,
  focus: 'seo' | 'readability' | 'length' | 'structure' = 'seo'
): string {
  const focusInstructions = {
    seo: 'Focus on improving SEO: increase keyword density to 1-2%, add more headings with keywords, optimize meta description',
    readability: 'Focus on improving readability: simplify language, shorten sentences, use clearer explanations',
    length: 'Focus on expanding content: add more detailed explanations, examples, and sections to reach target word count',
    structure: 'Focus on improving structure: reorganize content with better heading hierarchy, improve flow and organization',
  }[focus];

  return `Improve the following blog post content with focus on: ${focusInstructions}

Original Content:
${content}

Keyword: ${keyword}

Requirements:
- Maintain the core message and information
- Improve SEO optimization
- Enhance readability and flow
- Keep proper HTML structure
- Ensure keyword "${keyword}" appears naturally throughout (1-2% density)

Provide the improved content in HTML format with proper heading structure.`;
}
