#!/usr/bin/env node

/**
 * AWS S3 Setup Script for RentalShop
 * This script helps setup S3 bucket and test credentials
 * 
 * USAGE:
 * 1. Set environment variables in .env file:
 *    AWS_REGION=us-east-1
 *    AWS_ACCESS_KEY_ID=your-access-key-id
 *    AWS_SECRET_ACCESS_KEY=your-secret-access-key
 *    AWS_S3_BUCKET_NAME=your-bucket-name
 * 
 * 2. Run script:
 *    node scripts/setup-aws-s3.js
 */

const { S3Client, CreateBucketCommand, PutBucketCorsCommand, PutBucketPolicyCommand } = require('@aws-sdk/client-s3');

// Load environment variables
require('dotenv').config();

// AWS Configuration - Use environment variables
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'rentalshop-images';

async function setupS3Bucket() {
  try {
    console.log('🚀 Setting up AWS S3 bucket...');
    
    // 1. Create bucket
    console.log('📦 Creating S3 bucket...');
    const createBucketCommand = new CreateBucketCommand({
      Bucket: BUCKET_NAME,
      ACL: 'private',
    });
    
    await s3Client.send(createBucketCommand);
    console.log('✅ Bucket created successfully');
    
    // 2. Configure CORS
    console.log('🌐 Configuring CORS...');
    const corsCommand = new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedOrigins: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    });
    
    await s3Client.send(corsCommand);
    console.log('✅ CORS configured successfully');
    
    // 3. Set bucket policy for public read
    console.log('🔓 Setting bucket policy...');
    const policyCommand = new PutBucketPolicyCommand({
      Bucket: BUCKET_NAME,
      Policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: `arn:aws:s3:::${BUCKET_NAME}/*`,
          },
        ],
      }),
    });
    
    await s3Client.send(policyCommand);
    console.log('✅ Bucket policy set successfully');
    
    console.log('\n🎉 AWS S3 setup completed!');
    console.log(`📦 Bucket: ${BUCKET_NAME}`);
    console.log('🌐 Region: us-east-1');
    console.log('🔗 Public URL: https://rentalshop-images.s3.us-east-1.amazonaws.com/');
    
  } catch (error) {
    if (error.name === 'BucketAlreadyOwnedByYou') {
      console.log('✅ Bucket already exists and is owned by you');
    } else if (error.name === 'BucketAlreadyExists') {
      console.log('⚠️ Bucket already exists (owned by someone else)');
      console.log('💡 Try a different bucket name');
    } else {
      console.error('❌ Error setting up S3 bucket:', error.message);
    }
  }
}

async function testS3Connection() {
  try {
    console.log('🧪 Testing S3 connection...');
    
    const { ListBucketsCommand } = require('@aws-sdk/client-s3');
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    
    console.log('✅ S3 connection successful');
    console.log('📦 Available buckets:');
    response.Buckets.forEach(bucket => {
      console.log(`  - ${bucket.Name} (created: ${bucket.CreationDate})`);
    });
    
  } catch (error) {
    console.error('❌ S3 connection failed:', error.message);
  }
}

// Run setup
async function main() {
  console.log('🔧 AWS S3 Setup for RentalShop\n');
  
  await testS3Connection();
  console.log('');
  await setupS3Bucket();
  
  console.log('\n📋 Next steps:');
  console.log('1. Add environment variables to Railway Dashboard');
  console.log('2. Deploy the updated code');
  console.log('3. Test image upload functionality');
}

main().catch(console.error);
