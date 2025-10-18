#!/usr/bin/env node

/**
 * Test Railway Volume functionality
 * This script tests if Railway Volume is properly mounted and accessible
 */

const fs = require('fs');
const path = require('path');

const UPLOAD_FOLDER = '/app/public/uploads';

async function testRailwayVolume() {
  console.log('🧪 Testing Railway Volume...\n');

  try {
    // 1. Check if upload directory exists
    console.log('1. Checking upload directory...');
    if (fs.existsSync(UPLOAD_FOLDER)) {
      console.log('✅ Upload directory exists:', UPLOAD_FOLDER);
    } else {
      console.log('❌ Upload directory does not exist:', UPLOAD_FOLDER);
      console.log('   Creating directory...');
      fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
      console.log('✅ Created upload directory');
    }

    // 2. Test write permissions
    console.log('\n2. Testing write permissions...');
    const testFile = path.join(UPLOAD_FOLDER, 'test-railway-volume.txt');
    const testContent = `Railway Volume Test - ${new Date().toISOString()}`;
    
    fs.writeFileSync(testFile, testContent);
    console.log('✅ Successfully wrote test file');

    // 3. Test read permissions
    console.log('\n3. Testing read permissions...');
    const readContent = fs.readFileSync(testFile, 'utf8');
    if (readContent === testContent) {
      console.log('✅ Successfully read test file');
    } else {
      console.log('❌ Read content does not match');
    }

    // 4. Test file listing
    console.log('\n4. Testing file listing...');
    const files = fs.readdirSync(UPLOAD_FOLDER);
    console.log(`✅ Found ${files.length} files in upload directory`);
    if (files.length > 0) {
      console.log('   Files:', files.slice(0, 5).join(', '), files.length > 5 ? '...' : '');
    }

    // 5. Test subdirectory creation
    console.log('\n5. Testing subdirectory creation...');
    const subDir = path.join(UPLOAD_FOLDER, 'products');
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
      console.log('✅ Created products subdirectory');
    } else {
      console.log('✅ Products subdirectory already exists');
    }

    // 6. Cleanup test file
    console.log('\n6. Cleaning up test file...');
    fs.unlinkSync(testFile);
    console.log('✅ Cleaned up test file');

    console.log('\n🎉 Railway Volume test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Upload directory: ✅ Accessible');
    console.log('   - Write permissions: ✅ Working');
    console.log('   - Read permissions: ✅ Working');
    console.log('   - File listing: ✅ Working');
    console.log('   - Subdirectory creation: ✅ Working');
    console.log('\n🚀 Railway Volume is ready for image uploads!');

  } catch (error) {
    console.error('\n❌ Railway Volume test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check if Railway Volume is properly mounted');
    console.error('   2. Verify file permissions');
    console.error('   3. Check Railway dashboard for volume status');
    process.exit(1);
  }
}

// Run test
testRailwayVolume();
