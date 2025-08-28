const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Helper function to generate next public ID
async function getNextPublicId(modelName) {
  const lastRecord = await prisma[modelName].findFirst({
    orderBy: { publicId: 'desc' }
  });
  return lastRecord ? lastRecord.publicId + 1 : 1;
}

// Helper function to create user with proper role assignment
async function createUser(userData, role, merchantId = null, outletId = null) {
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  
  const user = await prisma.user.create({
    data: {
      publicId: await getNextPublicId('user'),
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      role: role,
      isActive: true,
      merchantId: merchantId,
      outletId: outletId
    }
  });
  
  console.log(`✅ Created ${role} user: ${user.firstName} ${user.lastName} (${user.email})`);
  return user;
}

// Helper function to generate random customer data
function generateCustomerData(index) {
  const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Lisa', 'James', 'Jennifer', 'Robert', 'Amanda', 'William', 'Jessica', 'Richard', 'Ashley', 'Joseph', 'Stephanie', 'Thomas', 'Nicole', 'Christopher', 'Heather', 'Daniel', 'Elizabeth', 'Matthew', 'Megan', 'Anthony', 'Lauren', 'Mark', 'Rachel', 'Donald', 'Kayla', 'Steven', 'Michelle', 'Paul', 'Tiffany', 'Andrew', 'Melissa', 'Joshua', 'Christine', 'Kenneth', 'Amber', 'Kevin', 'Danielle', 'Brian', 'Brittany', 'George', 'Rebecca', 'Timothy', 'Laura', 'Ronald', 'Kimberly'];
  
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];
  
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington', 'Boston', 'El Paso', 'Nashville', 'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas', 'Memphis', 'Louisville', 'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Sacramento', 'Atlanta', 'Kansas City', 'Long Beach', 'Colorado Springs', 'Raleigh', 'Miami', 'Virginia Beach', 'Omaha', 'Oakland', 'Minneapolis', 'Tampa', 'Tulsa', 'Arlington', 'New Orleans', 'Wichita', 'Cleveland'];
  
  const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'FL', 'OH', 'GA', 'NC', 'MI', 'NJ', 'VA', 'WA', 'OR', 'TN', 'IN', 'MA', 'MO', 'CO', 'MN', 'WI', 'MD', 'LA', 'AL', 'SC', 'KY', 'OK', 'CT', 'IA', 'MS', 'AR', 'UT', 'NV', 'KS', 'NE', 'ID', 'WV', 'HI', 'NH', 'ME', 'RI', 'MT', 'DE', 'SD', 'ND', 'AK', 'VT', 'WY', 'DC'];
  
  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[index % lastNames.length];
  const city = cities[index % cities.length];
  const state = states[index % states.length];
  
  // Generate unique phone number based on index to avoid conflicts
  const areaCode = ['212', '213', '312', '713', '602', '215', '210', '619', '214', '408', '512', '904', '817', '614', '704', '415', '317', '206', '303', '202', '617', '915', '615', '313', '405', '503', '702', '901', '502', '410', '414', '505', '520', '559', '916', '404', '816', '562', '719', '919', '305', '757', '402', '510', '612', '813', '918', '817', '504', '316', '216'];
  const phonePrefix = ['555', '444', '333', '222', '111', '666', '777', '888', '999', '000'];
  const phoneSuffix = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];
  
  const uniquePhone = `+1${areaCode[index % areaCode.length]}${phonePrefix[Math.floor(index / 10) % phonePrefix.length]}${phoneSuffix[index % phoneSuffix.length]}`;
  
  return {
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index + 1}@example.com`,
    phone: uniquePhone,
    address: `${Math.floor(Math.random() * 9999) + 1} ${['Main', 'Oak', 'Pine', 'Elm', 'Maple', 'Cedar', 'Birch', 'Willow'][index % 8]} ${['St', 'Ave', 'Rd', 'Dr', 'Blvd', 'Ln', 'Way', 'Ct'][index % 8]}`,
    city,
    state,
    zipCode: `${Math.floor(Math.random() * 90000) + 10000}`,
    country: 'USA',
    dateOfBirth: new Date(1980 + (index % 40), (index % 12), (index % 28) + 1),
    idType: ['passport', 'drivers_license', 'national_id', 'other'][index % 4],
    idNumber: `${['A', 'B', 'C', 'D'][index % 4]}${Math.floor(Math.random() * 900000) + 100000}`,
    notes: `Customer ${index + 1} - ${city}, ${state}`,
    isActive: true
  };
}

// Helper function to generate random product data
function generateProductData(index, categories) {
  const productNames = [
    'iPhone 15 Pro', 'Samsung Galaxy S24', 'MacBook Pro M3', 'iPad Air', 'Apple Watch Series 9',
    'Drill Set', 'Circular Saw', 'Hammer Drill', 'Impact Driver', 'Table Saw',
    'Party Tent', 'Sound System', 'Lighting Kit', 'Tables & Chairs', 'Dance Floor',
    'Treadmill', 'Exercise Bike', 'Weight Set', 'Yoga Mat', 'Resistance Bands',
    'Office Chair', 'Desk', 'Filing Cabinet', 'Bookshelf', 'Conference Table',
    'Camera Kit', 'Video Camera', 'Tripod', 'Lighting Stand', 'Microphone Set',
    'Garden Tools', 'Lawn Mower', 'Hedge Trimmer', 'Pressure Washer', 'Leaf Blower',
    'Kitchen Equipment', 'Coffee Maker', 'Blender', 'Food Processor', 'Stand Mixer',
    'Cleaning Equipment', 'Vacuum Cleaner', 'Steam Cleaner', 'Floor Buffer', 'Carpet Cleaner',
    'Medical Equipment', 'Wheelchair', 'Hospital Bed', 'Patient Monitor', 'Oxygen Tank',
    'Construction Tools', 'Jackhammer', 'Concrete Mixer', 'Scaffolding', 'Safety Equipment'
  ];
  
  const descriptions = [
    'High-quality electronic device with advanced features',
    'Professional-grade tool for serious work',
    'Premium equipment for events and celebrations',
    'Fitness equipment for home and gym use',
    'Ergonomic furniture for office and home',
    'Professional photography and video equipment',
    'Garden and landscaping tools',
    'Commercial kitchen equipment',
    'Industrial cleaning equipment',
    'Medical and healthcare equipment',
    'Heavy construction and safety equipment'
  ];
  
  const productName = productNames[index % productNames.length];
  const categoryIndex = Math.floor(index / 5); // Distribute products across categories
  const category = categories[categoryIndex % categories.length];
  
  const basePrice = [25, 15, 50, 30, 8, 40, 35, 20, 45, 60, 80][categoryIndex % 11];
  const rentPrice = basePrice + (Math.random() * 20);
  const salePrice = rentPrice * 30 + (Math.random() * 200);
  const deposit = rentPrice * 2 + (Math.random() * 100);
  
  return {
    name: productName,
    description: descriptions[categoryIndex % descriptions.length],
    barcode: `${productName.replace(/\s+/g, '').toUpperCase()}${String(index + 1).padStart(3, '0')}`,
    totalStock: Math.floor(Math.random() * 20) + 5,
    rentPrice: Math.round(rentPrice * 100) / 100,
    salePrice: Math.round(salePrice * 100) / 100,
    deposit: Math.round(deposit * 100) / 100,
    categoryId: category.id,
    images: JSON.stringify([
      `https://example.com/images/${productName.toLowerCase().replace(/\s+/g, '-')}-1.jpg`,
      `https://example.com/images/${productName.toLowerCase().replace(/\s+/g, '-')}-2.jpg`
    ])
  };
}

