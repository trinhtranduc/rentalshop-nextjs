/**
 * Script to export posts from database to markdown files in review folder
 * 
 * This script will:
 * 1. Fetch all posts from database
 * 2. Convert TipTap JSON content to Markdown
 * 3. Save to docs/posts-for-review/ for review
 */

// Load environment variables
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Try to load from .env, .env.local, or .env.development
const envFiles = [
  path.join(__dirname, '../.env.local'),
  path.join(__dirname, '../.env.development'),
  path.join(__dirname, '../.env')
];

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
    console.log(`   ✓ Loaded environment from: ${path.basename(envFile)}`);
    break;
  }
}

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not set!');
  process.exit(1);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + (process.env.DATABASE_URL.includes('sslmode') ? '' : '?sslmode=disable'),
    },
  },
});

const reviewDir = path.join(__dirname, '../docs/posts-for-review');

// Ensure review directory exists
if (!fs.existsSync(reviewDir)) {
  fs.mkdirSync(reviewDir, { recursive: true });
  console.log(`   ✓ Created directory: ${reviewDir}`);
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

// Export post to markdown
async function exportPostToMarkdown(post) {
  try {
    // Get categories and tags
    const categories = await prisma.postCategoryRelation.findMany({
      where: { postId: post.id },
      include: { category: true }
    });
    
    const tags = await prisma.postTagRelation.findMany({
      where: { postId: post.id },
      include: { tag: true }
    });

    // Convert content to markdown
    let contentMarkdown = '';
    if (post.content) {
      try {
        const contentJson = JSON.parse(post.content);
        contentMarkdown = nodeToMarkdown(contentJson);
      } catch (error) {
        console.error(`   ⚠️  Error parsing content for post ${post.id}:`, error.message);
        contentMarkdown = '[Error parsing content]';
      }
    }

    // Create markdown document
    const markdown = `# ${post.title}

## Post Metadata

**ID:** ${post.id}
**Slug:** ${post.slug}
**Locale:** ${post.locale}
**Status:** ${post.status}
**Created:** ${post.createdAt}
**Updated:** ${post.updatedAt}

**Categories:** ${categories.map(c => c.category.name).join(', ') || 'None'}
**Tags:** ${tags.map(t => t.tag.name).join(', ') || 'None'}

**SEO Title:** ${post.seoTitle || 'N/A'}
**SEO Description:** ${post.seoDescription || 'N/A'}
**SEO Keywords:** ${post.seoKeywords || 'N/A'}

**Excerpt:**
${post.excerpt || 'N/A'}

---

## Content

${contentMarkdown}

---

## Review Notes

- [ ] Content reviewed
- [ ] No duplicate content
- [ ] SEO metadata complete
- [ ] Images are not placeholders
- [ ] Grammar and spelling checked
- [ ] Ready for import/publish

`;

    // Save to file
    const fileName = `post-${post.id}-${post.slug}-${post.locale}.md`;
    const filePath = path.join(reviewDir, fileName);
    fs.writeFileSync(filePath, markdown, 'utf8');
    
    return fileName;
  } catch (error) {
    console.error(`   ✗ Error exporting post ${post.id}:`, error.message);
    return null;
  }
}

// Main function
async function main() {
  console.log('📤 Exporting posts to review folder...\n');

  try {
    // Fetch all posts
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' }
    });

    if (posts.length === 0) {
      console.log('   ⚠️  No posts found in database!');
      return;
    }

    console.log(`   Found ${posts.length} posts\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const post of posts) {
      try {
        const fileName = await exportPostToMarkdown(post);
        if (fileName) {
          console.log(`   ✓ Exported: ${fileName}`);
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`   ✗ Error exporting post ${post.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n✅ Export complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Posts found: ${posts.length}`);
    console.log(`   - Success: ${successCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`\n📁 Markdown files saved to: ${reviewDir}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Review markdown files in docs/posts-for-review/');
    console.log('   2. Edit content to remove duplicates');
    console.log('   3. Update posts in database when ready');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
