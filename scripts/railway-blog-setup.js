/**
 * Railway Blog CMS setup — verify tables, seed default categories/tags, print admin URLs.
 *
 * Usage (local with Railway DATABASE_URL):
 *   railway run --service apis --environment production node scripts/railway-blog-setup.js
 *
 * Or with DATABASE_URL in .env:
 *   node scripts/railway-blog-setup.js
 *
 * Options:
 *   --seed-only     Skip migrate hint, only seed defaults if empty
 *   --import-seo    Run import-seo-articles.js after setup
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const dotenv = require('dotenv');

const envFiles = [
  path.join(__dirname, '../.env.local'),
  path.join(__dirname, '../.env.production'),
  path.join(__dirname, '../.env'),
];
for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
    break;
  }
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: 'Hướng dẫn kinh doanh', slug: 'business-guide', description: 'Hướng dẫn mở và vận hành cửa hàng cho thuê' },
  { name: 'Quản lý', slug: 'management', description: 'Quản lý cửa hàng cho thuê' },
  { name: 'Phần mềm & Công nghệ', slug: 'software-technology', description: 'Phần mềm quản lý cho thuê' },
  { name: 'Marketing', slug: 'marketing', description: 'Chiến lược marketing cho cửa hàng cho thuê' },
];

const DEFAULT_TAGS = [
  { name: 'cho thuê áo dài', slug: 'cho-thue-ao-dai' },
  { name: 'cho thuê áo cưới', slug: 'cho-thue-ao-cuoi' },
  { name: 'quản lý cửa hàng', slug: 'quan-ly-cua-hang' },
  { name: 'AnyRent', slug: 'anyrent' },
  { name: 'SEO', slug: 'seo' },
];

async function tableExists(tableName) {
  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) AS "exists"
  `;
  return Boolean(rows[0]?.exists);
}

async function seedDefaults() {
  let categoriesCreated = 0;
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await prisma.postCategory.findUnique({ where: { slug: cat.slug } });
    if (!existing) {
      await prisma.postCategory.create({ data: cat });
      categoriesCreated += 1;
    }
  }

  let tagsCreated = 0;
  for (const tag of DEFAULT_TAGS) {
    const existing = await prisma.postTag.findUnique({ where: { slug: tag.slug } });
    if (!existing) {
      await prisma.postTag.create({ data: tag });
      tagsCreated += 1;
    }
  }

  return { categoriesCreated, tagsCreated };
}

async function main() {
  const args = process.argv.slice(2);
  const seedOnly = args.includes('--seed-only');
  const runImport = args.includes('--import-seo');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL chưa được set.');
    console.error('');
    console.error('Chạy qua Railway CLI (khuyến nghị):');
    console.error('  railway run --service apis --environment production node scripts/railway-blog-setup.js');
    process.exit(1);
  }

  console.log('📋 Railway Blog CMS — kiểm tra database...\n');

  const requiredTables = ['Post', 'PostCategory', 'PostTag', 'PostCategoryRelation', 'PostTagRelation'];
  const missing = [];
  for (const table of requiredTables) {
    const ok = await tableExists(table);
    console.log(ok ? `   ✅ ${table}` : `   ❌ ${table} (thiếu)`);
    if (!ok) missing.push(table);
  }

  if (missing.length > 0 && !seedOnly) {
    console.error('\n❌ Thiếu bảng blog. Chạy migration trước:');
    console.error('  yarn railway:blog:migrate');
    console.error('  # hoặc: railway run --service apis --environment production yarn railway:migrate');
    process.exit(1);
  }

  const [postCount, categoryCount, tagCount] = await Promise.all([
    prisma.post.count(),
    prisma.postCategory.count(),
    prisma.postTag.count(),
  ]);

  console.log(`\n📊 Hiện có: ${postCount} bài | ${categoryCount} category | ${tagCount} tag`);

  const { categoriesCreated, tagsCreated } = await seedDefaults();
  if (categoriesCreated || tagsCreated) {
    console.log(`\n🌱 Đã seed: +${categoriesCreated} category, +${tagsCreated} tag`);
  } else {
    console.log('\n🌱 Category/tag mặc định đã có sẵn (bỏ qua seed).');
  }

  const adminUrl =
    process.env.NEXT_PUBLIC_ADMIN_URL ||
    process.env.ADMIN_URL_PROD ||
    'https://admin.anyrent.shop';

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Quản lý Post / Tag / SEO trên Admin (lưu vào Railway DB):');
  console.log(`   • Bài viết:    ${adminUrl}/posts`);
  console.log(`   • Categories:  ${adminUrl}/posts/categories`);
  console.log(`   • Tags:        ${adminUrl}/posts/tags`);
  console.log(`   • Tạo bài:     ${adminUrl}/posts/create`);
  console.log('');
  console.log('   Đăng nhập: admin@rentalshop.com (role ADMIN)');
  console.log('   SEO fields: seoTitle, seoDescription, seoKeywords trong form bài viết');
  console.log('   Blog public: https://anyrent.shop/blog');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (runImport) {
    console.log('📥 Chạy import SEO articles...');
    execSync('node scripts/import-seo-articles.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  }
}

main()
  .catch((err) => {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
