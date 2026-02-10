/**
 * Complete script to import all SEO articles into the database
 * 
 * Usage:
 * 1. Ensure you have an admin user in the database
 * 2. Set ADMIN_USER_ID environment variable or modify the script
 * 3. Run: node scripts/import-seo-articles.js
 * 
 * This script will:
 * - Create categories and tags if they don't exist
 * - Import all 10 SEO articles from JSON files
 * - Set all posts to DRAFT status for review
 */

// Load environment variables - try multiple locations
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

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const articlesDir = path.join(__dirname, '../docs/seo-articles');

// Helper function to create slug
function createSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Get or create admin user
async function getAdminUser() {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN', isActive: true }
  });

  if (!admin) {
    throw new Error('No admin user found. Please create an admin user first.');
  }

  return admin;
}

// Create categories
async function ensureCategories() {
  const categories = [
    { name: 'Business Guide', slug: 'business-guide', description: 'Guides for starting and managing rental businesses' },
    { name: 'Management', slug: 'management', description: 'Articles about rental shop management' },
    { name: 'Software & Technology', slug: 'software-technology', description: 'Articles about rental management software and technology' },
    { name: 'Marketing', slug: 'marketing', description: 'Marketing strategies for rental businesses' }
  ];

  const createdCategories = [];
  for (const cat of categories) {
    let category = await prisma.postCategory.findUnique({ where: { slug: cat.slug } });
    if (!category) {
      category = await prisma.postCategory.create({ data: cat });
      console.log(`   ✓ Created category: ${category.name}`);
    } else {
      console.log(`   ✓ Category exists: ${category.name}`);
    }
    createdCategories.push(category);
  }
  return createdCategories;
}

// Create tags
async function ensureTags() {
  const tagNames = [
    'rental business',
    'inventory management',
    'customer management',
    'order processing',
    'calendar scheduling',
    'financial reports',
    'multi-location',
    'pricing strategy',
    'marketing',
    'AnyRent',
    'rental software',
    'business growth',
    'best practices',
    'SEO'
  ];

  const createdTags = [];
  for (const tagName of tagNames) {
    const slug = createSlug(tagName);
    
    // First check if tag exists
    let tag = await prisma.$queryRaw`
      SELECT id, name, slug, "createdAt" 
      FROM "PostTag" 
      WHERE slug = ${slug}
      LIMIT 1
    `;
    
    if (tag && tag.length > 0) {
      tag = tag[0];
      console.log(`   ✓ Tag exists: ${tag.name}`);
    } else {
      // Create tag using raw SQL to avoid Prisma schema issues
      try {
        // Create tag using raw SQL
        const result = await prisma.$queryRaw`
          INSERT INTO "PostTag" (name, slug, "createdAt")
          VALUES (${tagName}, ${slug}, NOW())
          ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
          RETURNING id, name, slug, "createdAt"
        `;
        
        if (result && result.length > 0) {
          tag = result[0];
          console.log(`   ✓ Created tag: ${tag.name}`);
        } else {
          // Try to find it again in case of conflict
          const found = await prisma.$queryRaw`
            SELECT id, name, slug, "createdAt" 
            FROM "PostTag" 
            WHERE slug = ${slug}
            LIMIT 1
          `;
          if (found && found.length > 0) {
            tag = found[0];
            console.log(`   ✓ Tag already exists: ${tag.name}`);
          } else {
            console.log(`   ✗ Failed to create tag: ${tagName}`);
            continue;
          }
        }
      } catch (error) {
        console.log(`   ⚠️  Error creating tag "${tagName}": ${error.message}`);
        // Try to find it anyway
        const found = await prisma.$queryRaw`
          SELECT id, name, slug, "createdAt" 
          FROM "PostTag" 
          WHERE slug = ${slug}
          LIMIT 1
        `;
        if (found && found.length > 0) {
          tag = found[0];
          console.log(`   ✓ Tag found after error: ${tag.name}`);
        } else {
          console.log(`   ✗ Skipping tag: ${tagName}`);
          continue;
        }
      }
    }
    
    // Ensure tag has all required fields
    if (tag && tag.id) {
      createdTags.push({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        createdAt: tag.createdAt
      });
    }
  }
  return createdTags;
}

