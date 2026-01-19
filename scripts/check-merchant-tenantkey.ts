/**
 * Script to check if a merchant exists with a given tenantKey
 * Usage: npx tsx scripts/check-merchant-tenantkey.ts <tenantKey>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMerchant(tenantKey: string) {
  try {
    console.log(`🔍 Checking for merchant with tenantKey: "${tenantKey}"`);
    
    // Try exact match first
    const exactMatch = await prisma.merchant.findUnique({
      where: { tenantKey },
      select: {
        id: true,
        name: true,
        email: true,
        tenantKey: true,
        isActive: true,
        createdAt: true
      }
    });
    
    if (exactMatch) {
      console.log('✅ Found merchant (exact match):');
      console.log(JSON.stringify(exactMatch, null, 2));
      return;
    }
    
    // Try case-insensitive search
    const caseInsensitive = await prisma.$queryRaw<Array<{
      id: number;
      name: string;
      email: string;
      tenantKey: string | null;
      isActive: boolean;
      createdAt: Date;
    }>>`
      SELECT 
        id,
        name,
        email,
        "tenantKey",
        "isActive",
        "createdAt"
      FROM "Merchant"
      WHERE LOWER("tenantKey") = LOWER(${tenantKey})
      LIMIT 1
    `;
    
    if (caseInsensitive && caseInsensitive.length > 0) {
      console.log('✅ Found merchant (case-insensitive match):');
      console.log(JSON.stringify(caseInsensitive[0], null, 2));
      return;
    }
    
    // List all merchants with tenantKey
    const allMerchants = await prisma.merchant.findMany({
      where: {
        tenantKey: { not: null }
      },
      select: {
        id: true,
        name: true,
        email: true,
        tenantKey: true,
        isActive: true
      },
      take: 20,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('❌ Merchant not found with tenantKey:', tenantKey);
    console.log('\n📋 Available merchants with tenantKey (first 20):');
    allMerchants.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.name} (${m.email}) - tenantKey: "${m.tenantKey}" - Active: ${m.isActive}`);
    });
    
    if (allMerchants.length === 0) {
      console.log('  (No merchants with tenantKey found)');
    }
    
  } catch (error) {
    console.error('❌ Error checking merchant:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get tenantKey from command line args
const tenantKey = process.argv[2];

if (!tenantKey) {
  console.error('❌ Please provide a tenantKey as argument');
  console.error('Usage: npx tsx scripts/check-merchant-tenantkey.ts <tenantKey>');
  process.exit(1);
}

checkMerchant(tenantKey);
