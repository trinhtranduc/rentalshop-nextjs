/**
 * Script to reset and re-import all SEO articles with expanded 5000+ word content
 * 
 * This script will:
 * 1. Delete all existing posts
 * 2. Delete all existing tags
 * 3. Delete all existing categories
 * 4. Re-import all articles with expanded content
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

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not set!');
  process.exit(1);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

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

// Delete all posts
async function deleteAllPosts() {
  console.log('\n🗑️  Deleting all existing posts...');
  
  try {
    // Delete post relations first using raw SQL
    await prisma.$executeRaw`DELETE FROM "PostTagRelation"`;
    await prisma.$executeRaw`DELETE FROM "PostCategoryRelation"`;
    
    // Delete all posts
    const result = await prisma.$executeRaw`DELETE FROM "Post"`;
    console.log(`   ✓ Deleted all posts and relations`);
  } catch (error) {
    console.log(`   ⚠️  Error deleting posts: ${error.message}`);
    // Try alternative method
    try {
      await prisma.postTagRelation.deleteMany({});
      await prisma.postCategoryRelation.deleteMany({});
      const deleted = await prisma.post.deleteMany({});
      console.log(`   ✓ Deleted ${deleted.count} posts`);
    } catch (err) {
      console.log(`   ✗ Failed to delete posts: ${err.message}`);
      throw err;
    }
  }
}

// Delete all tags
async function deleteAllTags() {
  console.log('\n🗑️  Deleting all existing tags...');
  
  try {
    // Delete tag relations first using raw SQL
    await prisma.$executeRaw`DELETE FROM "PostTagRelation"`;
    
    // Delete all tags
    await prisma.$executeRaw`DELETE FROM "PostTag"`;
    console.log(`   ✓ Deleted all tags and relations`);
  } catch (error) {
    console.log(`   ⚠️  Error deleting tags: ${error.message}`);
    // Try alternative method
    try {
      await prisma.postTagRelation.deleteMany({});
      const deleted = await prisma.postTag.deleteMany({});
      console.log(`   ✓ Deleted ${deleted.count} tags`);
    } catch (err) {
      console.log(`   ✗ Failed to delete tags: ${err.message}`);
      throw err;
    }
  }
}

// Delete all categories
async function deleteAllCategories() {
  console.log('\n🗑️  Deleting all existing categories...');
  
  try {
    // Delete category relations first using raw SQL
    await prisma.$executeRaw`DELETE FROM "PostCategoryRelation"`;
    
    // Delete all categories
    await prisma.$executeRaw`DELETE FROM "PostCategory"`;
    console.log(`   ✓ Deleted all categories and relations`);
  } catch (error) {
    console.log(`   ⚠️  Error deleting categories: ${error.message}`);
    // Try alternative method
    try {
      await prisma.postCategoryRelation.deleteMany({});
      const deleted = await prisma.postCategory.deleteMany({});
      console.log(`   ✓ Deleted ${deleted.count} categories`);
    } catch (err) {
      console.log(`   ✗ Failed to delete categories: ${err.message}`);
      throw err;
    }
  }
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
    'SEO',
    'risk management',
    'shop space optimization',
    'brand building',
    'staff management',
    'customer retention',
    'product maintenance',
    'complaint handling',
    'competitor analysis',
    'revenue growth',
    'seasonal management',
    'digital technology',
    'contract management',
    'seasonal pricing',
    'review system',
    'financial accounting',
    'customer experience',
    'supply chain',
    'scaling business',
    'data security'
  ];

  const createdTags = [];
  for (const tagName of tagNames) {
    const slug = createSlug(tagName);
    let tag = await prisma.postTag.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true
      }
    });
    if (!tag) {
      try {
        // Try to create using Prisma first
        tag = await prisma.postTag.create({
          data: {
            name: tagName,
            slug
          }
        });
        console.log(`   ✓ Created tag: ${tag.name}`);
      } catch (error) {
        // If Prisma fails, try to find existing tag (might have been created by another process)
        tag = await prisma.postTag.findUnique({ where: { slug } });
        if (tag) {
          console.log(`   ✓ Tag already exists: ${tag.name}`);
        } else {
          // Last resort: try raw SQL with explicit fields only
          try {
            const result = await prisma.$queryRaw`
              INSERT INTO "PostTag" (name, slug, "createdAt")
              VALUES (${tagName}, ${slug}, NOW())
              ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
              RETURNING id, name, slug, "createdAt"
            `;
            if (result && result.length > 0) {
              tag = result[0];
              console.log(`   ✓ Created tag via raw query: ${tag.name}`);
            } else {
              // Try to find again after insert
              tag = await prisma.postTag.findUnique({ where: { slug } });
              if (tag) {
                console.log(`   ✓ Tag found after insert: ${tag.name}`);
              } else {
                console.log(`   ⚠️  Skipping tag: ${tagName} (database constraint issue)`);
                continue;
              }
            }
          } catch (rawError) {
            // Final fallback: just skip this tag
            console.log(`   ⚠️  Skipping tag: ${tagName} (${rawError.message})`);
            continue;
          }
        }
      }
    } else {
      console.log(`   ✓ Tag exists: ${tag.name}`);
    }
    createdTags.push(tag);
  }
  return createdTags;
}

// Import article from JSON file
async function importArticle(filePath, authorId, categories, tags) {
  try {
    const articleData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const { article, content_vi, content_en } = articleData;

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
      featuredImage: null
    };

    // Check if Vietnamese post exists
    const existingVi = await prisma.post.findFirst({
      where: {
        slug: article.slug_vi,
        locale: 'vi'
      }
    });

    if (!existingVi) {
      await prisma.post.create({
        data: {
          ...viPost,
          categories: categoryIds.length > 0 ? {
            create: categoryIds.map(catId => ({ categoryId: catId }))
          } : undefined,
          tags: tagIds.length > 0 ? {
            create: tagIds.map(tagId => ({ tagId }))
          } : undefined
        }
      });
      console.log(`   ✓ Created VI post: ${article.title_vi}`);
    } else {
      // Update existing post
      await prisma.post.update({
        where: { id: existingVi.id },
        data: {
          ...viPost,
          categories: {
            deleteMany: {},
            create: categoryIds.map(catId => ({ categoryId: catId }))
          },
          tags: {
            deleteMany: {},
            create: tagIds.map(tagId => ({ tagId }))
          }
        }
      });
      console.log(`   ✓ Updated VI post: ${article.title_vi}`);
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
      featuredImage: null
    };

    // Check if English post exists
    const existingEn = await prisma.post.findFirst({
      where: {
        slug: article.slug_en,
        locale: 'en'
      }
    });

    if (!existingEn) {
      await prisma.post.create({
        data: {
          ...enPost,
          categories: categoryIds.length > 0 ? {
            create: categoryIds.map(catId => ({ categoryId: catId }))
          } : undefined,
          tags: tagIds.length > 0 ? {
            create: tagIds.map(tagId => ({ tagId }))
          } : undefined
        }
      });
      console.log(`   ✓ Created EN post: ${article.title_en}`);
    } else {
      // Update existing post
      await prisma.post.update({
        where: { id: existingEn.id },
        data: {
          ...enPost,
          categories: {
            deleteMany: {},
            create: categoryIds.map(catId => ({ categoryId: catId }))
          },
          tags: {
            deleteMany: {},
            create: tagIds.map(tagId => ({ tagId }))
          }
        }
      });
      console.log(`   ✓ Updated EN post: ${article.title_en}`);
    }

  } catch (error) {
    console.error(`   ✗ Error importing article from ${filePath}:`, error.message);
    throw error;
  }
}

// Main function
async function main() {
  console.log('🚀 Starting complete reset and re-import of SEO articles...\n');

  // Step 1: Delete all existing data
  await deleteAllPosts();
  await deleteAllTags();
  await deleteAllCategories();

  // Step 2: Get admin user
  const adminUser = await getAdminUser();
  const authorId = adminUser.id;
  console.log(`\n   ✓ Using admin: ${adminUser.email} (ID: ${authorId})`);

  // Step 3: Create categories and tags
  console.log('\n📁 Creating categories and tags...');
  const categories = await ensureCategories();
  const tags = await ensureTags();

  // Step 4: Import all articles
  console.log('\n📝 Importing articles with expanded 5000+ word content...');
  const articleFiles = fs.readdirSync(articlesDir)
    .filter(file => file.endsWith('.json'))
    .sort();

  let successCount = 0;
  let errorCount = 0;

  for (const file of articleFiles) {
    const filePath = path.join(articlesDir, file);
    try {
      console.log(`\n   Processing: ${file}`);
      await importArticle(filePath, authorId, categories, tags);
      successCount++;
    } catch (error) {
      console.error(`   ✗ Error processing ${file}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n✅ Import complete!');
  console.log('\n📊 Summary:');
  console.log(`   - Categories: ${categories.length}`);
  console.log(`   - Tags: ${tags.length}`);
  console.log(`   - Articles processed: ${articleFiles.length}`);
  console.log(`   - Success: ${successCount}`);
  console.log(`   - Errors: ${errorCount}`);

  console.log('\n📝 Next steps:');
  console.log('   1. Review articles in admin panel (/posts)');
  console.log('   2. Check SEO metadata');
  console.log('   3. Verify content is 5000+ words');
  console.log('   4. Add actual images (replace placeholders)');
  console.log('   5. Publish articles when ready');
}

main()
  .catch(async (e) => {
    console.error('\n❌ Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
