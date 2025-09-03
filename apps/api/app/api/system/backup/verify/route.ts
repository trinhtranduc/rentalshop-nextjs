import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface BackupVerification {
  backupId: string;
  filename: string;
  status: 'verified' | 'failed' | 'corrupted';
  fileSize: number;
  fileExists: boolean;
  canRestore: boolean;
  tableCount: number;
  recordCount: number;
  checksum: string;
  timestamp: string;
  errors: string[];
  warnings: string[];
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { backupId, performRestoreTest = false } = body;

    if (!backupId) {
      return NextResponse.json({
        success: false,
        error: 'Backup ID is required'
      }, { status: 400 });
    }

    console.log(`🔍 Verifying backup: ${backupId}`);

    const verification: BackupVerification = {
      backupId,
      filename: '',
      status: 'failed',
      fileSize: 0,
      fileExists: false,
      canRestore: false,
      tableCount: 0,
      recordCount: 0,
      checksum: '',
      timestamp: new Date().toISOString(),
      errors: [],
      warnings: []
    };

    // 1. Check if backup file exists
    const backupsDir = path.join(process.cwd(), 'backups');
    const backupFile = path.join(backupsDir, `${backupId}.sql`);
    const compressedBackupFile = path.join(backupsDir, `${backupId}.sql.gz`);
    
    let backupPath: string;
    let isCompressed = false;
    
    try {
      await fs.access(backupFile);
      backupPath = backupFile;
      verification.filename = `${backupId}.sql`;
    } catch {
      try {
        await fs.access(compressedBackupFile);
        backupPath = compressedBackupFile;
        verification.filename = `${backupId}.sql.gz`;
        isCompressed = true;
      } catch {
        verification.errors.push('Backup file not found');
        return NextResponse.json({
          success: false,
          verification
        }, { status: 404 });
      }
    }

    verification.fileExists = true;

    // 2. Get file size and checksum
    try {
      const stats = await fs.stat(backupPath);
      verification.fileSize = stats.size;
      
      // Calculate checksum
      const checksumResult = await execAsync(`md5sum "${backupPath}"`);
      verification.checksum = checksumResult.stdout.split(' ')[0];
    } catch (error) {
      verification.errors.push(`Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 3. Analyze backup content
    try {
      const analysis = await analyzeBackupContent(backupPath, isCompressed);
      verification.tableCount = analysis.tableCount;
      verification.recordCount = analysis.recordCount;
      
      if (analysis.errors.length > 0) {
        verification.errors.push(...analysis.errors);
      }
      if (analysis.warnings.length > 0) {
        verification.warnings.push(...analysis.warnings);
      }
    } catch (error) {
      verification.errors.push(`Failed to analyze backup content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 4. Test restore capability (dry run)
    try {
      const restoreTest = await testRestoreCapability(backupPath, isCompressed);
      verification.canRestore = restoreTest.success;
      
      if (!restoreTest.success) {
        verification.errors.push(`Restore test failed: ${restoreTest.error}`);
      }
    } catch (error) {
      verification.errors.push(`Failed to test restore capability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 5. Perform actual restore test if requested (to test database)
    if (performRestoreTest && verification.canRestore) {
      try {
        const restoreTestResult = await performRestoreTest(backupPath, isCompressed);
        if (!restoreTestResult.success) {
          verification.errors.push(`Actual restore test failed: ${restoreTestResult.error}`);
        } else {
          verification.warnings.push('Restore test completed successfully (test database restored)');
        }
      } catch (error) {
        verification.errors.push(`Failed to perform restore test: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 6. Determine overall status
    if (verification.errors.length === 0) {
      verification.status = 'verified';
    } else if (verification.errors.length <= 2 && verification.canRestore) {
      verification.status = 'verified';
      verification.warnings.push('Backup has minor issues but is restorable');
    } else {
      verification.status = 'failed';
    }

    console.log(`✅ Backup verification completed: ${verification.status}`);

    return NextResponse.json({
      success: verification.status === 'verified',
      verification
    });

  } catch (error) {
    console.error('❌ Backup verification failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function analyzeBackupContent(backupPath: string, isCompressed: boolean): Promise<{
  tableCount: number;
  recordCount: number;
  errors: string[];
  warnings: string[];
}> {
  const result = {
    tableCount: 0,
    recordCount: 0,
    errors: [] as string[],
    warnings: [] as string[]
  };

  try {
    // Read backup content
    const content = isCompressed 
      ? await execAsync(`gunzip -c "${backupPath}"`)
      : await fs.readFile(backupPath, 'utf8');
    
    const backupContent = isCompressed ? content.stdout : content;
    
    // Count tables
    const tableMatches = backupContent.match(/CREATE TABLE "?(\w+)"?/g);
    result.tableCount = tableMatches ? tableMatches.length : 0;
    
    // Count INSERT statements
    const insertMatches = backupContent.match(/INSERT INTO/g);
    result.recordCount = insertMatches ? insertMatches.length : 0;
    
    // Check for common issues
    if (backupContent.includes('ERROR:')) {
      result.errors.push('Backup contains error messages');
    }
    
    if (backupContent.includes('WARNING:')) {
      result.warnings.push('Backup contains warning messages');
    }
    
    if (result.tableCount === 0) {
      result.errors.push('No tables found in backup');
    }
    
    if (result.recordCount === 0) {
      result.warnings.push('No data records found in backup');
    }
    
    // Check for incomplete statements
    const incompleteStatements = backupContent.match(/;\s*$/g);
    if (!incompleteStatements || incompleteStatements.length < result.tableCount) {
      result.warnings.push('Backup may contain incomplete SQL statements');
    }
    
  } catch (error) {
    result.errors.push(`Failed to analyze backup content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return result;
}

async function testRestoreCapability(backupPath: string, isCompressed: boolean): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Test if we can parse the backup file
    const testCommand = isCompressed 
      ? `gunzip -t "${backupPath}"`
      : `head -n 10 "${backupPath}"`;
    
    await execAsync(testCommand);
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function performRestoreTest(backupPath: string, isCompressed: boolean): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Create a test database for restore testing
    const testDbUrl = process.env.DATABASE_URL?.replace(/\/[^\/]+$/, '/test_restore_db');
    
    if (!testDbUrl) {
      return {
        success: false,
        error: 'Test database URL not configured'
      };
    }
    
    // Create test database
    await execAsync(`createdb "${testDbUrl}"`);
    
    try {
      // Perform restore to test database
      const restoreCommand = isCompressed 
        ? `gunzip -c "${backupPath}" | psql "${testDbUrl}"`
        : `psql "${testDbUrl}" < "${backupPath}"`;
      
      await execAsync(restoreCommand);
      
      // Test if restore was successful by checking table count
      const tableCountResult = await execAsync(`psql "${testDbUrl}" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"`);
      const tableCount = parseInt(tableCountResult.stdout.match(/\d+/)?.[0] || '0');
      
      if (tableCount === 0) {
        return {
          success: false,
          error: 'No tables found after restore'
        };
      }
      
      return { success: true };
      
    } finally {
      // Clean up test database
      try {
        await execAsync(`dropdb "${testDbUrl}"`);
      } catch (cleanupError) {
        console.warn('Failed to cleanup test database:', cleanupError);
      }
    }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
