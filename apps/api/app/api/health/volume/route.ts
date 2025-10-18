import { NextRequest, NextResponse } from 'next/server';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

/**
 * GET /api/health/volume
 * Check Railway Volume mount status
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Health check: Checking Railway Volume...');
    
    const uploadDir = '/app/apps/api/public/uploads';
    const testFile = `volume-test-${Date.now()}.txt`;
    const testContent = `Railway Volume Test - ${new Date().toISOString()}`;
    
    const results = {
      timestamp: new Date().toISOString(),
      uploadDir,
      checks: {
        directoryExists: false,
        directoryWritable: false,
        fileWrite: false,
        fileRead: false,
        filePersistent: false
      },
      errors: [] as string[]
    };

    // 1. Check directory exists
    try {
      if (existsSync(uploadDir)) {
        results.checks.directoryExists = true;
        console.log('✅ Directory exists');
      } else {
        console.log('📁 Creating directory...');
        mkdirSync(uploadDir, { recursive: true });
        results.checks.directoryExists = true;
        console.log('✅ Directory created');
      }
    } catch (error) {
      results.errors.push(`Directory check failed: ${error.message}`);
      console.error('❌ Directory check failed:', error);
    }

    // 2. Test file write
    if (results.checks.directoryExists) {
      try {
        const testFilePath = join(uploadDir, testFile);
        writeFileSync(testFilePath, testContent);
        results.checks.fileWrite = true;
        console.log('✅ File write successful');
      } catch (error) {
        results.errors.push(`File write failed: ${error.message}`);
        console.error('❌ File write failed:', error);
      }
    }

    // 3. Test file read
    if (results.checks.fileWrite) {
      try {
        const testFilePath = join(uploadDir, testFile);
        const readContent = readFileSync(testFilePath, 'utf8');
        if (readContent === testContent) {
          results.checks.fileRead = true;
          console.log('✅ File read successful');
        } else {
          results.errors.push('File content mismatch');
          console.error('❌ File content mismatch');
        }
      } catch (error) {
        results.errors.push(`File read failed: ${error.message}`);
        console.error('❌ File read failed:', error);
      }
    }

    // 4. Test file persistence
    if (results.checks.fileRead) {
      try {
        const testFilePath = join(uploadDir, testFile);
        const stats = require('fs').statSync(testFilePath);
        results.checks.filePersistent = true;
        results.fileStats = {
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
        console.log('✅ File persistence confirmed');
      } catch (error) {
        results.errors.push(`File stats failed: ${error.message}`);
        console.error('❌ File stats failed:', error);
      }
    }

    // 5. Cleanup test file
    try {
      const testFilePath = join(uploadDir, testFile);
      if (existsSync(testFilePath)) {
        unlinkSync(testFilePath);
        console.log('✅ Test file cleaned up');
      }
    } catch (error) {
      console.warn('⚠️ Could not clean up test file:', error.message);
    }

    // 6. Check directory contents
    try {
      const files = require('fs').readdirSync(uploadDir);
      results.directoryContents = files;
      console.log('📁 Directory contents:', files);
    } catch (error) {
      results.errors.push(`Directory listing failed: ${error.message}`);
      console.error('❌ Directory listing failed:', error);
    }

    const allChecksPassed = Object.values(results.checks).every(check => check === true);
    
    return NextResponse.json({
      success: allChecksPassed,
      data: results,
      message: allChecksPassed 
        ? 'Railway Volume is working correctly' 
        : 'Railway Volume has issues',
      code: allChecksPassed ? 'VOLUME_HEALTHY' : 'VOLUME_UNHEALTHY'
    });

  } catch (error) {
    console.error('❌ Volume health check failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: 'VOLUME_CHECK_FAILED'
      },
      { status: 500 }
    );
  }
}
