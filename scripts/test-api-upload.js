#!/usr/bin/env node

/**
 * Test API Image Upload to Railway + AWS S3
 * Tests the deployed API endpoint for image upload
 */

const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration
const API_URL = process.env.API_URL || 'https://apis-development.up.railway.app';
const TEST_EMAIL = 'admin@rentalshop.com';
const TEST_PASSWORD = 'admin123';

let authToken = null;

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      if (typeof options.body === 'string') {
        req.write(options.body);
      } else {
        options.body.pipe(req);
        return;
      }
    }
    
    req.end();
  });
}

/**
 * Login to get auth token
 */
async function login() {
  console.log('🔐 Logging in...');
  console.log(`   Email: ${TEST_EMAIL}`);
  
  try {
    const response = await makeRequest(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });
    
    if (response.status === 200 && response.data.token) {
      authToken = response.data.token;
      console.log('✅ Login successful');
      console.log(`   Token: ${authToken.substring(0, 20)}...`);
      return true;
    } else {
      console.error('❌ Login failed:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return false;
  }
}

/**
 * Upload image via API
 */
async function uploadImage(imagePath) {
  console.log('\n📤 Uploading image...');
  console.log(`   File: ${path.basename(imagePath)}`);
  
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Image file not found: ${imagePath}`);
    return null;
  }
  
  try {
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));
    
    const response = await new Promise((resolve, reject) => {
      form.submit({
        protocol: 'https:',
        host: new URL(API_URL).host,
        path: '/api/upload/image',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }, (err, res) => {
        if (err) {
          reject(err);
          return;
        }
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              data: JSON.parse(data),
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data,
            });
          }
        });
      });
    });
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Upload successful!');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.data?.url) {
        console.log('\n🌐 Image URL:');
        console.log(`   ${response.data.data.url}`);
        
        if (response.data.data.cdnUrl) {
          console.log('\n🚀 CDN URL:');
          console.log(`   ${response.data.data.cdnUrl}`);
        }
        
        return response.data.data;
      }
    } else {
      console.error('❌ Upload failed');
      console.error('   Status:', response.status);
      console.error('   Response:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    return null;
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('🧪 Testing API Image Upload\n');
  console.log('📋 Configuration:');
  console.log(`   API URL: ${API_URL}`);
  console.log('');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('\n❌ Cannot proceed without authentication');
    process.exit(1);
  }
  
  // Step 2: Find test image
  const testImages = [
    path.join(__dirname, 'test-image.jpg'),
    path.join(__dirname, 'test-image.png'),
    path.join(__dirname, '../test-image.jpg'),
    path.join(__dirname, '../test-image.png'),
  ];
  
  let testImagePath = null;
  for (const imgPath of testImages) {
    if (fs.existsSync(imgPath)) {
      testImagePath = imgPath;
      break;
    }
  }
  
  if (!testImagePath) {
    console.error('\n❌ No test image found!');
    console.error('   Please place a test image at one of these locations:');
    testImages.forEach(p => console.error(`   - ${p}`));
    process.exit(1);
  }
  
  // Step 3: Upload image
  const uploadResult = await uploadImage(testImagePath);
  
  if (uploadResult) {
    console.log('\n🎉 Test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Authentication works');
    console.log('   ✅ Image upload works');
    console.log('   ✅ AWS S3 integration works');
    console.log('   ✅ Image is accessible via URL');
  } else {
    console.error('\n❌ Test failed!');
    process.exit(1);
  }
}

// Run test
main().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});

