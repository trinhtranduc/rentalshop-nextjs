const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTestCustomers() {
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
          userId: 'test-user-id' // You might need to create a user first
        }
      });
      console.log('Created merchant:', merchant.id);
    }

    // Add test customers
    const testCustomers = [
      {
        firstName: 'John',
        lastName: 'Miller',
        email: 'john.miller@example.com',
        phone: '1234567890',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        merchantId: merchant.id,
        isActive: true
      },
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@example.com',
        phone: '0987654321',
        address: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        country: 'USA',
        merchantId: merchant.id,
        isActive: true
      },
      {
        firstName: 'Michael',
        lastName: 'Brown',
        email: 'michael.brown@example.com',
        phone: '5551234567',
        address: '789 Pine Rd',
        city: 'Chicago',
        state: 'IL',
        country: 'USA',
        merchantId: merchant.id,
        isActive: true
      },
      {
        firstName: 'Emily',
        lastName: 'Davis',
        email: 'emily.davis@example.com',
        phone: '4449876543',
        address: '321 Elm St',
        city: 'Houston',
        state: 'TX',
        country: 'USA',
        merchantId: merchant.id,
        isActive: true
      }
    ];

    console.log('Adding test customers...');
    
    for (const customerData of testCustomers) {
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          email: customerData.email,
          merchantId: merchant.id
        }
      });

      if (!existingCustomer) {
        const customer = await prisma.customer.create({
          data: customerData
        });
        console.log(`Created customer: ${customer.firstName} ${customer.lastName} (${customer.email})`);
      } else {
        console.log(`Customer already exists: ${existingCustomer.firstName} ${existingCustomer.lastName}`);
      }
    }

    console.log('Test customers added successfully!');
    
    // List all customers
    const allCustomers = await prisma.customer.findMany({
      where: { merchantId: merchant.id },
      include: { merchant: true }
    });
    
    console.log('\nAll customers in database:');
    allCustomers.forEach(customer => {
      console.log(`- ${customer.firstName} ${customer.lastName} (${customer.email}) - ${customer.phone}`);
    });

  } catch (error) {
    console.error('Error adding test customers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestCustomers(); 