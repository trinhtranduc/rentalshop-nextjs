// Using built-in fetch (Node.js 18+)

async function testOrdersStats() {
  try {
    console.log('Testing orders stats API...');
    
    // First, let's try to get a token by logging in
    const loginResponse = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'merchant1@example.com',
        password: 'merchant123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    if (!loginData.success) {
      console.error('Login failed:', loginData.error);
      return;
    }
    
    const token = loginData.data.token;
    console.log('Token received:', token ? 'Yes' : 'No');
    
    // Now test the orders list endpoint to see the structure
    const ordersResponse = await fetch('http://localhost:3002/api/merchants/1/orders?limit=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    const ordersData = await ordersResponse.json();
    console.log('Orders list response structure:');
    console.log(JSON.stringify(ordersData, null, 2));
    
    // Also test the orders stats endpoint
    const statsResponse = await fetch('http://localhost:3002/api/orders/stats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    const statsData = await statsResponse.json();
    console.log('Orders stats response:', JSON.stringify(statsData, null, 2));
    
    if (statsData.success && statsData.data) {
      console.log('Stats data structure:');
      console.log('- totalOrders:', statsData.data.stats?.totalOrders);
      console.log('- totalRevenue:', statsData.data.stats?.totalRevenue);
      console.log('- activeRentals:', statsData.data.stats?.activeRentals);
      console.log('- completedOrders:', statsData.data.stats?.completedOrders);
      console.log('- cancelledOrders:', statsData.data.stats?.cancelledOrders);
      console.log('- overdueRentals:', statsData.data.stats?.overdueRentals);
      console.log('- averageOrderValue:', statsData.data.stats?.averageOrderValue);
    }
    
  } catch (error) {
    console.error('Error testing orders stats:', error);
  }
}

testOrdersStats();
