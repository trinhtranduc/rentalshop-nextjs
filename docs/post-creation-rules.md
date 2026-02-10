# 📝 Rules for Creating SEO Blog Posts

## 🎯 Overview

This document outlines the rules and guidelines for creating high-quality SEO blog posts for the rental shop platform.

## 📋 Content Requirements

### 1. Article Structure

Each article must have:
- **Title (Vietnamese & English)**: Clear, descriptive, SEO-optimized
- **Slug (Vietnamese & English)**: URL-friendly, lowercase, hyphenated
- **Excerpt (Vietnamese & English)**: 150-200 words summary
- **SEO Metadata**:
  - SEO Title: 50-60 characters
  - SEO Description: 150-160 characters
  - SEO Keywords: 5-10 relevant keywords
- **Content (Vietnamese & English)**: Minimum 4000 words, ideally 4000-6000 words

### 2. Content Quality Standards

#### ✅ DO:
- Write original, valuable content
- Use clear headings (H1, H2, H3)
- Include bullet points and numbered lists
- Add relevant images with proper alt text
- Use internal links to related articles
- Include actionable tips and best practices
- Write in a conversational, helpful tone
- Use examples and case studies
- Include call-to-action (CTA) mentioning AnyRent

#### ❌ DON'T:
- Duplicate content from other sources
- Use repetitive paragraphs
- Write overly promotional content
- Use keyword stuffing
- Create thin content (< 2000 words)
- Use placeholder text in final version
- Copy content from competitors
- Use broken or placeholder images in production

### 3. Content Format

#### TipTap JSON Structure

Content must be in TipTap JSON format:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{ "type": "text", "text": "Main Title" }]
    },
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Paragraph content..." }]
    },
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Section Title" }]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [{
            "type": "paragraph",
            "content": [{ "type": "text", "text": "List item" }]
          }]
        }
      ]
    },
    {
      "type": "image",
      "attrs": {
        "src": "https://example.com/image.jpg",
        "alt": "Descriptive alt text"
      }
    }
  ]
}
```

### 4. Headings Structure

Use proper heading hierarchy following VnExpress style:
- **H1**: Main article title (only one per article)
- **H2**: Major sections (4-6 per article, keep it minimal)
- **NO H3**: Avoid using H3 subsections to keep structure simple and natural

**IMPORTANT**: After every heading (H2), you MUST include ONE comprehensive paragraph (200-400 words) that provides detailed information about that section. This paragraph should:
- Explain the topic in depth with natural flow
- Provide context, background, and real-world examples
- Include relevant statistics, case studies, or expert insights
- Give actionable information and practical tips
- Flow naturally like a news article, not overly structured
- Not be repetitive or duplicate content

**Style Guidelines** (inspired by VnExpress):
- Keep headings minimal - only use when topic truly changes
- Each paragraph should be substantial and informative
- Write in a natural, journalistic style
- Use transitions between paragraphs for smooth flow
- Include relevant details, statistics, and examples within paragraphs

Example:
```
# Main Title (H1)

[Long introductory paragraph - 300-400 words explaining the topic comprehensively with context, statistics, and real-world relevance]

## Section 1: Topic Overview (H2)

[One comprehensive paragraph - 250-400 words explaining the section topic in depth, with examples, statistics, expert quotes, and actionable insights. This paragraph should flow naturally and cover all aspects of the topic without needing subsections.]

## Section 2: Key Considerations (H2)

[One comprehensive paragraph - 250-400 words covering all key considerations, challenges, opportunities, and practical advice. Include real examples, case studies, and expert perspectives within the paragraph.]

## Section 3: Best Practices (H2)

[One comprehensive paragraph - 250-400 words explaining best practices with detailed examples, actionable tips, common mistakes to avoid, and success stories. The paragraph should be thorough enough to stand alone.]

## Conclusion (H2)

