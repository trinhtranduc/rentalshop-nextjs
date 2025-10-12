#!/usr/bin/env node

const https = require('https');

// Test popular APIs
const baseUrl = 'https://dev-apis-development.up.railway.app';
const endpoints = [
  '/api/analytics/top-products?limit=5',
  '/api/analytics/top-customers?limit=5',
  '/api/analytics/dashboard'
];

// You'll need to get a fresh token from browser dev tools
const token = 'YOUR_TOKEN_HERE'; // Replace with actual token

async function testEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${baseUrl}${endpoint}`;
    console.log(`\n🔍 Testing: ${url}`);
    
    const options = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`✅ Status: ${res.statusCode}`);
          console.log(`📊 Response:`, JSON.stringify(json, null, 2));
          resolve(json);
        } catch (error) {
          console.log(`❌ Parse Error:`, error.message);
          console.log(`📄 Raw Response:`, data);
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.log(`❌ Request Error:`, error.message);
      reject(error);
    });
  });
}

async function testAllEndpoints() {
  console.log('🚀 Testing Popular APIs...');
  
  for (const endpoint of endpoints) {
    try {
      await testEndpoint(endpoint);
    } catch (error) {
      console.log(`❌ Failed to test ${endpoint}:`, error.message);
    }
  }
  
  console.log('\n✅ All tests completed!');
}

if (require.main === module) {
  if (token === 'YOUR_TOKEN_HERE') {
    console.log('❌ Please update the token in the script first!');
    console.log('📝 Get token from browser dev tools -> Network -> Authorization header');
    process.exit(1);
  }
  
  testAllEndpoints();
}

module.exports = { testAllEndpoints, testEndpoint };
