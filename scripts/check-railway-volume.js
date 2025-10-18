#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Check Railway Volume mount status
 */
async function checkRailwayVolume() {
  console.log('🔍 Checking Railway Volume mount status...\n');

  const uploadDir = '/app/apps/api/public/uploads';
  const testFile = 'volume-test.txt';
  const testContent = `Railway Volume Test - ${new Date().toISOString()}`;

  try {
    // 1. Check if directory exists
    console.log('1️⃣ Checking upload directory...');
    if (fs.existsSync(uploadDir)) {
      console.log(`   ✅ Directory exists: ${uploadDir}`);
      
      // Check permissions
      try {
        fs.accessSync(uploadDir, fs.constants.R_OK | fs.constants.W_OK);
        console.log('   ✅ Directory is readable and writable');
      } catch (err) {
        console.log('   ❌ Directory permission error:', err.message);
        return false;
      }
    } else {
      console.log(`   ❌ Directory does not exist: ${uploadDir}`);
      console.log('   💡 Creating directory...');
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('   ✅ Directory created');
    }

    // 2. Test file write
    console.log('\n2️⃣ Testing file write...');
    const testFilePath = path.join(uploadDir, testFile);
    
    try {
      fs.writeFileSync(testFilePath, testContent);
      console.log('   ✅ File written successfully');
    } catch (err) {
      console.log('   ❌ File write failed:', err.message);
      return false;
    }

    // 3. Test file read
    console.log('\n3️⃣ Testing file read...');
    try {
      const readContent = fs.readFileSync(testFilePath, 'utf8');
      if (readContent === testContent) {
        console.log('   ✅ File read successfully');
        console.log(`   📄 Content: ${readContent}`);
      } else {
        console.log('   ❌ Content mismatch');
        return false;
      }
    } catch (err) {
      console.log('   ❌ File read failed:', err.message);
      return false;
    }

    // 4. Test file persistence (check if it's actually on volume)
    console.log('\n4️⃣ Testing file persistence...');
    try {
      const stats = fs.statSync(testFilePath);
      console.log('   ✅ File stats:', {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      });
    } catch (err) {
      console.log('   ❌ File stats failed:', err.message);
      return false;
    }

    // 5. List directory contents
    console.log('\n5️⃣ Directory contents:');
    try {
      const files = fs.readdirSync(uploadDir);
      console.log(`   📁 Files in ${uploadDir}:`, files);
    } catch (err) {
      console.log('   ❌ Directory listing failed:', err.message);
      return false;
    }

    // 6. Cleanup test file
    console.log('\n6️⃣ Cleaning up test file...');
    try {
      fs.unlinkSync(testFilePath);
      console.log('   ✅ Test file removed');
    } catch (err) {
      console.log('   ⚠️ Could not remove test file:', err.message);
    }

    console.log('\n🎉 Railway Volume is working correctly!');
    return true;

  } catch (error) {
    console.error('\n❌ Railway Volume check failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the check
checkRailwayVolume()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Script error:', error);
    process.exit(1);
  });
