/**
 * Test script to verify category connection logic
 * 
 * category.connect là Prisma relation syntax:
 * - { connect: { id: 66 } } = Kết nối product với category có id = 66
 * - Prisma sẽ tự động set categoryId = 66 trong database
 * 
 * Vấn đề có thể xảy ra:
 * 1. Category với id 66 có tồn tại không?
 * 2. Category 66 có thuộc đúng merchant không?
 * 3. Logic check có đúng không?
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCategoryConnection() {
  try {
    console.log('🔍 Testing category connection logic...\n');

    // Test 1: Check if category 66 exists
    console.log('1️⃣ Checking if category 66 exists...');
    const category66 = await prisma.category.findUnique({
      where: { id: 66 },
      include: {
        merchant: { select: { id: true, name: true } }
      }
    });

    if (category66) {
      console.log('✅ Category 66 exists:');
      console.log('   - Name:', category66.name);
      console.log('   - Merchant ID:', category66.merchantId);
      console.log('   - Merchant Name:', category66.merchant?.name);
      console.log('   - Is Active:', category66.isActive);
    } else {
      console.log('❌ Category 66 does NOT exist!');
    }

    // Test 2: Check category 62 (default category)
    console.log('\n2️⃣ Checking category 62 (default category)...');
    const category62 = await prisma.category.findUnique({
      where: { id: 62 },
      include: {
        merchant: { select: { id: true, name: true } }
      }
    });

    if (category62) {
      console.log('✅ Category 62 exists:');
      console.log('   - Name:', category62.name);
      console.log('   - Merchant ID:', category62.merchantId);
      console.log('   - Is Active:', category62.isActive);
    } else {
      console.log('❌ Category 62 does NOT exist!');
    }

    // Test 3: List all categories for a merchant (if category66 exists)
    if (category66) {
      console.log(`\n3️⃣ Listing all categories for merchant ${category66.merchantId}...`);
      const merchantCategories = await prisma.category.findMany({
        where: { merchantId: category66.merchantId },
        select: { id: true, name: true, isActive: true },
        orderBy: { id: 'asc' }
      });
      
      console.log(`Found ${merchantCategories.length} categories:`);
      merchantCategories.forEach(cat => {
        const marker = cat.id === 66 ? '👉' : cat.id === 62 ? '⚠️' : '  ';
        console.log(`${marker} ID: ${cat.id}, Name: ${cat.name}, Active: ${cat.isActive}`);
      });
    }

    // Test 4: Simulate product creation data
    console.log('\n4️⃣ Simulating product creation with categoryId: 66...');
    const testData = {
      category: { connect: { id: 66 } }
    };
    
    console.log('Test data structure:', JSON.stringify(testData, null, 2));
    console.log('Has categoryId?', 'categoryId' in testData ? 'YES' : 'NO');
    console.log('Has category.connect?', testData.category?.connect ? 'YES' : 'NO');
    console.log('Category connect id:', testData.category?.connect?.id);

    // Test 5: Check logic
    console.log('\n5️⃣ Testing logic check...');
    const hasCategory = testData.categoryId || (testData.category && testData.category.connect);
    console.log('hasCategory result:', hasCategory);
    console.log('Will use default category?', !hasCategory ? 'YES ❌' : 'NO ✅');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  } finally {
    await prisma.$disconnect();
  }
}

testCategoryConnection();

