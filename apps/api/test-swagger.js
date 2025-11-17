// Test swagger config loading
console.log('Testing swagger configs...');

try {
  // Test individual configs
  const orders = require('./lib/swagger/orders.ts');
  console.log('✅ Orders config loaded');
  console.log('Order paths:', Object.keys(orders.orderSwaggerConfig.paths));
  
  const users = require('./lib/swagger/users.ts');
  console.log('✅ Users config loaded');
  console.log('User paths:', Object.keys(users.userSwaggerConfig.paths));
  
  const categories = require('./lib/swagger/categories.ts');
  console.log('✅ Categories config loaded');
  console.log('Category paths:', Object.keys(categories.categorySwaggerConfig.paths));
  
  const plans = require('./lib/swagger/plans.ts');
  console.log('✅ Plans config loaded');
  console.log('Plan paths:', Object.keys(plans.planSwaggerConfig.paths));
  
  const merchants = require('./lib/swagger/merchants.ts');
  console.log('✅ Merchants config loaded');
  console.log('Merchant paths:', Object.keys(merchants.merchantSwaggerConfig.paths));
  
  const outlets = require('./lib/swagger/outlets.ts');
  console.log('✅ Outlets config loaded');
  console.log('Outlet paths:', Object.keys(outlets.outletSwaggerConfig.paths));
  
  const subscriptions = require('./lib/swagger/subscriptions.ts');
  console.log('✅ Subscriptions config loaded');
  console.log('Subscription paths:', Object.keys(subscriptions.subscriptionSwaggerConfig.paths));
  
  console.log('\n🎉 All individual configs loaded successfully!');
  
} catch (error) {
  console.error('❌ Error loading configs:', error.message);
  console.error('Stack:', error.stack);
}