// Helper function to generate random order data
function generateOrderData(index, customers, products, outlet) {
  const orderTypes = ['RENT', 'SALE'];
  const statuses = ['BOOKED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
  
  const orderType = orderTypes[index % orderTypes.length];
  const status = statuses[index % statuses.length];
  
  const customer = customers[index % customers.length];
  const product = products[index % products.length];
  
  const quantity = Math.floor(Math.random() * 3) + 1;
  const unitPrice = product.rentPrice;
  const totalPrice = unitPrice * quantity;
  const depositAmount = product.deposit;
  
  const pickupDate = new Date();
  pickupDate.setDate(pickupDate.getDate() + Math.floor(Math.random() * 30) + 1);
  
  const returnDate = new Date(pickupDate);
  returnDate.setDate(returnDate.getDate() + Math.floor(Math.random() * 14) + 1);
  
  const rentalDuration = Math.ceil((returnDate - pickupDate) / (1000 * 60 * 60 * 24));
  
  return {
    orderNumber: `ORD-${String(index + 1).padStart(6, '0')}`,
    orderType,
    status,
    totalAmount: totalPrice,
    depositAmount,
    securityDeposit: depositAmount,
    damageFee: 0,
    lateFee: 0,
    pickupPlanAt: pickupDate,
    returnPlanAt: returnDate,
    rentalDuration,
    isReadyToDeliver: Math.random() > 0.3, // 70% ready to deliver
    collateralType: ['CASH', 'DOCUMENT', 'NONE'][index % 3],
    collateralDetails: ['ID Card', 'Passport', 'Driver License', 'Credit Card'][index % 4],
    notes: `Order ${index + 1} - ${orderType} for ${customer.firstName} ${customer.lastName}`,
    pickupNotes: `Customer pickup scheduled for ${pickupDate.toLocaleDateString()}`,
    returnNotes: `Expected return on ${returnDate.toLocaleDateString()}`,
    damageNotes: '',
    outletId: outlet.id,
    customerId: customer.id
  };
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting comprehensive database seeding...\n');

    // Step 1: Create test merchant
    console.log('🏢 Creating test merchant...');
    let merchant = await prisma.merchant.findFirst();
    
    if (!merchant) {
      merchant = await prisma.merchant.create({
        data: {
          publicId: await getNextPublicId('merchant'),
          name: 'Test Rental Shop',
          description: 'Test merchant for development and testing',
          isActive: true
        }
      });
      console.log(`✅ Created merchant: ${merchant.name} (ID: ${merchant.publicId})`);
    } else {
      console.log(`✅ Using existing merchant: ${merchant.name} (ID: ${merchant.publicId})`);
    }

    // Step 2: Create test outlet
    console.log('\n🏪 Creating test outlet...');
    let outlet = await prisma.outlet.findFirst({
      where: { merchantId: merchant.id }
    });
    
    if (!outlet) {
      outlet = await prisma.outlet.create({
        data: {
          publicId: await getNextPublicId('outlet'),
          name: 'Main Store',
          address: '123 Main Street, Test City',
          description: 'Main test outlet for development',
          merchantId: merchant.id,
          isActive: true
        }
      });
      console.log(`✅ Created outlet: ${outlet.name} (ID: ${outlet.publicId})`);
    } else {
      console.log(`✅ Using existing outlet: ${outlet.name} (ID: ${outlet.publicId})`);
    }

    // Step 3: Create users with different roles (5 users as defined in README)
    console.log('\n👥 Creating users with different roles...');
    
    const users = [
      {
        email: 'admin@rentalshop.com',
        password: 'admin123',
        firstName: 'System',
        lastName: 'Administrator',
        phone: '+1234567890',
        role: 'ADMIN'
      },
      {
        email: 'merchant@rentalshop.com',
        password: 'merchant123',
        firstName: 'Business',
        lastName: 'Owner',
        phone: '+1234567891',
        role: 'MERCHANT'
      },
      {
        email: 'manager@rentalshop.com',
        password: 'manager123',
        firstName: 'Outlet',
        lastName: 'Manager',
        phone: '+1234567892',
        role: 'OUTLET_ADMIN'
      },
      {
        email: 'staff@rentalshop.com',
        password: 'staff123',
        firstName: 'Store',
        lastName: 'Staff',
        phone: '+1234567893',
        role: 'OUTLET_STAFF'
      },
      {
        email: 'client@rentalshop.com',
        password: 'client123',
        firstName: 'John',
        lastName: 'Client',
        phone: '+1234567894',
        role: 'CLIENT'
      }
    ];

    const createdUsers = {};

    for (const userData of users) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`⚠️ User already exists: ${userData.email}`);
        createdUsers[userData.role.toLowerCase()] = existingUser;
        continue;
      }

      // Check if phone number already exists for this merchant
      if (userData.merchantId) {
        const existingPhoneUser = await prisma.user.findFirst({
          where: { 
            phone: userData.phone,
            merchantId: userData.merchantId 
          }
        });
        if (existingPhoneUser) {
          console.log(`⚠️ Phone number conflict for ${userData.email}, generating new number...`);
          // Generate a unique phone number
          userData.phone = `+1${555 + Object.keys(createdUsers).length}${1000000 + Object.keys(createdUsers).length}`;
        }
      }

      let user;
      
      try {
        switch (userData.role) {
          case 'ADMIN':
            user = await createUser(userData, 'ADMIN');
            break;
          case 'MERCHANT':
            user = await createUser(userData, 'MERCHANT', merchant.id);
            break;
          case 'OUTLET_ADMIN':
          case 'OUTLET_STAFF':
            user = await createUser(userData, userData.role, merchant.id, outlet.id);
            break;
          case 'CLIENT':
            user = await createUser(userData, 'CLIENT', merchant.id);
            break;
          default:
            console.log(`⚠️ Unknown role: ${userData.role}`);
            continue;
        }

        createdUsers[userData.role.toLowerCase()] = user;
      } catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('phone')) {
          console.log(`⚠️ Phone number conflict for ${userData.email}, trying alternative number...`);
          // Try with a completely different phone number
          userData.phone = `+1${999}${1000000 + Object.keys(createdUsers).length}`;
          
          try {
            switch (userData.role) {
              case 'ADMIN':
                user = await createUser(userData, 'ADMIN');
                break;
              case 'MERCHANT':
                user = await createUser(userData, 'MERCHANT', merchant.id);
                break;
              case 'OUTLET_ADMIN':
              case 'OUTLET_STAFF':
                user = await createUser(userData, userData.role, merchant.id, outlet.id);
                break;
              case 'CLIENT':
                user = await createUser(userData, 'CLIENT', merchant.id);
                break;
            }
            createdUsers[userData.role.toLowerCase()] = user;
          } catch (retryError) {
            console.error(`❌ Failed to create user ${userData.email} after phone retry:`, retryError.message);
          }
        } else {
          console.error(`❌ Failed to create user ${userData.email}:`, error.message);
        }
      }
    }

    // Step 4: Create 50 test customers
    console.log('\n👤 Creating 50 test customers...');
    
    const createdCustomers = [];
    const customerCount = 50;

    for (let i = 0; i < customerCount; i++) {
      const customerData = generateCustomerData(i);
      
      // Check if customer already exists
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          email: customerData.email,
          merchantId: merchant.id
        }
      });

      if (existingCustomer) {
        console.log(`⚠️ Customer already exists: ${customerData.firstName} ${customerData.lastName}`);
        createdCustomers.push(existingCustomer);
        continue;
      }

      // Check if phone number already exists for this merchant
      const existingPhoneCustomer = await prisma.customer.findFirst({
        where: {
          phone: customerData.phone,
          merchantId: merchant.id
        }
      });

      if (existingPhoneCustomer) {
        console.log(`⚠️ Phone number conflict for customer ${customerData.firstName} ${customerData.lastName}, generating new number...`);
        // Generate a unique phone number
        const areaCode = ['555', '444', '333', '222', '111', '666', '777', '888', '999', '000'];
        const phonePrefix = ['000', '111', '222', '333', '444', '555', '666', '777', '888', '999'];
        const phoneSuffix = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];
        
        customerData.phone = `+1${areaCode[i % areaCode.length]}${phonePrefix[Math.floor(i / 10) % phonePrefix.length]}${phoneSuffix[i % phoneSuffix.length]}`;
      }

      const customer = await prisma.customer.create({
        data: {
          publicId: await getNextPublicId('customer'),
          ...customerData,
          merchantId: merchant.id
        }
      });

      if (i < 5) { // Only log first 5 for readability
        console.log(`✅ Created customer: ${customer.firstName} ${customer.lastName} (${customer.email})`);
      } else if (i === 5) {
        console.log(`   ... and ${customerCount - 5} more customers`);
      }
      
      createdCustomers.push(customer);
    }

    console.log(`✅ Created ${createdCustomers.length} customers total`);

    // Step 5: Create test categories
    console.log('\n📂 Creating test categories...');
    
    const categories = [
      { name: 'Electronics', description: 'Electronic devices and gadgets' },
      { name: 'Tools', description: 'Hand tools and power tools' },
      { name: 'Party Equipment', description: 'Party and event equipment' },
      { name: 'Sports Equipment', description: 'Sports and fitness equipment' },
      { name: 'Furniture', description: 'Furniture and home decor' },
      { name: 'Photography', description: 'Camera and video equipment' },
      { name: 'Garden & Landscaping', description: 'Garden tools and equipment' },
      { name: 'Kitchen Equipment', description: 'Commercial kitchen appliances' },
      { name: 'Cleaning Equipment', description: 'Industrial cleaning tools' },
      { name: 'Medical Equipment', description: 'Healthcare and medical devices' },
      { name: 'Construction', description: 'Heavy construction equipment' }
    ];

    const createdCategories = [];

    for (const categoryData of categories) {
      // Check if category already exists
      const existingCategory = await prisma.category.findFirst({
        where: {
          name: categoryData.name,
          merchantId: merchant.id
        }
      });

      if (existingCategory) {
        console.log(`⚠️ Category already exists: ${categoryData.name}`);
        createdCategories.push(existingCategory);
        continue;
      }

      const category = await prisma.category.create({
        data: {
          publicId: await getNextPublicId('category'),
          ...categoryData,
          merchantId: merchant.id,
          isActive: true
        }
      });

      console.log(`✅ Created category: ${category.name}`);
      createdCategories.push(category);
    }

    // Step 6: Create 50 test products
    console.log('\n📦 Creating 50 test products...');
    
    const createdProducts = [];
    const productCount = 50;

    for (let i = 0; i < productCount; i++) {
      const productData = generateProductData(i, createdCategories);
      
      // Check if product already exists
      const existingProduct = await prisma.product.findFirst({
        where: {
          barcode: productData.barcode,
          merchantId: merchant.id
        }
      });

      if (existingProduct) {
        console.log(`⚠️ Product already exists: ${productData.name}`);
        createdProducts.push(existingProduct);
        continue;
      }

      const product = await prisma.product.create({
        data: {
          publicId: await getNextPublicId('product'),
          ...productData,
          merchantId: merchant.id,
          isActive: true
        }
      });

      if (i < 5) { // Only log first 5 for readability
        console.log(`✅ Created product: ${product.name} (${product.barcode})`);
      } else if (i === 5) {
        console.log(`   ... and ${productCount - 5} more products`);
      }

      createdProducts.push(product);

      // Create outlet stock for this product
      await prisma.outletStock.create({
        data: {
          productId: product.id,
          outletId: outlet.id,
          stock: productData.totalStock,
          available: productData.totalStock,
          renting: 0
        }
      });
    }

    console.log(`✅ Created ${createdProducts.length} products total`);

    // Step 7: Create 50 test orders
    console.log('\n📋 Creating 50 test orders...');
    
    const createdOrders = [];
    const orderCount = 50;

    for (let i = 0; i < orderCount; i++) {
      const orderData = generateOrderData(i, createdCustomers, createdProducts, outlet);
      
      // Check if order already exists
      const existingOrder = await prisma.order.findFirst({
        where: {
          orderNumber: orderData.orderNumber
        }
      });

      if (existingOrder) {
        console.log(`⚠️ Order already exists: ${orderData.orderNumber}`);
        createdOrders.push(existingOrder);
        continue;
      }

      const order = await prisma.order.create({
        data: {
          publicId: await getNextPublicId('order'),
          ...orderData
        }
      });

      // Create order item
      const product = createdProducts[i % createdProducts.length];
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          quantity: orderData.quantity || 1,
          unitPrice: product.rentPrice,
          totalPrice: orderData.totalAmount,
          rentalDays: orderData.rentalDuration,
          notes: `Order item for ${product.name}`
        }
      });

      // Create payment record
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: orderData.depositAmount,
          method: ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DIGITAL_WALLET'][i % 4],
          type: 'DEPOSIT',
          status: 'COMPLETED',
          reference: `PAY-${String(i + 1).padStart(6, '0')}`,
          notes: `Deposit payment for order ${orderData.orderNumber}`
        }
      });

      if (i < 5) { // Only log first 5 for readability
        console.log(`✅ Created order: ${order.orderNumber} - ${orderData.orderType} - $${orderData.totalAmount}`);
      } else if (i === 5) {
        console.log(`   ... and ${orderCount - 5} more orders`);
      }

      createdOrders.push(order);
    }

    console.log(`✅ Created ${createdOrders.length} orders total`);

    // Step 8: Summary
    console.log('\n🎉 Comprehensive database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Merchant: ${merchant.name} (ID: ${merchant.publicId})`);
    console.log(`   Outlet: ${outlet.name} (ID: ${outlet.publicId})`);
    console.log(`   Users: ${Object.keys(createdUsers).length} created`);
    console.log(`   Customers: ${createdCustomers.length} created`);
    console.log(`   Categories: ${createdCategories.length} created`);
    console.log(`   Products: ${createdProducts.length} created`);
    console.log(`   Orders: ${createdOrders.length} created`);

    console.log('\n🔑 Login Credentials:');
    console.log('   Admin: admin@rentalshop.com / admin123');
    console.log('   Merchant: merchant@rentalshop.com / merchant123');
    console.log('   Manager: manager@rentalshop.com / manager123');
    console.log('   Staff: staff@rentalshop.com / staff123');
    console.log('   Client: client@rentalshop.com / client123');

    console.log('\n💡 All entities have been created with proper public IDs and relationships.');
    console.log('   - 50 customers with realistic data');
    console.log('   - 50 products across 11 categories');
    console.log('   - 50 orders with order items and payments');
    console.log('   - Proper inventory tracking with outlet stock');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    
    if (error.code === 'P2002') {
      console.error('🔍 This is a unique constraint violation.');
      if (error.meta?.target?.includes('phone')) {
        console.error('📱 Phone number conflict detected. The script has been updated to handle this automatically.');
        console.error('💡 Try running the script again - it will generate unique phone numbers.');
      } else if (error.meta?.target?.includes('email')) {
        console.error('📧 Email conflict detected. This usually means entities already exist.');
        console.error('💡 The script is idempotent - you can run it again safely.');
      }
    }
    
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedDatabase();
