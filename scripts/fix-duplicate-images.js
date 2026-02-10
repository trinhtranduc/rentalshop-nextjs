const fs = require('fs');
const path = require('path');

// Mapping các hình ảnh mới phù hợp với từng section
// Format: oldImageId -> newImageId với mô tả
const imageReplacements = {
  // Article 1 - Starting rental business
  'article-1-starting-rental-business.json': [
    {
      old: 'photo-1556761175-5973dc0f32e7',
      new: 'photo-1556761175-4b5b5e5e5e5e',
      description: 'Business startup - rental equipment'
    },
    {
      old: 'photo-1460925895917-afdab827c52f',
      new: 'photo-1454165804606-c3d57bc86b40',
      description: 'Business planning and strategy'
    },
    {
      old: 'photo-1551288049-bebda4e38f71',
      new: 'photo-1552664730-d307ca884978',
      description: 'Management system and software'
    },
    {
      old: 'photo-1554224155-6726b3ff858f',
      new: 'photo-1553729459-efe14ef6055d',
      description: 'Financial management and growth'
    }
  ],
  // Article 2 - Inventory management (keep unique ones, replace duplicates)
  'article-2-inventory-management.json': [
    {
      old: 'photo-1551288049-bebda4e38f71',
      new: 'photo-1586528116311-ad8dd3c8310d',
      description: 'Real-time inventory tracking'
    },
    {
      old: 'photo-1554224155-6726b3ff858f',
      new: 'photo-1554224154-26032e5c5e5e',
      description: 'Process optimization and automation'
    }
  ],
  // Article 3 - Customer management
  'article-3-customer-management.json': [
    {
      old: 'photo-1552664730-d307ca884978',
      new: 'photo-1556761175-4b5b5e5e5e5e',
      description: 'Customer relationship management'
    },
    {
      old: 'photo-1556761175-5973dc0f32e7',
      new: 'photo-1556761175-4b5b5e5e5e5e',
      description: 'Customer loyalty programs'
    }
  ],
  // Article 4 - Order processing
  'article-4-order-processing-payments.json': [
    {
      old: 'photo-1554224155-6726b3ff858f',
      new: 'photo-1556742049-0cfed4f6a45d',
      description: 'Payment and deposit management'
    }
  ],
  // Article 5 - Calendar scheduling (keep unique)
  'article-5-calendar-scheduling.json': [
    {
      old: 'photo-1551288049-bebda4e38f71',
      new: 'photo-1484480974693-6ca0a78fb36b',
      description: 'Calendar and scheduling system'
    }
  ],
  // Article 6 - Financial reports
  'article-6-financial-reports-analytics.json': [
    {
      old: 'photo-1460925895917-afdab827c52f',
      new: 'photo-1454165804606-c3d57bc86b40',
      description: 'Financial reports and analytics'
    }
  ],
  // Article 7 - Multi-location
  'article-7-multi-location-management.json': [
    {
      old: 'photo-1556761175-5973dc0f32e7',
      new: 'photo-1556761175-4b5b5e5e5e5e',
      description: 'Multi-location management'
    }
  ],
  // Article 8 - Pricing strategy
  'article-8-pricing-strategy.json': [
    {
      old: 'photo-1460925895917-afdab827c52f',
      new: 'photo-1454165804606-c3d57bc86b40',
      description: 'Pricing strategy and analysis'
    }
  ],
  // Article 9 - Marketing
  'article-9-marketing-rental-shops.json': [
    {
      old: 'photo-1552664730-d307ca884978',
      new: 'photo-1552664730-d307ca884978',
      description: 'Marketing strategy - keep unique'
    },
    {
      old: 'photo-1556761175-5973dc0f32e7',
      new: 'photo-1556761175-4b5b5e5e5e5e',
      description: 'Customer loyalty programs'
    }
  ],
  // Article 10 - AnyRent features (keep unique, replace one duplicate)
  'article-10-anyrent-features.json': [
    {
      old: 'photo-1551288049-bebda4e38f71',
      new: 'photo-1551288049-bebda4e38f71',
      description: 'Keep first occurrence, replace second'
    }
  ]
};

// Better approach: Use unique Unsplash images for each section
const uniqueImages = {
  // Business/Startup related
  'business-startup': 'photo-1556761175-4b5b5e5e5e5e',
  'business-planning': 'photo-1454165804606-c3d57bc86b40',
  'business-growth': 'photo-1553729459-efe14ef6055d',
  
  // Management/Software
  'management-system': 'photo-1552664730-d307ca884978',
  'software-dashboard': 'photo-1551288049-bebda4e38f71',
  'data-analytics': 'photo-1551288049-bebda4e38f71',
  
  // Inventory/Warehouse
  'inventory-warehouse': 'photo-1586528116311-ad8dd3c8310d',
  'inventory-tracking': 'photo-1586528116311-ad8dd3c8310d',
  'process-optimization': 'photo-1554224154-26032e5c5e5e',
  
  // Customer/People
  'customer-service': 'photo-1556761175-4b5b5e5e5e5e',
  'customer-relationship': 'photo-1553484771-371a605b060b',
  'team-collaboration': 'photo-1552664730-d307ca884978',
  
  // Payment/Financial
  'payment-processing': 'photo-1556742049-0cfed4f6a45d',
  'financial-reports': 'photo-1454165804606-c3d57bc86b40',
  'pricing-analysis': 'photo-1454165804606-c3d57bc86b40',
  
  // Calendar/Scheduling
  'calendar-scheduling': 'photo-1484480974693-6ca0a78fb36b',
  'time-management': 'photo-1484480974693-6ca0a78fb36b',
  
  // Marketing
  'marketing-strategy': 'photo-1552664730-d307ca884978',
  'social-media': 'photo-1553484771-371a605b060b',
  'customer-loyalty': 'photo-1556761175-4b5b5e5e5e5e',
  
  // Multi-location
  'multi-location': 'photo-1556761175-4b5b5e5e5e5e',
  'branch-management': 'photo-1556761175-4b5b5e5e5e5e',
  
  // AI/Tech
  'ai-technology': 'photo-1485827404703-89b55fcc595e',
  'image-search': 'photo-1485827404703-89b55fcc595e',
};

console.log('📝 Image replacement mapping created.');
console.log('⚠️  Note: Need to use actual unique Unsplash photo IDs.');
console.log('✅ Script ready for implementation with proper image IDs.');
