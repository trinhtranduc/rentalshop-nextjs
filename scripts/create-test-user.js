const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // First, get or create a merchant
    let merchant = await prisma.merchant.findFirst();
    
    if (!merchant) {
      console.log('No merchant found. Creating a test merchant...');
      merchant = await prisma.merchant.create({
        data: {
          companyName: 'Test Rental Shop',
          businessLicense: 'TEST123',
          address: '123 Test Street',
          description: 'Test merchant for development',
          isVerified: true,
          isActive: true,
          userId: 'test-user-id'
        }
      });
      console.log('Created merchant:', merchant.id);
    }

    // Get or create an outlet
    let outlet = await prisma.outlet.findFirst({
      where: { merchantId: merchant.id }
    });
    if (!outlet) {
      console.log('No outlet found. Creating a test outlet...');
      outlet = await prisma.outlet.create({
        data: {
          name: 'Main Store',
          address: '123 Main Street',
          phone: '555-0123',
          merchantId: merchant.id,
          isActive: true
        }
      });
      console.log('Created outlet:', outlet.id);
    }

    // Check if test user exists
    let user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
      include: { merchant: true }
    });

    if (!user) {
      // Create test user
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      user = await prisma.user.create({
        data: {
          email: "test@example.com",
          password: hashedPassword,
          firstName: "Test",
          lastName: "User",
          role: "OUTLET_STAFF",
          isActive: true,
          merchant: {
            connect: {
              id: merchant.id
            }
          },
          outlet: {
            connect: {
              id: outlet.id
            }
          }
        },
        include: {
          merchant: true,
          outlet: true
        }
      });
      console.log('Created test user:', user.id);
    } else {
      console.log('Test user already exists:', user.id);
    }

    // Generate token
    const token = jwt.sign({
      userId: user.id,
      email: user.email,
      role: user.role
    }, 'local-jwt-secret-key-change-this', { expiresIn: '7d' });

    console.log('\n=== TEST CREDENTIALS ===');
    console.log('Email: test@example.com');
    console.log('Password: password123');
    console.log('Token:', token);
    console.log('=======================\n');

    return { user, token };
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser(); 