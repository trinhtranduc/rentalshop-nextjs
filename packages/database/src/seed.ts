import { prisma } from './client';

/**
 * Seed data for the rental shop application
 * Following DRY principles with centralized seeding
 */

const categories = [
  { name: 'Electronics', description: 'Electronic devices and gadgets' },
  { name: 'Tools', description: 'Hand and power tools' },
  { name: 'Party Equipment', description: 'Party and event equipment' },
  { name: 'Sports Equipment', description: 'Sports and fitness equipment' },
  { name: 'Furniture', description: 'Furniture and home items' },
  { name: 'Vehicles', description: 'Cars, bikes, and other vehicles' },
];

const outlets = [
  {
    name: 'Downtown Rental Center',
    address: '123 Main Street, Downtown',
    description: 'Main rental center in downtown area',
    phone: '+1234567890',
    email: 'downtown@rentalshop.com',
  },
  {
    name: 'Westside Equipment',
    address: '456 West Avenue, Westside',
    description: 'Specialized in tools and equipment',
    phone: '+1234567891',
    email: 'westside@rentalshop.com',
  },
  {
    name: 'Party Palace',
    address: '789 Party Lane, Eastside',
    description: 'Party and event equipment rental',
    phone: '+1234567892',
    email: 'party@rentalshop.com',
  },
];

const users = [
  // Admin users
  {
    email: 'admin@rentalshop.com',
    password: '$2b$10$example.hash',
    name: 'Admin User',
    role: 'ADMIN',
    phone: '+1234567890',
  },
  {
    email: 'superadmin@rentalshop.com',
    password: '$2b$10$example.hash',
    name: 'Super Admin',
    role: 'ADMIN',
    phone: '+1234567891',
  },
  
  // Merchant users
  {
    email: 'merchant@rentalshop.com',
    password: '$2b$10$example.hash',
    name: 'John Merchant',
    role: 'MERCHANT',
    phone: '+1234567892',
  },
  {
    email: 'merchant2@rentalshop.com',
    password: '$2b$10$example.hash',
    name: 'Sarah Business',
    role: 'MERCHANT',
    phone: '+1234567893',
  },
  
  // Staff users
  {
    email: 'staff1@rentalshop.com',
    password: '$2b$10$example.hash',
    name: 'Mike Staff',
    role: 'OUTLET_STAFF',
    phone: '+1234567894',
  },
  {
    email: 'staff2@rentalshop.com',
    password: '$2b$10$example.hash',
    name: 'Lisa Assistant',
    role: 'OUTLET_STAFF',
    phone: '+1234567895',
  },
  
  // Client users
  {
    email: 'client@example.com',
    password: '$2b$10$example.hash',
    name: 'John Client',
    role: 'CLIENT',
    phone: '+1234567896',
  },
  {
    email: 'alice@example.com',
    password: '$2b$10$example.hash',
    name: 'Alice Johnson',
    role: 'CLIENT',
    phone: '+1234567897',
  },
  {
    email: 'bob@example.com',
    password: '$2b$10$example.hash',
    name: 'Bob Smith',
    role: 'CLIENT',
    phone: '+1234567898',
  },
  {
    email: 'emma@example.com',
    password: '$2b$10$example.hash',
    name: 'Emma Wilson',
    role: 'CLIENT',
    phone: '+1234567899',
  },
  {
    email: 'david@example.com',
    password: '$2b$10$example.hash',
    name: 'David Brown',
    role: 'CLIENT',
    phone: '+1234567900',
  },
];

