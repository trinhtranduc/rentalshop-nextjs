/**
 * Script to delete all posts, categories, and tags from database
 * 
 * WARNING: This will permanently delete all blog content!
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

// Delete all posts, categories, and tags
async function deleteAllData() {
  console.log('🗑️  Starting deletion of all posts, categories, and tags...\n');

  try {
    // Step 1: Delete post relations
    console.log('   Step 1: Deleting post relations...');
    await prisma.postTagRelation.deleteMany({});
    await prisma.postCategoryRelation.deleteMany({});
    console.log('   ✓ Deleted all post relations\n');

    // Step 2: Delete all posts
    console.log('   Step 2: Deleting all posts...');
    const deletedPosts = await prisma.post.deleteMany({});
    console.log(`   ✓ Deleted ${deletedPosts.count} posts\n`);

    // Step 3: Delete all tags
    console.log('   Step 3: Deleting all tags...');
    const deletedTags = await prisma.postTag.deleteMany({});
    console.log(`   ✓ Deleted ${deletedTags.count} tags\n`);

    // Step 4: Delete all categories
    console.log('   Step 4: Deleting all categories...');
    const deletedCategories = await prisma.postCategory.deleteMany({});
    console.log(`   ✓ Deleted ${deletedCategories.count} categories\n`);

    console.log('✅ All data deleted successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Posts deleted: ${deletedPosts.count}`);
    console.log(`   - Tags deleted: ${deletedTags.count}`);
    console.log(`   - Categories deleted: ${deletedCategories.count}`);

  } catch (error) {
    console.error('\n❌ Error deleting data:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    await deleteAllData();
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
