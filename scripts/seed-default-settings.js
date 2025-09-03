/**
 * Seed Default Settings Script
 * 
 * This script creates default system settings, merchant settings, and user preferences
 * for the rental shop system.
 * 
 * Run with: node scripts/seed-default-settings.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Global counter for public IDs
let publicIdCounter = 10000; // Start from 10000 to avoid conflicts with other entities

// Helper function to get next public ID
function getNextPublicId() {
  return ++publicIdCounter;
}

// Default System Settings
const defaultSystemSettings = [
  // General Settings
  {
    key: 'site_name',
    value: 'Rental Shop System',
    type: 'string',
    category: 'general',
    description: 'The name of the rental shop system',
    isActive: true,
    isReadOnly: false
  },
  {
    key: 'site_description',
    value: 'Professional rental shop management system',
    type: 'string',
    category: 'general',
    description: 'Description of the rental shop system',
    isActive: true,
    isReadOnly: false
  },
  {
    key: 'default_language',
    value: 'en',
    type: 'string',
    category: 'general',
    description: 'Default language for the system',
    isActive: true,
    isReadOnly: false
  },
  {
    key: 'timezone',
    value: 'UTC',
    type: 'string',
    category: 'general',
    description: 'Default timezone for the system',
    isActive: true,
    isReadOnly: false
  },
  {
    key: 'date_format',
    value: 'MM/DD/YYYY',
    type: 'string',
    category: 'general',
    description: 'Default date format',
    isActive: true,
    isReadOnly: false
  },
  {
    key: 'currency',
    value: 'USD',
    type: 'string',
    category: 'general',
    description: 'Default currency',
    isActive: true,
    isReadOnly: false
  },

  // Security Settings
  {
    key: 'session_timeout',
    value: '3600',
    type: 'number',
    category: 'security',
    description: 'Session timeout in seconds (1 hour)',
    isActive: true,
    isReadOnly: false
  },
  {
    key: 'max_login_attempts',
    value: '5',
    type: 'number',
    category: 'security',
    description: 'Maximum login attempts before lockout',
    isActive: true,
    isReadOnly: false
  },
  {
    key: 'password_min_length',
    value: '8',
    type: 'number',
    category: 'security',
    description: 'Minimum password length',
    isActive: true,
    isReadOnly: false
  },
  {
    key: 'require_two_factor',
    value: 'false',
    type: 'boolean',
    category: 'security',
    description: 'Require two-factor authentication',
    isActive: true,
    isReadOnly: false
  },
  {
    key: 'allow_registration',
    value: 'true',
    type: 'boolean',
    category: 'security',
    description: 'Allow new user registration',
    isActive: true,
    isReadOnly: false
  },

  // Email Settings
  {
    key: 'smtp_host',
    value: 'smtp.gmail.com',
    type: 'string',
    category: 'email',
    description: 'SMTP server host',
    isActive: true,
    isReadOnly: false
  },
  {
    key: 'smtp_port',
    value: '587',
    type: 'number',
    category: 'email',
    description: 'SMTP server port',
    isActive: true,
    isReadOnly: false
  },
  {
    key: 'smtp_username',
    value: '',
    type: 'string',
    category: 'email',
    description: 'SMTP username',
    isActive: true,
    isReadOnly: false
  },
  {
    key: 'smtp_password',
    value: '',
    type: 'string',
    category: 'email',
    description: 'SMTP password',
    isActive: true,
    isReadOnly: false
  },
  {
    key: 'from_email',
    value: 'noreply@rentalshop.com',
    type: 'string',
    category: 'email',
    description: 'Default from email address',
    isActive: true,
    isReadOnly: false
  },
  {
    key: 'from_name',
    value: 'Rental Shop System',
    type: 'string',
    category: 'email',
    description: 'Default from name',
    isActive: true,
    isReadOnly: false
  },

  // Notification Settings
  {
    key: 'email_notifications',
    value: 'true',
    type: 'boolean',
    category: 'notifications',
    description: 'Enable email notifications',
    isActive: true,
    isReadOnly: false
  },
  {
    key: 'system_alerts',
    value: 'true',
    type: 'boolean',
    category: 'notifications',
    description: 'Enable system alerts',
    isActive: true,
    isReadOnly: false
  },
  {
    key: 'maintenance_mode',
    value: 'false',
    type: 'boolean',
    category: 'notifications',
    description: 'Enable maintenance mode',
    isActive: true,
    isReadOnly: false
  },

  // System Settings
  {
    key: 'max_file_size',
    value: '10485760',
    type: 'number',
    category: 'system',
    description: 'Maximum file upload size in bytes (10MB)',
    isActive: true,
    isReadOnly: false
  },
  {
    key: 'allowed_file_types',
    value: '["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx"]',
    type: 'json',
    category: 'system',
    description: 'Allowed file types for uploads',
    isActive: true,
    isReadOnly: false
  },
  {
    key: 'backup_frequency',
    value: 'daily',
    type: 'string',
    category: 'system',
    description: 'Database backup frequency',
    isActive: true,
    isReadOnly: false
  },
  {
    key: 'log_retention_days',
    value: '30',
    type: 'number',
    category: 'system',
    description: 'Log retention period in days',
    isActive: true,
    isReadOnly: false
  }
];

// Default Merchant Settings
const defaultMerchantSettings = [
  // General Settings
  {
    key: 'business_name',
    value: '',
    type: 'string',
    category: 'general',
    description: 'Business name for the merchant'
  },
  {
    key: 'business_address',
    value: '',
    type: 'string',
    category: 'general',
    description: 'Business address'
  },
  {
    key: 'business_phone',
    value: '',
    type: 'string',
    category: 'general',
    description: 'Business phone number'
  },
  {
    key: 'business_email',
    value: '',
    type: 'string',
    category: 'general',
    description: 'Business email address'
  },
  {
    key: 'business_website',
    value: '',
    type: 'string',
    category: 'general',
    description: 'Business website URL'
  },

  // Business Settings
  {
    key: 'default_rental_duration',
    value: '7',
    type: 'number',
    category: 'business',
    description: 'Default rental duration in days'
  },
  {
    key: 'late_fee_per_day',
    value: '10.00',
    type: 'number',
    category: 'business',
    description: 'Late fee per day in currency'
  },
  {
    key: 'damage_deposit_percentage',
    value: '20',
    type: 'number',
    category: 'business',
    description: 'Damage deposit as percentage of rental price'
  },
  {
    key: 'auto_approve_orders',
    value: 'false',
    type: 'boolean',
    category: 'business',
    description: 'Automatically approve new orders'
  },
  {
    key: 'require_customer_verification',
    value: 'true',
    type: 'boolean',
    category: 'business',
    description: 'Require customer ID verification'
  },

  // Notification Settings
  {
    key: 'notify_new_orders',
    value: 'true',
    type: 'boolean',
    category: 'notifications',
    description: 'Notify on new orders'
  },
  {
    key: 'notify_overdue_returns',
    value: 'true',
    type: 'boolean',
    category: 'notifications',
    description: 'Notify on overdue returns'
  },
  {
    key: 'notify_low_stock',
    value: 'true',
    type: 'boolean',
    category: 'notifications',
    description: 'Notify on low stock levels'
  },
  {
    key: 'notify_payment_issues',
    value: 'true',
    type: 'boolean',
    category: 'notifications',
    description: 'Notify on payment issues'
  },

  // Integration Settings
  {
    key: 'enable_api_access',
    value: 'false',
    type: 'boolean',
    category: 'integrations',
    description: 'Enable API access for integrations'
  },
  {
    key: 'webhook_url',
    value: '',
    type: 'string',
    category: 'integrations',
    description: 'Webhook URL for external integrations'
  },
  {
    key: 'payment_gateway',
    value: 'stripe',
    type: 'string',
    category: 'integrations',
    description: 'Payment gateway provider'
  }
];

// Default User Preferences
const defaultUserPreferences = [
  // General Settings
  {
    key: 'theme',
    value: 'light',
    type: 'string',
    category: 'ui',
    description: 'User interface theme preference'
  },
  {
    key: 'language',
    value: 'en',
    type: 'string',
    category: 'ui',
    description: 'User language preference'
  },
  {
    key: 'timezone',
    value: 'UTC',
    type: 'string',
    category: 'ui',
    description: 'User timezone preference'
  },
  {
    key: 'date_format',
    value: 'MM/DD/YYYY',
    type: 'string',
    category: 'ui',
    description: 'User date format preference'
  },
  {
    key: 'items_per_page',
    value: '20',
    type: 'number',
    category: 'ui',
    description: 'Number of items per page in lists'
  },

  // UI Settings
  {
    key: 'sidebar_collapsed',
    value: 'false',
    type: 'boolean',
    category: 'ui',
    description: 'Whether sidebar is collapsed'
  },
  {
    key: 'compact_mode',
    value: 'false',
    type: 'boolean',
    category: 'ui',
    description: 'Use compact mode for tables and lists'
  },
  {
    key: 'show_tooltips',
    value: 'true',
    type: 'boolean',
    category: 'ui',
    description: 'Show tooltips in the interface'
  },

  // Notification Settings
  {
    key: 'email_notifications',
    value: 'true',
    type: 'boolean',
    category: 'notifications',
    description: 'Receive email notifications'
  },
  {
    key: 'push_notifications',
    value: 'true',
    type: 'boolean',
    category: 'notifications',
    description: 'Receive push notifications'
  },
  {
    key: 'notify_new_orders',
    value: 'true',
    type: 'boolean',
    category: 'notifications',
    description: 'Notify on new orders'
  },
  {
    key: 'notify_system_updates',
    value: 'true',
    type: 'boolean',
    category: 'notifications',
    description: 'Notify on system updates'
  },

  // Privacy Settings
  {
    key: 'profile_visibility',
    value: 'private',
    type: 'string',
    category: 'privacy',
    description: 'Profile visibility setting'
  },
  {
    key: 'activity_tracking',
    value: 'true',
    type: 'boolean',
    category: 'privacy',
    description: 'Allow activity tracking'
  },
  {
    key: 'data_sharing',
    value: 'false',
    type: 'boolean',
    category: 'privacy',
    description: 'Allow data sharing for analytics'
  }
];

// Step 1: Create system settings
async function createSystemSettings() {
  console.log('\n🔧 Creating system settings...');
  
  const settings = [];
  
  for (const settingData of defaultSystemSettings) {
    const setting = await prisma.systemSetting.create({
      data: {
        publicId: getNextPublicId(),
        key: settingData.key,
        value: settingData.value,
        type: settingData.type,
        category: settingData.category,
        description: settingData.description,
        isActive: settingData.isActive,
        isReadOnly: settingData.isReadOnly
      }
    });
    
    console.log(`✅ Created system setting: ${setting.key}`);
    settings.push(setting);
  }
  
  return settings;
}

// Step 2: Create default merchant settings for all merchants
async function createMerchantSettings() {
  console.log('\n🏢 Creating default merchant settings...');
  
  const merchants = await prisma.merchant.findMany();
  const settings = [];
  
  for (const merchant of merchants) {
    console.log(`\n📋 Creating settings for ${merchant.name}...`);
    
    for (const settingData of defaultMerchantSettings) {
      const setting = await prisma.merchantSetting.create({
        data: {
          publicId: getNextPublicId(),
          merchantId: merchant.id,
          key: settingData.key,
          value: settingData.value,
          type: settingData.type,
          category: settingData.category,
          description: settingData.description,
          isActive: true
        }
      });
      
      console.log(`  ✅ Created merchant setting: ${setting.key}`);
      settings.push(setting);
    }
  }
  
  return settings;
}

// Step 3: Create default user preferences for all users
async function createUserPreferences() {
  console.log('\n👤 Creating default user preferences...');
  
  const users = await prisma.user.findMany();
  const preferences = [];
  
  for (const user of users) {
    console.log(`\n👤 Creating preferences for ${user.email}...`);
    
    for (const preferenceData of defaultUserPreferences) {
      const preference = await prisma.userPreference.create({
        data: {
          publicId: getNextPublicId(),
          userId: user.id,
          key: preferenceData.key,
          value: preferenceData.value,
          type: preferenceData.type,
          category: preferenceData.category,
          description: preferenceData.description,
          isActive: true
        }
      });
      
      console.log(`  ✅ Created user preference: ${preference.key}`);
      preferences.push(preference);
    }
  }
  
  return preferences;
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting Default Settings Seeding Process...\n');
    
    // Step 1: Create system settings
    const systemSettings = await createSystemSettings();
    
    // Step 2: Create merchant settings
    const merchantSettings = await createMerchantSettings();
    
    // Step 3: Create user preferences
    const userPreferences = await createUserPreferences();
    
    console.log('\n🎉 Default settings seeding completed successfully!');
    console.log('\n📊 Final Summary:');
    console.log(`  ✅ ${systemSettings.length} system settings created`);
    console.log(`  ✅ ${merchantSettings.length} merchant settings created`);
    console.log(`  ✅ ${userPreferences.length} user preferences created`);
    
    console.log('\n🔧 System Settings Categories:');
    const systemCategories = [...new Set(systemSettings.map(s => s.category))];
    systemCategories.forEach(category => {
      const count = systemSettings.filter(s => s.category === category).length;
      console.log(`  • ${category}: ${count} settings`);
    });
    
    console.log('\n🏢 Merchant Settings Categories:');
    const merchantCategories = [...new Set(merchantSettings.map(s => s.category))];
    merchantCategories.forEach(category => {
      const count = merchantSettings.filter(s => s.category === category).length;
      console.log(`  • ${category}: ${count} settings`);
    });
    
    console.log('\n👤 User Preferences Categories:');
    const userCategories = [...new Set(userPreferences.map(p => p.category))];
    userCategories.forEach(category => {
      const count = userPreferences.filter(p => p.category === category).length;
      console.log(`  • ${category}: ${count} preferences`);
    });
    
  } catch (error) {
    console.error('❌ Fatal error during settings seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { 
  createSystemSettings, 
  createMerchantSettings, 
  createUserPreferences 
};
