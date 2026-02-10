/**
 * Script to convert JSON article files to Markdown format for review
 * 
 * This script will:
 * 1. Read all JSON article files from docs/seo-articles/
 * 2. Convert TipTap JSON content to Markdown
 * 3. Save as .md files in docs/seo-articles-markdown/
 * 4. Remove duplicate content sections
 */

const fs = require('fs');
const path = require('path');

const articlesDir = path.join(__dirname, '../docs/seo-articles');
const markdownDir = path.join(__dirname, '../docs/seo-articles-markdown');

// Ensure markdown directory exists
if (!fs.existsSync(markdownDir)) {
  fs.mkdirSync(markdownDir, { recursive: true });
  console.log(`   ✓ Created directory: ${markdownDir}`);
}

// Convert TipTap JSON node to Markdown
function nodeToMarkdown(node, depth = 0) {
  if (!node || !node.type) return '';

  switch (node.type) {
    case 'doc':
      if (!node.content || !Array.isArray(node.content)) return '';
      return node.content.map(child => nodeToMarkdown(child, depth)).join('\n\n');

    case 'heading':
      const level = node.attrs?.level || 1;
      const headingText = extractText(node.content || []);
      return `${'#'.repeat(level)} ${headingText}`;

    case 'paragraph':
      const paraText = extractText(node.content || []);
      return paraText || '';

    case 'bulletList':
      if (!node.content || !Array.isArray(node.content)) return '';
      return node.content
        .map(item => {
          const itemText = extractTextFromListItem(item);
          return `- ${itemText}`;
        })
        .join('\n');

    case 'orderedList':
      if (!node.content || !Array.isArray(node.content)) return '';
      return node.content
        .map((item, index) => {
          const itemText = extractTextFromListItem(item);
          return `${index + 1}. ${itemText}`;
        })
        .join('\n');

    case 'blockquote':
      const quoteText = extractText(node.content || []);
      return `> ${quoteText}`;

    case 'codeBlock':
      const codeText = extractText(node.content || []);
      const language = node.attrs?.language || '';
      return `\`\`\`${language}\n${codeText}\n\`\`\``;

    case 'hardBreak':
      return '\n';

    case 'image':
      const src = node.attrs?.src || '';
      const alt = node.attrs?.alt || '';
      return `![${alt}](${src})`;

    case 'horizontalRule':
      return '---';

    default:
      // For unknown types, try to extract text
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(child => nodeToMarkdown(child, depth + 1)).join('');
      }
      return '';
  }
}

// Extract text from content array
function extractText(content) {
  if (!Array.isArray(content)) return '';
  
  return content
    .map(node => {
      if (node.type === 'text') {
        return node.text || '';
      } else if (node.type === 'hardBreak') {
        return '\n';
      } else if (node.content && Array.isArray(node.content)) {
        return extractText(node.content);
      }
      return '';
    })
    .join('');
}

// Extract text from list item
function extractTextFromListItem(item) {
  if (!item.content || !Array.isArray(item.content)) return '';
  
  return item.content
    .map(node => {
      if (node.type === 'paragraph') {
        return extractText(node.content || []);
      }
      return '';
    })
    .join('');
}

// Remove duplicate paragraphs (same text appears multiple times)
function removeDuplicateContent(markdown) {
  const lines = markdown.split('\n');
  const seen = new Set();
  const result = [];
  let lastLine = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines (but keep one if needed for spacing)
    if (!trimmed) {
      // Only add empty line if previous line wasn't empty
      if (lastLine.trim()) {
        result.push(line);
      }
      lastLine = line;
      continue;
    }
    
    // Normalize line for comparison (remove extra spaces, lowercase)
    const normalized = trimmed.toLowerCase();
    
    // Check for common duplicate patterns
    const duplicatePatterns = [
      'chi tiết quan trọng về',
      'đây là một trong những yếu tố then chốt',
      'best practices đã được chứng minh hiệu quả',
      'important details about',
      'this is one of the key factors',
      'best practices have been proven effective'
    ];
    
    const isDuplicatePattern = duplicatePatterns.some(pattern => 
      normalized.includes(pattern) && seen.has(normalized)
    );
    
    // Skip if we've seen this exact line before (duplicate)
    if (seen.has(normalized) || isDuplicatePattern) {
      continue;
    }
    
    seen.add(normalized);
    result.push(line);
    lastLine = line;
  }
  
  // Remove excessive empty lines (more than 2 consecutive)
  const cleaned = result.join('\n');
  return cleaned.replace(/\n{4,}/g, '\n\n\n');
}

// Convert article JSON to Markdown
function convertArticleToMarkdown(articleData) {
  const { article, content_vi, content_en } = articleData;
  
  // Convert Vietnamese content
  const markdownVi = nodeToMarkdown(content_vi);
  const cleanMarkdownVi = removeDuplicateContent(markdownVi);
  
  // Convert English content
  const markdownEn = nodeToMarkdown(content_en);
  const cleanMarkdownEn = removeDuplicateContent(markdownEn);
  
  // Create full markdown document
  const fullMarkdown = `# ${article.title_vi} / ${article.title_en}

## Article Metadata

**Number:** ${article.number}
**Slug (VI):** ${article.slug_vi}
**Slug (EN):** ${article.slug_en}

**Categories:** ${article.category_slugs.join(', ')}
**Tags:** ${article.tag_slugs.join(', ')}

**SEO Title (VI):** ${article.seo_title_vi}
**SEO Title (EN):** ${article.seo_title_en}

**SEO Description (VI):** ${article.seo_description_vi}
**SEO Description (EN):** ${article.seo_description_en}

**SEO Keywords (VI):** ${article.seo_keywords_vi}
**SEO Keywords (EN):** ${article.seo_keywords_en}

**Excerpt (VI):** ${article.excerpt_vi}
**Excerpt (EN):** ${article.excerpt_en}

---

## Vietnamese Content

${cleanMarkdownVi}

---

## English Content

${cleanMarkdownEn}
`;

  return fullMarkdown;
}

// Main function
async function main() {
  console.log('📝 Converting JSON articles to Markdown...\n');

  // Get all JSON files
  const files = fs.readdirSync(articlesDir)
    .filter(file => file.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.log('   ⚠️  No JSON article files found!');
    return;
  }

  console.log(`   Found ${files.length} article files\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    try {
      const filePath = path.join(articlesDir, file);
      const articleData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Convert to markdown
      const markdown = convertArticleToMarkdown(articleData);
      
      // Save markdown file
      const markdownFileName = file.replace('.json', '.md');
      const markdownPath = path.join(markdownDir, markdownFileName);
      fs.writeFileSync(markdownPath, markdown, 'utf8');
      
      console.log(`   ✓ Converted: ${file} → ${markdownFileName}`);
      successCount++;
    } catch (error) {
      console.error(`   ✗ Error converting ${file}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n✅ Conversion complete!');
  console.log('\n📊 Summary:');
  console.log(`   - Files processed: ${files.length}`);
  console.log(`   - Success: ${successCount}`);
  console.log(`   - Errors: ${errorCount}`);
  console.log(`\n📁 Markdown files saved to: ${markdownDir}`);
  console.log('\n📝 Next steps:');
  console.log('   1. Review markdown files in docs/seo-articles-markdown/');
  console.log('   2. Edit content to remove duplicates');
  console.log('   3. Update JSON files with cleaned content');
  console.log('   4. Run import script when ready');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