const customers = [
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567001',
    address: '123 Main Street',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'USA',
    dateOfBirth: '1990-05-15',
    idNumber: 'ID123456789',
    idType: 'DRIVERS_LICENSE',
    notes: 'Regular customer, prefers electronics',
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '+1234567002',
    address: '456 Oak Avenue',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90210',
    country: 'USA',
    dateOfBirth: '1985-08-22',
    idNumber: 'ID987654321',
    idType: 'PASSPORT',
    notes: 'Party equipment specialist',
  },
  {
    firstName: 'Michael',
    lastName: 'Johnson',
    email: 'michael.johnson@example.com',
    phone: '+1234567003',
    address: '789 Pine Street',
    city: 'Chicago',
    state: 'IL',
    zipCode: '60601',
    country: 'USA',
    dateOfBirth: '1988-12-10',
    idNumber: 'ID456789123',
    idType: 'DRIVERS_LICENSE',
    notes: 'Tools and equipment customer',
  },
  {
    firstName: 'Sarah',
    lastName: 'Williams',
    email: 'sarah.williams@example.com',
    phone: '+1234567004',
    address: '321 Elm Street',
    city: 'Houston',
    state: 'TX',
    zipCode: '77001',
    country: 'USA',
    dateOfBirth: '1992-03-18',
    idNumber: 'ID789123456',
    idType: 'PASSPORT',
    notes: 'Sports equipment enthusiast',
  },
  {
    firstName: 'Robert',
    lastName: 'Brown',
    email: 'robert.brown@example.com',
    phone: '+1234567005',
    address: '654 Maple Drive',
    city: 'Phoenix',
    state: 'AZ',
    zipCode: '85001',
    country: 'USA',
    dateOfBirth: '1987-07-25',
    idNumber: 'ID321654987',
    idType: 'DRIVERS_LICENSE',
    notes: 'Furniture rental customer',
  },
  {
    firstName: 'Emily',
    lastName: 'Davis',
    email: 'emily.davis@example.com',
    phone: '+1234567006',
    address: '987 Cedar Lane',
    city: 'Philadelphia',
    state: 'PA',
    zipCode: '19101',
    country: 'USA',
    dateOfBirth: '1995-11-30',
    idNumber: 'ID147258369',
    idType: 'PASSPORT',
    notes: 'Event planning specialist',
  },
  {
    firstName: 'Christopher',
    lastName: 'Miller',
    email: 'christopher.miller@example.com',
    phone: '+1234567007',
    address: '147 Birch Road',
    city: 'San Antonio',
    state: 'TX',
    zipCode: '78201',
    country: 'USA',
    dateOfBirth: '1983-09-14',
    idNumber: 'ID963852741',
    idType: 'DRIVERS_LICENSE',
    notes: 'Construction tools customer',
  },
  {
    firstName: 'Amanda',
    lastName: 'Wilson',
    email: 'amanda.wilson@example.com',
    phone: '+1234567008',
    address: '258 Spruce Street',
    city: 'San Diego',
    state: 'CA',
    zipCode: '92101',
    country: 'USA',
    dateOfBirth: '1991-01-08',
    idNumber: 'ID852963741',
    idType: 'PASSPORT',
    notes: 'Beach equipment rentals',
  },
  {
    firstName: 'Daniel',
    lastName: 'Taylor',
    email: 'daniel.taylor@example.com',
    phone: '+1234567009',
    address: '369 Willow Avenue',
    city: 'Dallas',
    state: 'TX',
    zipCode: '75201',
    country: 'USA',
    dateOfBirth: '1989-04-12',
    idNumber: 'ID741852963',
    idType: 'DRIVERS_LICENSE',
    notes: 'Office equipment rentals',
  },
  {
    firstName: 'Jessica',
    lastName: 'Anderson',
    email: 'jessica.anderson@example.com',
    phone: '+1234567010',
    address: '741 Poplar Street',
    city: 'San Jose',
    state: 'CA',
    zipCode: '95101',
    country: 'USA',
    dateOfBirth: '1993-06-20',
    idNumber: 'ID369258147',
    idType: 'PASSPORT',
    notes: 'Tech equipment specialist',
  },
  {
    firstName: 'Matthew',
    lastName: 'Thomas',
    email: 'matthew.thomas@example.com',
    phone: '+1234567011',
    address: '852 Ash Lane',
    city: 'Austin',
    state: 'TX',
    zipCode: '73301',
    country: 'USA',
    dateOfBirth: '1986-02-28',
    idNumber: 'ID258147369',
    idType: 'DRIVERS_LICENSE',
    notes: 'Music equipment rentals',
  },
  {
    firstName: 'Ashley',
    lastName: 'Jackson',
    email: 'ashley.jackson@example.com',
    phone: '+1234567012',
    address: '963 Hickory Drive',
    city: 'Jacksonville',
    state: 'FL',
    zipCode: '32099',
    country: 'USA',
    dateOfBirth: '1994-10-05',
    idNumber: 'ID147369258',
    idType: 'PASSPORT',
    notes: 'Outdoor equipment customer',
  },
  {
    firstName: 'Joshua',
    lastName: 'White',
    email: 'joshua.white@example.com',
    phone: '+1234567013',
    address: '159 Sycamore Street',
    city: 'Fort Worth',
    state: 'TX',
    zipCode: '76101',
    country: 'USA',
    dateOfBirth: '1984-12-16',
    idNumber: 'ID963147258',
    idType: 'DRIVERS_LICENSE',
    notes: 'Heavy machinery rentals',
  },
  {
    firstName: 'Nicole',
    lastName: 'Harris',
    email: 'nicole.harris@example.com',
    phone: '+1234567014',
    address: '357 Magnolia Avenue',
    city: 'Columbus',
    state: 'OH',
    zipCode: '43201',
    country: 'USA',
    dateOfBirth: '1990-08-03',
    idNumber: 'ID258963147',
    idType: 'PASSPORT',
    notes: 'Wedding equipment specialist',
  },
  {
    firstName: 'Kevin',
    lastName: 'Clark',
    email: 'kevin.clark@example.com',
    phone: '+1234567015',
    address: '486 Cypress Lane',
    city: 'Charlotte',
    state: 'NC',
    zipCode: '28201',
    country: 'USA',
    dateOfBirth: '1988-05-19',
    idNumber: 'ID147258963',
    idType: 'DRIVERS_LICENSE',
    notes: 'Garden equipment customer',
  },
];

