import { NextRequest, NextResponse } from 'next/server';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * GET /api/health/volume
 * Check Railway Volume mount status
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export async function GET(request: NextRequest) {
  return withApiLogging(async (request: NextRequest) => {
    try {
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
        } else {
          mkdirSync(uploadDir, { recursive: true });
          results.checks.directoryExists = true;
        }
      } catch (error) {
        results.errors.push(`Directory check failed: ${error.message}`);
      }

      // 2. Test file write
      if (results.checks.directoryExists) {
        try {
          const testFilePath = join(uploadDir, testFile);
          writeFileSync(testFilePath, testContent);
          results.checks.fileWrite = true;
        } catch (error) {
          results.errors.push(`File write failed: ${error.message}`);
        }
      }

      // 3. Test file read
      if (results.checks.fileWrite) {
        try {
          const testFilePath = join(uploadDir, testFile);
          const readContent = readFileSync(testFilePath, 'utf8');
          if (readContent === testContent) {
            results.checks.fileRead = true;
          } else {
            results.errors.push('File content mismatch');
          }
        } catch (error) {
          results.errors.push(`File read failed: ${error.message}`);
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
        } catch (error) {
          results.errors.push(`File stats failed: ${error.message}`);
        }
      }

      // 5. Cleanup test file
      try {
        const testFilePath = join(uploadDir, testFile);
        if (existsSync(testFilePath)) {
          unlinkSync(testFilePath);
        }
      } catch (error) {
        // Silently fail cleanup
      }

      // 6. Check directory contents
      try {
        const files = require('fs').readdirSync(uploadDir);
        results.directoryContents = files;
      } catch (error) {
        results.errors.push(`Directory listing failed: ${error.message}`);
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
      // Error will be automatically logged by withApiLogging wrapper
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: 'VOLUME_CHECK_FAILED'
        },
        { status: 500 }
      );
    }
  })(request);
}
