/**
 * Script to create SEO articles, categories, and tags
 * Run with: node scripts/create-seo-articles.js
 * 
 * This script will:
 * 1. Create necessary categories and tags
 * 2. Create 10 SEO articles with full bilingual content
 * 3. Set all posts to DRAFT status for review
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

// Helper function to create slug from title
function createSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper function to read article content from file
function readArticleContent(articleNumber) {
  const filePath = path.join(__dirname, `../docs/seo-articles/article-${articleNumber}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return null;
}

async function createCategoriesAndTags() {
  console.log('📁 Creating categories and tags...');

  const categories = [
    {
      name: 'Business Guide',
      slug: 'business-guide',
      description: 'Guides for starting and managing rental businesses',
      isActive: true
    },
    {
      name: 'Management',
      slug: 'management',
      description: 'Articles about rental shop management',
      isActive: true
    },
    {
      name: 'Software & Technology',
      slug: 'software-technology',
      description: 'Articles about rental management software and technology',
      isActive: true
    },
    {
      name: 'Marketing',
      slug: 'marketing',
      description: 'Marketing strategies for rental businesses',
      isActive: true
    }
  ];

  const tags = [
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

  const createdCategories = [];
  const createdTags = [];

  // Create categories
  for (const cat of categories) {
    try {
      const existing = await prisma.postCategory.findUnique({
        where: { slug: cat.slug }
      });
      if (existing) {
        console.log(`   ✓ Category "${cat.name}" already exists`);
        createdCategories.push(existing);
      } else {
        const category = await prisma.postCategory.create({ data: cat });
        console.log(`   ✓ Created category: ${category.name}`);
        createdCategories.push(category);
      }
    } catch (error) {
      console.error(`   ✗ Error creating category "${cat.name}":`, error.message);
    }
  }

  // Create tags
  for (const tagName of tags) {
    try {
      const slug = createSlug(tagName);
      const existing = await prisma.postTag.findUnique({
        where: { slug }
      });
      if (existing) {
        console.log(`   ✓ Tag "${tagName}" already exists`);
        createdTags.push(existing);
      } else {
        const tag = await prisma.postTag.create({
          data: { name: tagName, slug }
        });
        console.log(`   ✓ Created tag: ${tag.name}`);
        createdTags.push(tag);
      }
    } catch (error) {
      console.error(`   ✗ Error creating tag "${tagName}":`, error.message);
    }
  }

  return { categories: createdCategories, tags: createdTags };
}

async function getOrCreateAdminUser() {
  // Try to find existing admin user
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN', isActive: true }
  });

  if (admin) {
    console.log(`   ✓ Using existing admin user: ${admin.email} (ID: ${admin.id})`);
    return admin;
  }

  // If no admin exists, we need to create one or use a default
  console.log('   ⚠️  No admin user found. Please create an admin user first.');
  console.log('   You can run: node scripts/create-super-admin.js');
  throw new Error('No admin user found');
}

async function createArticle(postData, articleNumber) {
  try {
    // Check if post with same slug and locale already exists
    const existing = await prisma.post.findUnique({
      where: {
        slug_locale: {
          slug: postData.slug,
          locale: postData.locale
        }
      }
    });

    if (existing) {
      console.log(`   ⚠️  Article ${articleNumber} (${postData.locale}) already exists, skipping...`);
      return existing;
    }

    const post = await prisma.post.create({
      data: postData,
      include: {
        author: true,
        categories: { include: { category: true } },
        tags: { include: { tag: true } }
      }
    });

    console.log(`   ✓ Created article ${articleNumber} (${postData.locale}): ${post.title}`);
    return post;
  } catch (error) {
    console.error(`   ✗ Error creating article ${articleNumber} (${postData.locale}):`, error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting SEO articles creation...\n');

    // Step 1: Get or create admin user
    console.log('👤 Getting admin user...');
    const admin = await getOrCreateAdminUser();
    console.log('');

    // Step 2: Create categories and tags
    const { categories, tags } = await createCategoriesAndTags();
    console.log('');

    // Step 3: Create articles
    console.log('📝 Creating articles...');
    console.log('   Note: Articles will be created from JSON files in docs/seo-articles/');
    console.log('   If files don\'t exist, please create them first.\n');

    // The actual article creation will be done in a separate step
    // after we write the article content files

    console.log('✅ Setup complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Article content files need to be created in docs/seo-articles/');
    console.log('   2. Run this script again to create the posts');
    console.log('   3. Or use the Post API to create posts manually');

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

module.exports = { createCategoriesAndTags, getOrCreateAdminUser, createArticle };