const products = [
  // Electronics
  {
    name: 'iPhone 15 Pro',
    description: 'Latest iPhone for rent, perfect for events or temporary use',
    stock: 10,
    rentPrice: 25.00,
    salePrice: 999.00,
    deposit: 200.00,
    images: ['https://example.com/iphone15-1.jpg', 'https://example.com/iphone15-2.jpg'],
    categoryName: 'Electronics',
    outletName: 'Downtown Rental Center',
  },
  {
    name: 'MacBook Pro 16"',
    description: 'High-performance laptop for business or creative work',
    stock: 5,
    rentPrice: 50.00,
    salePrice: 2499.00,
    deposit: 500.00,
    images: ['https://example.com/macbook-1.jpg', 'https://example.com/macbook-2.jpg'],
    categoryName: 'Electronics',
    outletName: 'Downtown Rental Center',
  },
  {
    name: 'DJ Equipment Set',
    description: 'Complete DJ setup with speakers, mixer, and lighting',
    stock: 3,
    rentPrice: 150.00,
    salePrice: 3000.00,
    deposit: 300.00,
    images: ['https://example.com/dj-set-1.jpg', 'https://example.com/dj-set-2.jpg'],
    categoryName: 'Electronics',
    outletName: 'Party Palace',
  },

  // Tools
  {
    name: 'Power Drill Set',
    description: 'Professional power drill with various attachments',
    stock: 15,
    rentPrice: 15.00,
    salePrice: 299.00,
    deposit: 50.00,
    images: ['https://example.com/drill-1.jpg', 'https://example.com/drill-2.jpg'],
    categoryName: 'Tools',
    outletName: 'Westside Equipment',
  },
  {
    name: 'Circular Saw',
    description: 'Heavy-duty circular saw for woodworking projects',
    stock: 8,
    rentPrice: 20.00,
    salePrice: 199.00,
    deposit: 75.00,
    images: ['https://example.com/saw-1.jpg', 'https://example.com/saw-2.jpg'],
    categoryName: 'Tools',
    outletName: 'Westside Equipment',
  },
  {
    name: 'Ladder Set',
    description: 'Various sizes of ladders for different projects',
    stock: 12,
    rentPrice: 12.00,
    salePrice: 150.00,
    deposit: 30.00,
    images: ['https://example.com/ladder-1.jpg', 'https://example.com/ladder-2.jpg'],
    categoryName: 'Tools',
    outletName: 'Westside Equipment',
  },

  // Party Equipment
  {
    name: 'Wedding Tent',
    description: 'Large wedding tent with side walls and flooring',
    stock: 4,
    rentPrice: 200.00,
    salePrice: 2500.00,
    deposit: 400.00,
    images: ['https://example.com/tent-1.jpg', 'https://example.com/tent-2.jpg'],
    categoryName: 'Party Equipment',
    outletName: 'Party Palace',
  },
  {
    name: 'Tables and Chairs Set',
    description: 'Complete set for 50 people with tables and chairs',
    stock: 6,
    rentPrice: 75.00,
    salePrice: 800.00,
    deposit: 150.00,
    images: ['https://example.com/tables-1.jpg', 'https://example.com/tables-2.jpg'],
    categoryName: 'Party Equipment',
    outletName: 'Party Palace',
  },
  {
    name: 'Sound System',
    description: 'Professional sound system for events and parties',
    stock: 5,
    rentPrice: 100.00,
    salePrice: 1500.00,
    deposit: 200.00,
    images: ['https://example.com/sound-1.jpg', 'https://example.com/sound-2.jpg'],
    categoryName: 'Party Equipment',
    outletName: 'Party Palace',
  },

  // Sports Equipment
  {
    name: 'Mountain Bike',
    description: 'High-quality mountain bike for outdoor adventures',
    stock: 8,
    rentPrice: 30.00,
    salePrice: 800.00,
    deposit: 100.00,
    images: ['https://example.com/bike-1.jpg', 'https://example.com/bike-2.jpg'],
    categoryName: 'Sports Equipment',
    outletName: 'Downtown Rental Center',
  },
  {
    name: 'Tennis Equipment Set',
    description: 'Complete tennis set with rackets, balls, and net',
    stock: 10,
    rentPrice: 25.00,
    salePrice: 300.00,
    deposit: 50.00,
    images: ['https://example.com/tennis-1.jpg', 'https://example.com/tennis-2.jpg'],
    categoryName: 'Sports Equipment',
    outletName: 'Downtown Rental Center',
  },

  // Furniture
  {
    name: 'Office Furniture Set',
    description: 'Complete office setup with desk, chair, and filing cabinet',
    stock: 6,
    rentPrice: 40.00,
    salePrice: 600.00,
    deposit: 120.00,
    images: ['https://example.com/office-1.jpg', 'https://example.com/office-2.jpg'],
    categoryName: 'Furniture',
    outletName: 'Downtown Rental Center',
  },
  {
    name: 'Living Room Set',
    description: 'Comfortable living room furniture for temporary use',
    stock: 4,
    rentPrice: 60.00,
    salePrice: 1200.00,
    deposit: 200.00,
    images: ['https://example.com/living-1.jpg', 'https://example.com/living-2.jpg'],
    categoryName: 'Furniture',
    outletName: 'Downtown Rental Center',
  },
];

