/**
 * Seed Audit Logs
 * 
 * This script creates sample audit logs to demonstrate the audit logging system.
 * Run this after setting up the audit logging system.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedAuditLogs() {
  console.log('🌱 Seeding audit logs...');

  try {
    // Get some existing users for context
    const users = await prisma.user.findMany({
      take: 5,
      include: {
        merchant: true,
        outlet: true
      }
    });

    if (users.length === 0) {
      console.log('❌ No users found. Please run the main seed script first.');
      return;
    }

    const admin = users.find(u => u.role === 'ADMIN') || users[0];
    const merchant = users.find(u => u.role === 'MERCHANT') || users[0];
    const outletAdmin = users.find(u => u.role === 'OUTLET_ADMIN') || users[0];

    // Sample audit logs
    const auditLogs = [
      // System events
      {
        action: 'LOGIN',
        entityType: 'User',
        entityId: admin.id,
        entityName: admin.email,
        userId: admin.id,
        userEmail: admin.email,
        userRole: admin.role,
        severity: 'INFO',
        category: 'SECURITY',
        description: `User logged in: ${admin.email}`,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: 'sess_' + Math.random().toString(36).substr(2, 9),
        requestId: 'req_' + Math.random().toString(36).substr(2, 9),
        metadata: JSON.stringify({
          method: 'POST',
          url: '/api/auth/login',
          timestamp: new Date().toISOString()
        }),
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        action: 'CREATE',
        entityType: 'User',
        entityId: 'new_user_123',
        entityName: 'john.doe@example.com',
        userId: admin.id,
        userEmail: admin.email,
        userRole: admin.role,
        merchantId: admin.merchantId,
        severity: 'INFO',
        category: 'BUSINESS',
        description: 'Created new user: john.doe@example.com with role OUTLET_STAFF',
        newValues: JSON.stringify({
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'OUTLET_STAFF',
          merchantId: admin.merchantId,
          outletId: admin.outletId
        }),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
      },
      {
        action: 'UPDATE',
        entityType: 'Product',
        entityId: 'product_456',
        entityName: 'High-End Camera',
        userId: outletAdmin.id,
        userEmail: outletAdmin.email,
        userRole: outletAdmin.role,
        merchantId: outletAdmin.merchantId,
        outletId: outletAdmin.outletId,
        severity: 'INFO',
        category: 'BUSINESS',
        description: 'Updated product: High-End Camera',
        oldValues: JSON.stringify({
          name: 'High-End Camera',
          price: 150.00,
          description: 'Professional camera for events'
        }),
        newValues: JSON.stringify({
          name: 'High-End Camera',
          price: 175.00,
          description: 'Professional camera for events - Updated pricing'
        }),
        changes: JSON.stringify({
          price: { old: 150.00, new: 175.00 },
          description: { 
            old: 'Professional camera for events', 
            new: 'Professional camera for events - Updated pricing' 
          }
        }),
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 45 * 60 * 1000) // 45 minutes ago
      },
      {
        action: 'CREATE',
        entityType: 'Order',
        entityId: 'order_789',
        entityName: 'ORD-001-0001',
        userId: outletAdmin.id,
        userEmail: outletAdmin.email,
        userRole: outletAdmin.role,
        merchantId: outletAdmin.merchantId,
        outletId: outletAdmin.outletId,
        severity: 'INFO',
        category: 'BUSINESS',
        description: 'Created RENT order: ORD-001-0001',
        newValues: JSON.stringify({
          orderNumber: 'ORD-001-0001',
          orderType: 'RENT',
          status: 'RESERVED',
          totalAmount: 175.00,
          customerId: 'customer_123',
          outletId: outletAdmin.outletId
        }),
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      },
      {
        action: 'UPDATE',
        entityType: 'Order',
        entityId: 'order_789',
        entityName: 'ORD-001-0001',
        userId: outletAdmin.id,
        userEmail: outletAdmin.email,
        userRole: outletAdmin.role,
        merchantId: outletAdmin.merchantId,
        outletId: outletAdmin.outletId,
        severity: 'INFO',
        category: 'BUSINESS',
        description: 'Changed order status from RESERVED to PICKUPED: ORD-001-0001',
        oldValues: JSON.stringify({ status: 'RESERVED' }),
        newValues: JSON.stringify({ status: 'PICKUPED' }),
        changes: JSON.stringify({
          status: { old: 'RESERVED', new: 'PICKUPED' }
        }),
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
      },
      {
        action: 'UPDATE',
        entityType: 'SystemSetting',
        entityId: 'setting_001',
        entityName: 'system.maintenance_mode',
        userId: admin.id,
        userEmail: admin.email,
        userRole: admin.role,
        severity: 'WARNING',
        category: 'SYSTEM',
        description: 'Updated system setting: system.maintenance_mode',
        oldValues: JSON.stringify({ value: 'false' }),
        newValues: JSON.stringify({ value: 'true' }),
        changes: JSON.stringify({
          value: { old: 'false', new: 'true' }
        }),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      },
      {
        action: 'LOGIN',
        entityType: 'User',
        entityId: merchant.id,
        entityName: merchant.email,
        userId: merchant.id,
        userEmail: merchant.email,
        userRole: merchant.role,
        merchantId: merchant.merchantId,
        severity: 'INFO',
        category: 'SECURITY',
        description: `User logged in: ${merchant.email}`,
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        sessionId: 'sess_' + Math.random().toString(36).substr(2, 9),
        requestId: 'req_' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      },
      {
        action: 'CUSTOM',
        entityType: 'Security',
        entityId: 'security_001',
        entityName: 'Failed Login Attempt',
        userId: null,
        userEmail: 'unknown@example.com',
        userRole: null,
        severity: 'WARNING',
        category: 'SECURITY',
        description: 'Security event: Failed login attempt for unknown@example.com',
        newValues: JSON.stringify({
          event: 'failed_login',
          email: 'unknown@example.com',
          attempts: 3,
          timestamp: new Date().toISOString()
        }),
        ipAddress: '192.168.1.200',
        userAgent: 'Mozilla/5.0 (compatible; BadBot/1.0)',
        createdAt: new Date(Date.now() - 3 * 60 * 1000) // 3 minutes ago
      },
      {
        action: 'EXPORT',
        entityType: 'Data',
        entityId: 'export_001',
        entityName: 'Customer export',
        userId: merchant.id,
        userEmail: merchant.email,
        userRole: merchant.role,
        merchantId: merchant.merchantId,
        severity: 'INFO',
        category: 'BUSINESS',
        description: 'Exported 150 Customer records',
        newValues: JSON.stringify({
          exportType: 'Customer',
          recordCount: 150,
          timestamp: new Date().toISOString()
        }),
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
      },
      {
        action: 'LOGOUT',
        entityType: 'User',
        entityId: admin.id,
        entityName: admin.email,
        userId: admin.id,
        userEmail: admin.email,
        userRole: admin.role,
        severity: 'INFO',
        category: 'SECURITY',
        description: `User logged out: ${admin.email}`,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 1 * 60 * 1000) // 1 minute ago
      }
    ];

    // Create audit logs with proper publicId
    let publicIdCounter = 1;
    for (const logData of auditLogs) {
      await prisma.auditLog.create({
        data: {
          publicId: publicIdCounter++,
          ...logData
        }
      });
    }

    console.log(`✅ Created ${auditLogs.length} audit log entries`);
    console.log('📊 Audit log summary:');
    console.log(`   - Login events: ${auditLogs.filter(l => l.action === 'LOGIN').length}`);
    console.log(`   - Business events: ${auditLogs.filter(l => l.category === 'BUSINESS').length}`);
    console.log(`   - Security events: ${auditLogs.filter(l => l.category === 'SECURITY').length}`);
    console.log(`   - System events: ${auditLogs.filter(l => l.category === 'SYSTEM').length}`);
    console.log(`   - Create actions: ${auditLogs.filter(l => l.action === 'CREATE').length}`);
    console.log(`   - Update actions: ${auditLogs.filter(l => l.action === 'UPDATE').length}`);

  } catch (error) {
    console.error('❌ Error seeding audit logs:', error);
    throw error;
  }
}

// Run the seed function
if (require.main === module) {
  seedAuditLogs()
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seedAuditLogs };
