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

    // Create some sample users
    console.log('Creating sample users...');
    const users = [
      {
        email: 'client@example.com',
        password: '$2b$10$example.hash',
        name: 'John Client',
        role: 'CLIENT',
        phone: '+1234567891',
      },
      {
        email: 'admin@rentalshop.com',
        password: '$2b$10$example.hash',
        name: 'Admin User',
        role: 'ADMIN',
        phone: '+1234567892',
      },
    ];

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

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Categories: ${createdCategories.length}`);
    console.log(`- Outlets: ${createdOutlets.length}`);
    console.log(`- Products: ${createdProducts.length}`);
    console.log(`- Users: ${createdUsers.length}`);

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