[One comprehensive paragraph - 250-400 words summarizing key points, providing final insights, and including a natural CTA mentioning AnyRent]
```

### 5. Images

- **Format**: JPG or PNG
- **Size**: 800x400px or 1200x600px (16:9 ratio)
- **Alt Text**: Descriptive, include relevant keywords
- **Placement**: Every 500-800 words
- **Quality**: High resolution, professional images
- **Sources**: Use royalty-free images (Unsplash, Pexels, etc.)

### 6. Internal Linking

- Link to 3-5 related articles within the same category
- Use descriptive anchor text
- Link to relevant AnyRent features when appropriate

### 7. Categories & Tags

#### Categories (Choose 1-2):
- `business-guide`: Business planning and strategy
- `management`: Operations and management
- `software-technology`: Software and technology
- `marketing`: Marketing and growth

#### Tags (Choose 3-5):
- rental business
- inventory management
- customer management
- order processing
- calendar scheduling
- financial reports
- multi-location
- pricing strategy
- marketing
- AnyRent
- rental software
- business growth
- best practices
- SEO

## 📝 Writing Guidelines

### 1. Tone & Style

- **Tone**: Professional yet friendly, helpful, authoritative
- **Voice**: Second person ("you", "your") or first person plural ("we", "our")
- **Style**: Clear, concise, easy to understand
- **Language**: Use simple language, avoid jargon unless necessary

### 2. Paragraphs

- Keep paragraphs short (3-5 sentences)
- Use white space effectively
- One idea per paragraph

### 3. Lists

Use lists for:
- Steps or processes
- Features or benefits
- Tips or recommendations
- Common mistakes to avoid

### 4. Call-to-Action (CTA)

Include CTAs naturally:
- "Try AnyRent today to streamline your rental operations"
- "With AnyRent, you can manage your rental business more efficiently"
- "Start using AnyRent to improve your rental shop management"

### 5. Keywords

- **Primary Keyword**: Use in H1, first paragraph, and 2-3 times throughout
- **Secondary Keywords**: Use naturally in H2 headings and body
- **Long-tail Keywords**: Include in subheadings and content
- **Avoid**: Keyword stuffing, unnatural keyword placement

## 🔍 SEO Best Practices

### 1. On-Page SEO

- **Title Tag**: 50-60 characters, include primary keyword
- **Meta Description**: 150-160 characters, compelling, include keywords
- **URL Slug**: Short, descriptive, include primary keyword
- **Header Tags**: Use H1, H2, H3 properly
- **Image Alt Text**: Descriptive, include keywords when relevant
- **Internal Links**: Link to 3-5 related articles
- **External Links**: Link to authoritative sources (optional)

### 2. Content SEO

- **Word Count**: Minimum 4000 words, ideal 4000-6000 words
- **Keyword Density**: 1-2% for primary keyword
- **LSI Keywords**: Include related terms naturally
- **Readability**: Aim for 8th-10th grade reading level
- **Content Freshness**: Update regularly, keep information current

### 3. Technical SEO

- **Mobile-Friendly**: Ensure content displays well on mobile
- **Page Speed**: Optimize images, minimize code
- **Schema Markup**: Use structured data when possible
- **Canonical URLs**: Set proper canonical tags

## 📊 Content Review Checklist

Before publishing, ensure:

- [ ] Content is original (no plagiarism)
- [ ] No duplicate paragraphs or sections
- [ ] Word count meets minimum (4000+ words)
- [ ] Proper heading structure (H1, H2, H3)
- [ ] Images have proper alt text
- [ ] SEO metadata is complete
- [ ] Categories and tags are assigned
- [ ] Internal links are included
- [ ] CTA mentions AnyRent naturally
- [ ] Content is proofread (no typos)
- [ ] Vietnamese and English versions are complete
- [ ] Content is factually accurate
- [ ] Images are high quality (not placeholders)
- [ ] Content provides value to readers

## 🚫 Common Mistakes to Avoid

1. **Duplicate Content**: Don't repeat the same paragraphs
2. **Thin Content**: Don't publish articles < 4000 words
3. **Keyword Stuffing**: Use keywords naturally
4. **Poor Structure**: Use proper headings and formatting
5. **Missing Images**: Include relevant images
6. **Broken Links**: Check all links before publishing
7. **Placeholder Text**: Remove all placeholder content
8. **Poor Grammar**: Proofread thoroughly
9. **Outdated Information**: Keep content current
10. **No CTA**: Always include a call-to-action

## 📁 File Organization

### JSON File Structure

```json
{
  "article": {
    "number": 1,
    "title_vi": "Vietnamese Title",
    "title_en": "English Title",
    "slug_vi": "vietnamese-slug",
    "slug_en": "english-slug",
    "excerpt_vi": "Vietnamese excerpt...",
    "excerpt_en": "English excerpt...",
    "seo_title_vi": "SEO Title VI",
    "seo_title_en": "SEO Title EN",
    "seo_description_vi": "SEO Description VI...",
    "seo_description_en": "SEO Description EN...",
    "seo_keywords_vi": "keyword1, keyword2, keyword3",
    "seo_keywords_en": "keyword1, keyword2, keyword3",
    "category_slugs": ["business-guide"],
    "tag_slugs": ["rental business", "best practices"],
    "featured_image_alt_vi": "Alt text VI",
    "featured_image_alt_en": "Alt text EN"
  },
  "content_vi": {
    "type": "doc",
    "content": [...]
  },
  "content_en": {
    "type": "doc",
    "content": [...]
  }
}
```

## 🔄 Workflow

1. **Research**: Research topic, keywords, and competitors
2. **Outline**: Create detailed outline with headings
3. **Write**: Write content following these rules
4. **Review**: Self-review using checklist
5. **Convert**: Convert to TipTap JSON format
6. **Save**: Save as JSON file in `docs/seo-articles/`
7. **Markdown**: Generate markdown for review
8. **Review**: Review markdown in `docs/posts-for-review/`
9. **Edit**: Make necessary edits
10. **Import**: Import to database when ready

## 📚 Resources

- [TipTap Documentation](https://tiptap.dev/)
- [SEO Best Practices](https://developers.google.com/search/docs/beginner/seo-starter-guide)
- [Content Writing Tips](https://www.hubspot.com/marketing/how-to-write-a-blog-post)

## ✅ Quality Standards

All articles must meet these standards:
- ✅ Original, valuable content
- ✅ Minimum 2000 words
- ✅ Proper SEO optimization
- ✅ Good readability
- ✅ Relevant images
- ✅ Internal linking
- ✅ No duplicate content
- ✅ Professional tone
- ✅ Actionable insights
- ✅ AnyRent CTA included

---

**Last Updated**: 2025-01-XX
**Version**: 1.0
