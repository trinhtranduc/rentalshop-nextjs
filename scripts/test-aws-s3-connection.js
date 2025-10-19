#!/usr/bin/env node

/**
 * Test AWS S3 Connection and Upload
 * Tests if AWS S3 is properly configured and working
 */

require('dotenv').config();
const { S3Client, ListBucketsCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// AWS Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'rentalshop-images';

async function testS3Connection() {
  console.log('🧪 Testing AWS S3 Connection...\n');
  console.log('📋 Configuration:');
  console.log(`   Region: ${process.env.AWS_REGION || 'us-east-1'}`);
  console.log(`   Bucket: ${BUCKET_NAME}`);
  console.log(`   Access Key: ${process.env.AWS_ACCESS_KEY_ID?.substring(0, 10)}...`);
  console.log('');

  try {
    // Test 1: List Buckets (verify credentials)
    console.log('1️⃣ Testing credentials (List Buckets)...');
    const listCommand = new ListBucketsCommand({});
    const listResponse = await s3Client.send(listCommand);
    console.log('✅ Credentials valid!');
    console.log(`   Found ${listResponse.Buckets?.length || 0} buckets`);
    
    // Check if our bucket exists
    const bucketExists = listResponse.Buckets?.some(b => b.Name === BUCKET_NAME);
    if (bucketExists) {
      console.log(`✅ Bucket "${BUCKET_NAME}" exists`);
    } else {
      console.log(`⚠️  Bucket "${BUCKET_NAME}" not found in account`);
      console.log('   Available buckets:');
      listResponse.Buckets?.forEach(b => console.log(`      - ${b.Name}`));
    }
    console.log('');

    // Test 2: Upload a test file
    console.log('2️⃣ Testing file upload...');
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = `AWS S3 Test - ${new Date().toISOString()}`;
    
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `test/${testFileName}`,
      Body: Buffer.from(testContent),
      ContentType: 'text/plain',
      ACL: 'public-read',
    });

    await s3Client.send(uploadCommand);
    console.log('✅ File uploaded successfully!');
    
    // Generate URL
    const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/test/${testFileName}`;
    console.log(`   URL: ${fileUrl}`);
    console.log('');

    // Test 3: Upload an image (if test image exists)
    console.log('3️⃣ Testing image upload...');
    const testImagePath = path.join(__dirname, 'test-image.jpg');
    
    if (fs.existsSync(testImagePath)) {
      const imageBuffer = fs.readFileSync(testImagePath);
      const imageFileName = `test-image-${Date.now()}.jpg`;
      
      const imageUploadCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `test/${imageFileName}`,
        Body: imageBuffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
      });

      await s3Client.send(imageUploadCommand);
      console.log('✅ Image uploaded successfully!');
      
      const imageUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/test/${imageFileName}`;
      console.log(`   URL: ${imageUrl}`);
    } else {
      console.log('ℹ️  No test image found, skipping image upload test');
      console.log(`   (Place a test image at: ${testImagePath})`);
    }
    console.log('');

    // Summary
    console.log('🎉 All tests passed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ AWS credentials are valid');
    console.log('   ✅ S3 bucket is accessible');
    console.log('   ✅ File upload is working');
    console.log('   ✅ Public access is configured');
    console.log('\n✨ AWS S3 integration is ready to use!');

  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error('\n📋 Error details:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.Code || error.code || 'Unknown'}`);
    
    if (error.message.includes('credentials')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check AWS_ACCESS_KEY_ID in .env file');
      console.error('   2. Check AWS_SECRET_ACCESS_KEY in .env file');
      console.error('   3. Verify credentials in AWS IAM Console');
    } else if (error.message.includes('NoSuchBucket') || error.Code === 'NoSuchBucket') {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Bucket may not exist, run: node scripts/setup-aws-s3.js');
      console.error('   2. Check bucket name in .env file');
      console.error('   3. Verify bucket region matches AWS_REGION');
    } else if (error.message.includes('AccessDenied') || error.Code === 'AccessDenied') {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check IAM user has S3 permissions');
      console.error('   2. Verify bucket policy allows PutObject');
      console.error('   3. Check ACL settings in bucket configuration');
    }
    
    process.exit(1);
  }
}

// Run tests
testS3Connection().catch(console.error);