/**
 * Seed the database with initial data
 */
export async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Create categories
    console.log('Creating categories...');
    const createdCategories = await Promise.all(
      categories.map(async (category) => {
        return await prisma.category.upsert({
          where: { name: category.name },
          update: {},
          create: category,
        });
      })
    );
    console.log(`✅ Created ${createdCategories.length} categories`);

    // Create merchants first (required for outlets)
    console.log('Creating merchants...');
    const merchantUser = await prisma.user.upsert({
      where: { email: 'merchant@rentalshop.com' },
      update: {},
      create: {
        email: 'merchant@rentalshop.com',
        password: '$2b$10$example.hash', // In real app, use proper hashing
        name: 'John Merchant',
        role: 'MERCHANT',
        phone: '+1234567890',
      },
    });

    const merchant = await prisma.merchant.upsert({
      where: { userId: merchantUser.id },
      update: {},
      create: {
        userId: merchantUser.id,
        companyName: 'RentalShop Inc.',
        businessLicense: 'LIC123456',
        address: '123 Business Street, City',
        description: 'Leading rental company',
        isVerified: true,
      },
    });
    console.log('✅ Created merchant');

    // Create outlets
    console.log('Creating outlets...');
    const createdOutlets = await Promise.all(
      outlets.map(async (outlet, index) => {
        return await prisma.outlet.create({
          data: {
            ...outlet,
            merchantId: merchant.id,
          },
        });
      })
    );
    console.log(`✅ Created ${createdOutlets.length} outlets`);

    // Create products
    console.log('Creating products...');
    const createdProducts = await Promise.all(
      products.map(async (product) => {
        const category = createdCategories.find(c => c.name === product.categoryName);
        const outlet = createdOutlets.find(o => o.name === product.outletName);

        if (!category || !outlet) {
          throw new Error(`Category or outlet not found for product: ${product.name}`);
        }

        return await prisma.product.create({
          data: {
            name: product.name,
            description: product.description,
            stock: product.stock,
            renting: 0, // Initially no items are rented
            available: product.stock, // Initially all stock is available
            rentPrice: product.rentPrice,
            salePrice: product.salePrice,
            deposit: product.deposit,
            images: JSON.stringify(product.images),
            categoryId: category.id,
            outletId: outlet.id,
          },
        });
      })
    );
    console.log(`✅ Created ${createdProducts.length} products`);

    // Create users
    console.log('Creating users...');
    const createdUsers = await Promise.all(
      users.map(async (user) => {
        return await prisma.user.upsert({
          where: { email: user.email },
          update: {},
          create: user,
        });
      })
    );
    console.log(`✅ Created ${createdUsers.length} users`);

    // Create admin records for admin users
    console.log('Creating admin records...');
    const adminUsers = createdUsers.filter(user => user.role === 'ADMIN');
    const createdAdmins = await Promise.all(
      adminUsers.map(async (user) => {
        return await prisma.admin.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            level: 'SUPER_ADMIN',
          },
        });
      })
    );
    console.log(`✅ Created ${createdAdmins.length} admin records`);

    // Create customers
    console.log('Creating customers...');
    const createdCustomers = await Promise.all(
      customers.map(async (customer) => {
        return await prisma.customer.create({
          data: {
            ...customer,
            merchantId: merchant.id,
            dateOfBirth: customer.dateOfBirth ? new Date(customer.dateOfBirth) : null,
          },
        });
      })
    );
    console.log(`✅ Created ${createdCustomers.length} customers`);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Categories: ${createdCategories.length}`);
    console.log(`- Outlets: ${createdOutlets.length}`);
    console.log(`- Products: ${createdProducts.length}`);
    console.log(`- Users: ${createdUsers.length}`);
    console.log(`- Admin Records: ${createdAdmins.length}`);
    console.log(`- Customers: ${createdCustomers.length}`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('✅ Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
} 