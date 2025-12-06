import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseStatus() {
  try {
    console.log('🔍 Checking database status...\n');

    // Check connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection: OK\n');

    // Get all tables
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    console.log(`📊 Total Tables Found: ${tables.length}`);
    console.log('Tables:', tables.map(t => t.table_name).join(', '));
    console.log('');

    // Check critical tables
    const criticalTables = [
      'User', 
      'Merchant', 
      'Outlet', 
      'Customer', 
      'Product', 
      'Order', 
      'OrderItem',
      'Category',
      'Plan', 
      'Subscription',
      'Payment',
      'PlanLimitAddon'
    ];
    
    const existingTables = tables.map(t => t.table_name);
    const missing = criticalTables.filter(t => !existingTables.includes(t));
    const existing = criticalTables.filter(t => existingTables.includes(t));

    console.log(`✅ Existing Critical Tables (${existing.length}/${criticalTables.length}):`);
    existing.forEach(t => console.log(`   ✓ ${t}`));
    
    if (missing.length > 0) {
      console.log(`\n❌ Missing Critical Tables (${missing.length}):`);
      missing.forEach(t => console.log(`   ✗ ${t}`));
    } else {
      console.log('\n✅ All critical tables exist!');
    }

    // Check migrations table
    const hasMigrations = existingTables.includes('_prisma_migrations');
    console.log(`\n📋 Migrations Table: ${hasMigrations ? '✅ Exists' : '❌ Missing'}`);

    if (hasMigrations) {
      const migrations = await prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
        SELECT migration_name, finished_at
        FROM _prisma_migrations
        ORDER BY started_at DESC
        LIMIT 5
      `;
      
      console.log(`\n📝 Recent Migrations (last 5):`);
      migrations.forEach(m => {
        const status = m.finished_at ? '✅ Applied' : '⏳ Pending';
        console.log(`   ${status} - ${m.migration_name}`);
      });
    }

    // Check sequences
    const sequences = await prisma.$queryRaw<Array<{ sequence_name: string }>>`
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
      ORDER BY sequence_name
    `;
    
    console.log(`\n🔢 Sequences Found: ${sequences.length}`);
    if (sequences.length > 0) {
      console.log('Sample sequences:', sequences.slice(0, 5).map(s => s.sequence_name).join(', '));
    }

  } catch (error) {
    console.error('❌ Error checking database:', error instanceof Error ? error.message : error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStatus();

