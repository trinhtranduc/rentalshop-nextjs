const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check2025Data() {
  try {
    // Check orders in 2025
    const ordersIn2025 = await prisma.order.count({
      where: {
        createdAt: {
          gte: new Date('2025-01-01'),
          lte: new Date('2025-12-31')
        }
      }
    });
    
    // Check orders in 2024
    const ordersIn2024 = await prisma.order.count({
      where: {
        createdAt: {
          gte: new Date('2024-01-01'),
          lte: new Date('2024-12-31')
        }
      }
    });
    
    // Check orders today (2025-10-12)
    const todayStr = new Date().toISOString().split('T')[0];
    const ordersToday = await prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(todayStr + 'T00:00:00'),
          lte: new Date(todayStr + 'T23:59:59')
        }
      }
    });
    
    // Check orders in October 2025
    const ordersOct2025 = await prisma.order.count({
      where: {
        createdAt: {
          gte: new Date('2025-10-01'),
          lte: new Date('2025-10-31')
        }
      }
    });
    
    console.log('\n📊 Database Data Check:');
    console.log('  📅 Orders in 2024:', ordersIn2024);
    console.log('  📅 Orders in 2025:', ordersIn2025);
    console.log('  📅 Orders Today (Oct 12, 2025):', ordersToday);
    console.log('  📅 Orders October 2025:', ordersOct2025);
    
    // Get date range of all orders
    const dateRange = await prisma.order.aggregate({
      _min: { createdAt: true },
      _max: { createdAt: true }
    });
    
    console.log('\n📆 Date Range of All Orders:');
    console.log('  Earliest:', dateRange._min.createdAt);
    console.log('  Latest:', dateRange._max.createdAt);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check2025Data();
