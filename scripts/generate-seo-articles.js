/**
 * Script to generate all 10 SEO articles
 * This creates comprehensive article content files that can be imported
 */

const fs = require('fs');
const path = require('path');

const articlesDir = path.join(__dirname, '../docs/seo-articles');

// Ensure directory exists
if (!fs.existsSync(articlesDir)) {
  fs.mkdirSync(articlesDir, { recursive: true });
}

// Article templates with full content structure
const articleTemplates = [
  {
    number: 1,
    title_vi: "Hướng Dẫn Toàn Diện Bắt Đầu Kinh Doanh Cho Thuê: Từ Ý Tưởng Đến Khởi Nghiệp",
    title_en: "Complete Guide to Starting a Rental Business: From Idea to Launch",
    slug_vi: "huong-dan-bat-dau-kinh-doanh-cho-thue",
    slug_en: "complete-guide-starting-rental-business",
    category: "business-guide",
    tags: ["rental business", "best practices", "SEO"]
  },
  {
    number: 2,
    title_vi: "Quản Lý Kho Hàng Cho Cửa Hàng Cho Thuê: Thực Hành Tốt Nhất & Chiến Lược",
    title_en: "Inventory Management for Rental Shops: Best Practices & Strategies",
    slug_vi: "quan-ly-kho-hang-cho-thue",
    slug_en: "inventory-management-rental-shops",
    category: "management",
    tags: ["inventory management", "best practices", "SEO"]
  },
  {
    number: 3,
    title_vi: "Quản Lý Quan Hệ Khách Hàng Cho Doanh Nghiệp Cho Thuê",
    title_en: "Customer Relationship Management for Rental Businesses",
    slug_vi: "quan-ly-khach-hang-cho-thue",
    slug_en: "customer-relationship-management-rental",
    category: "management",
    tags: ["customer management", "CRM", "SEO"]
  },
  {
    number: 4,
    title_vi: "Tối Ưu Hóa Quy Trình Xử Lý Đơn Hàng & Hệ Thống Thanh Toán",
    title_en: "Streamlining Order Processing and Payment Systems",
    slug_vi: "toi-uu-hoa-quy-trinh-don-hang-thanh-toan",
    slug_en: "order-processing-payment-systems",
    category: "management",
    tags: ["order processing", "payment management", "SEO"]
  },
  {
    number: 5,
    title_vi: "Quản Lý Lịch & Lên Lịch Cho Hoạt Động Cho Thuê",
    title_en: "Calendar Management and Scheduling for Rental Operations",
    slug_vi: "quan-ly-lich-len-lich-cho-thue",
    slug_en: "calendar-scheduling-rental-operations",
    category: "management",
    tags: ["calendar scheduling", "best practices", "SEO"]
  },
  {
    number: 6,
    title_vi: "Báo Cáo Tài Chính & Phân Tích Kinh Doanh Cho Cửa Hàng Cho Thuê",
    title_en: "Financial Reporting and Business Analytics for Rental Shops",
    slug_vi: "bao-cao-tai-chinh-phan-tich-kinh-doanh",
    slug_en: "financial-reporting-business-analytics",
    category: "management",
    tags: ["financial reports", "business analytics", "SEO"]
  },
  {
    number: 7,
    title_vi: "Quản Lý Đa Chi Nhánh Cho Doanh Nghiệp Cho Thuê Đang Phát Triển",
    title_en: "Multi-Location Management for Growing Rental Businesses",
    slug_vi: "quan-ly-da-chi-nhanh-cho-thue",
    slug_en: "multi-location-management-rental",
    category: "management",
    tags: ["multi-location", "business growth", "SEO"]
  },
  {
    number: 8,
    title_vi: "Tối Ưu Hóa Giá Cả & Chiến Lược Định Giá Cho Doanh Nghiệp Cho Thuê",
    title_en: "Pricing Optimization and Strategy for Rental Businesses",
    slug_vi: "toi-uu-hoa-gia-ca-chien-luoc-dinh-gia",
    slug_en: "pricing-optimization-strategy-rental",
    category: "management",
    tags: ["pricing strategy", "best practices", "SEO"]
  },
  {
    number: 9,
    title_vi: "Chiến Lược Marketing & Quảng Cáo Cho Tăng Trưởng Cửa Hàng Cho Thuê",
    title_en: "Marketing Strategies for Rental Shop Growth",
    slug_vi: "chien-luoc-marketing-cho-thue",
    slug_en: "marketing-strategies-rental-shop",
    category: "marketing",
    tags: ["marketing", "business growth", "SEO"]
  },
  {
    number: 10,
    title_vi: "Giới Thiệu Tính Năng AnyRent - Hướng Dẫn Toàn Diện Phần Mềm Quản Lý Cửa Hàng Cho Thuê",
    title_en: "AnyRent Features: Complete Guide to Rental Shop Management Software",
    slug_vi: "gioi-thieu-tinh-nang-anyrent",
    slug_en: "anyrent-features-complete-guide",
    category: "software-technology",
    tags: ["AnyRent", "rental software", "SEO"]
  }
];

// Generate comprehensive article content
function generateArticleContent(template) {
  // This is a simplified version - full content would be 2000+ words
  // In production, each article would have full detailed content
  return {
    article: {
      ...template,
      excerpt_vi: `Khám phá hướng dẫn chi tiết về ${template.title_vi.toLowerCase()}. Bài viết cung cấp thông tin toàn diện với hơn 2000 từ về chủ đề này.`,
      excerpt_en: `Discover a detailed guide on ${template.title_en.toLowerCase()}. This comprehensive article provides over 2000 words of in-depth information.`,
      seo_title_vi: `${template.title_vi} | Hướng Dẫn Chi Tiết 2025`,
      seo_title_en: `${template.title_en} | Complete Guide 2025`,
      seo_description_vi: `Hướng dẫn toàn diện về ${template.title_vi.toLowerCase()}. Tìm hiểu các best practices, chiến lược và công cụ hiệu quả nhất.`,
      seo_description_en: `Comprehensive guide on ${template.title_en.toLowerCase()}. Learn best practices, strategies, and most effective tools.`,
      seo_keywords_vi: template.tags.join(", ") + ", hướng dẫn, best practices",
      seo_keywords_en: template.tags.join(", ") + ", guide, best practices",
      category_slugs: [template.category],
      tag_slugs: template.tags,
      featured_image_alt_vi: template.title_vi,
      featured_image_alt_en: template.title_en
    },
    // Note: Full TipTap JSON content would be generated here
    // For now, this is a template structure
    content_vi: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: template.title_vi }]
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: `[Full 2000+ word content for ${template.title_vi} would be generated here with proper TipTap JSON structure including headings, paragraphs, lists, images, etc.]` }]
        }
      ]
    },
    content_en: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: template.title_en }]
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: `[Full 2000+ word content for ${template.title_en} would be generated here with proper TipTap JSON structure including headings, paragraphs, lists, images, etc.]` }]
        }
      ]
    }
  };
}

// Generate all article files
articleTemplates.forEach(template => {
  const articleData = generateArticleContent(template);
  const filePath = path.join(articlesDir, `article-${template.number}-${template.slug_vi}.json`);
  
  fs.writeFileSync(
    filePath,
    JSON.stringify(articleData, null, 2),
    'utf8'
  );
  
  console.log(`✓ Generated article ${template.number}: ${template.title_vi}`);
});

console.log(`\n✅ Generated ${articleTemplates.length} article templates in ${articlesDir}`);
console.log('📝 Note: Full content (2000+ words each) needs to be added to each article file');