// Import article from JSON file
async function importArticle(filePath, authorId, categories, tags) {
  try {
    const articleData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const { article, content_vi, content_en } = articleData;

    // Get category and tag IDs
    const categoryIds = article.category_slugs
      .map(slug => categories.find(c => c.slug === slug)?.id)
      .filter(Boolean);

    const tagIds = article.tag_slugs
      .map(slug => tags.find(t => t.slug === createSlug(slug))?.id)
      .filter(Boolean);

    // Create Vietnamese post
    const viPost = {
      title: article.title_vi,
      slug: article.slug_vi,
      locale: 'vi',
      content: JSON.stringify(content_vi),
      excerpt: article.excerpt_vi,
      seoTitle: article.seo_title_vi,
      seoDescription: article.seo_description_vi,
      seoKeywords: article.seo_keywords_vi,
      status: 'DRAFT',
      authorId,
      categoryIds,
      tagIds,
      featuredImage: null
    };

    // Check if Vietnamese post exists using raw query (Prisma client may not have locale field yet)
    const existingViResult = await prisma.$queryRaw`
      SELECT id FROM "Post" WHERE slug = ${article.slug_vi} AND locale = 'vi' LIMIT 1
    `;
    const existingVi = existingViResult && existingViResult.length > 0 ? existingViResult[0] : null;

    if (!existingVi) {
      // Build create data
      const createData = {
        title: viPost.title,
        slug: viPost.slug,
        locale: viPost.locale,
        content: viPost.content,
        excerpt: viPost.excerpt || null,
        seoTitle: viPost.seoTitle || null,
        seoDescription: viPost.seoDescription || null,
        seoKeywords: viPost.seoKeywords || null,
        status: viPost.status,
        authorId: viPost.authorId,
        featuredImage: viPost.featuredImage || null,
        publishedAt: viPost.status === 'PUBLISHED' ? new Date() : null,
      };

      // Add categories if provided
      if (categoryIds.length > 0) {
        createData.categories = {
          create: categoryIds.map(catId => ({ categoryId: catId }))
        };
      }

      // Add tags if provided
      if (tagIds.length > 0) {
        createData.tags = {
          create: tagIds.map(tagId => ({ tagId }))
        };
      }

      await prisma.post.create({ data: createData });
      console.log(`   ✓ Created VI post: ${article.title_vi}`);
    } else {
      console.log(`   ⚠️  VI post exists: ${article.title_vi}`);
    }

    // Create English post
    const enPost = {
      title: article.title_en,
      slug: article.slug_en,
      locale: 'en',
      content: JSON.stringify(content_en),
      excerpt: article.excerpt_en,
      seoTitle: article.seo_title_en,
      seoDescription: article.seo_description_en,
      seoKeywords: article.seo_keywords_en,
      status: 'DRAFT',
      authorId,
      categoryIds,
      tagIds,
      featuredImage: null
    };

    // Check if English post exists using raw query (Prisma client may not have locale field yet)
    const existingEnResult = await prisma.$queryRaw`
      SELECT id FROM "Post" WHERE slug = ${article.slug_en} AND locale = 'en' LIMIT 1
    `;
    const existingEn = existingEnResult && existingEnResult.length > 0 ? existingEnResult[0] : null;

    if (!existingEn) {
      // Build create data
      const createData = {
        title: enPost.title,
        slug: enPost.slug,
        locale: enPost.locale,
        content: enPost.content,
        excerpt: enPost.excerpt || null,
        seoTitle: enPost.seoTitle || null,
        seoDescription: enPost.seoDescription || null,
        seoKeywords: enPost.seoKeywords || null,
        status: enPost.status,
        authorId: enPost.authorId,
        featuredImage: enPost.featuredImage || null,
        publishedAt: enPost.status === 'PUBLISHED' ? new Date() : null,
      };

      // Add categories if provided
      if (categoryIds.length > 0) {
        createData.categories = {
          create: categoryIds.map(catId => ({ categoryId: catId }))
        };
      }

      // Add tags if provided
      if (tagIds.length > 0) {
        createData.tags = {
          create: tagIds.map(tagId => ({ tagId }))
        };
      }

      await prisma.post.create({ data: createData });
      console.log(`   ✓ Created EN post: ${article.title_en}`);
    } else {
      console.log(`   ⚠️  EN post exists: ${article.title_en}`);
    }

  } catch (error) {
    console.error(`   ✗ Error importing article from ${filePath}:`, error.message);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting SEO articles import...\n');

    // Step 1: Get admin user
    console.log('👤 Getting admin user...');
    const admin = await getAdminUser();
    console.log(`   ✓ Using admin: ${admin.email} (ID: ${admin.id})\n`);

    // Step 2: Create categories and tags
    console.log('📁 Creating categories and tags...');
    const categories = await ensureCategories();
    const tags = await ensureTags();
    console.log('');

    // Step 3: Find and import all article JSON files
    console.log('📝 Importing articles...');
    const files = fs.readdirSync(articlesDir)
      .filter(f => f.endsWith('.json') && f.startsWith('article-'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/article-(\d+)/)?.[1] || '0');
        const numB = parseInt(b.match(/article-(\d+)/)?.[1] || '0');
        return numA - numB;
      });

    if (files.length === 0) {
      console.log('   ⚠️  No article JSON files found in docs/seo-articles/');
      console.log('   Please ensure article files are created first.');
      return;
    }

    for (const file of files) {
      const filePath = path.join(articlesDir, file);
      console.log(`\n   Processing: ${file}`);
      await importArticle(filePath, admin.id, categories, tags);
    }

    console.log('\n✅ Import complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Tags: ${tags.length}`);
    console.log(`   - Articles processed: ${files.length}`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Review articles in admin panel (/posts)`);
    console.log(`   2. Check SEO metadata`);
    console.log(`   3. Add actual images (replace placeholders)`);
    console.log(`   4. Publish articles when ready`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run script
if (require.main === module) {
  main();
}

module.exports = { main };
