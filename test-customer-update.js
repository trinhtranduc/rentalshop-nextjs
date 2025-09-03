/**
 * Test script to update a customer and check audit logging
 */

const API_BASE_URL = 'http://localhost:3002';

async function testCustomerUpdate() {
  console.log('🔍 Testing Customer Update with Audit Logging...\n');
  
  try {
    // First, let's get a list of customers to find one to update
    console.log('1. Getting customers list...');
    const customersResponse = await fetch(`${API_BASE_URL}/api/customers?limit=5`);
    
    if (!customersResponse.ok) {
      console.error('❌ Failed to get customers:', customersResponse.status, customersResponse.statusText);
      return;
    }
    
    const customersData = await customersResponse.json();
    console.log('✅ Got customers:', customersData.data?.length || 0, 'customers found');
    
    if (!customersData.data || customersData.data.length === 0) {
      console.log('❌ No customers found to update');
      return;
    }
    
    // Get the first customer
    const customer = customersData.data[0];
    console.log('📋 Customer to update:', {
      id: customer.id,
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email
    });
    
    // Update the customer name
    const newName = `Updated ${Date.now()}`;
    const updateData = {
      firstName: newName,
      lastName: customer.lastName
    };
    
    console.log('\n2. Updating customer...');
    console.log('📝 Update data:', updateData);
    
    const updateResponse = await fetch(`${API_BASE_URL}/api/customers/${customer.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will fail auth, but we'll see the debug output
      },
      body: JSON.stringify(updateData)
    });
    
    console.log('📊 Update response status:', updateResponse.status);
    
    if (updateResponse.ok) {
      const updateResult = await updateResponse.json();
      console.log('✅ Customer updated successfully:', updateResult.data);
    } else {
      const errorResult = await updateResponse.text();
      console.log('❌ Update failed:', errorResult);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCustomerUpdate();
