import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import {API} from '@rentalshop/constants';

const execAsync = promisify(exec);

interface RestoreOptions {
  backupId: string;
  dryRun?: boolean;
  tables?: string[];
  confirmDataLoss?: boolean;
}

interface RestoreResult {
  success: boolean;
  backupId: string;
  dryRun: boolean;
  tablesRestored: string[];
  recordsRestored: number;
  duration: number;
  timestamp: string;
  error?: string;
  warnings?: string[];
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const options: RestoreOptions = {
      backupId: body.backupId,
      dryRun: body.dryRun || false,
      tables: body.tables,
      confirmDataLoss: body.confirmDataLoss || false
    };

    if (!options.backupId) {
      return NextResponse.json({
        success: false,
        error: 'Backup ID is required'
      }, { status: 400 });
    }

    console.log('🔄 Starting restore process:', options);

    // Find backup file
    const backupsDir = path.join(process.cwd(), 'backups');
    const backupFile = path.join(backupsDir, `${options.backupId}.sql`);
    const compressedBackupFile = path.join(backupsDir, `${options.backupId}.sql.gz`);
    
    let backupPath: string;
    let isCompressed = false;
    
    try {
      await fs.access(backupFile);
      backupPath = backupFile;
    } catch {
      try {
        await fs.access(compressedBackupFile);
        backupPath = compressedBackupFile;
        isCompressed = true;
      } catch {
        return NextResponse.json({
          success: false,
          error: `Backup file not found: ${options.backupId}`
        }, { status: API.STATUS.NOT_FOUND });
      }
    }

    // Get current data counts for comparison
    const currentCounts = await getCurrentDataCounts();
    
    if (options.dryRun) {
      // Dry run - just analyze what would be restored
      const analysis = await analyzeBackup(backupPath, isCompressed);
      
      return NextResponse.json({
        success: true,
        backupId: options.backupId,
        dryRun: true,
        analysis,
        currentCounts,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });
    }

    // Confirm data loss if not a dry run
    if (!options.confirmDataLoss) {
      return NextResponse.json({
        success: false,
        error: 'Data loss confirmation required. Set confirmDataLoss: true to proceed.',
        warning: 'This operation will replace existing data'
      }, { status: 400 });
    }

    // Perform actual restore
    const restoreCommand = isCompressed 
      ? `gunzip -c "${backupPath}" | psql "${process.env.DATABASE_URL}"`
      : `psql "${process.env.DATABASE_URL}" < "${backupPath}"`;

    console.log('📦 Executing restore command...');
    const { stdout, stderr } = await execAsync(restoreCommand);
    
    if (stderr && !stderr.includes('NOTICE')) {
      throw new Error(`Restore failed: ${stderr}`);
    }

    // Get new data counts
    const newCounts = await getCurrentDataCounts();
    
    // Calculate what was restored
    const recordsRestored = Object.keys(newCounts).reduce((total, table) => {
      return total + (newCounts[table] - currentCounts[table]);
    }, 0);

    console.log(`✅ Restore completed: ${options.backupId}`);

    const result: RestoreResult = {
      success: true,
      backupId: options.backupId,
      dryRun: false,
      tablesRestored: Object.keys(newCounts),
      recordsRestored,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Restore failed:', error);
    
    const result: RestoreResult = {
      success: false,
      backupId: options.backupId || '',
      dryRun: options.dryRun || false,
      tablesRestored: [],
      recordsRestored: 0,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    return NextResponse.json(result, { status: API.STATUS.INTERNAL_SERVER_ERROR });
  }
}

async function getCurrentDataCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  
  try {
    // Get counts for all major tables
    const tables = [
      'User', 'Merchant', 'Outlet', 'Customer', 'Product', 
      'Order', 'OrderItem', 'Payment', 'Category', 'AuditLog'
    ];
    
    for (const table of tables) {
      try {
        const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
        counts[table] = parseInt((result as any)[0].count);
      } catch (error) {
        // Table might not exist or be accessible
        counts[table] = 0;
      }
    }
  } catch (error) {
    console.error('Error getting current data counts:', error);
  }
  
  return counts;
}

async function analyzeBackup(backupPath: string, isCompressed: boolean): Promise<any> {
  try {
    // Read backup file to analyze its contents
    const content = isCompressed 
      ? await execAsync(`gunzip -c "${backupPath}"`)
      : await fs.readFile(backupPath, 'utf8');
    
    const backupContent = isCompressed ? content.stdout : content;
    
    // Analyze backup content
    const analysis = {
      tables: [],
      estimatedRecords: 0,
      backupSize: 0,
      schemaChanges: [],
      dataInserts: 0
    };
    
    // Extract table names
    const tableMatches = backupContent.match(/CREATE TABLE "?(\w+)"?/g);
    if (tableMatches) {
      analysis.tables = tableMatches.map(match => 
        match.replace(/CREATE TABLE "?(\w+)"?/, '$1')
      );
    }
    
    // Count INSERT statements
    const insertMatches = backupContent.match(/INSERT INTO/g);
    analysis.dataInserts = insertMatches ? insertMatches.length : 0;
    
    // Get file size
    const stats = await fs.stat(backupPath);
    analysis.backupSize = stats.size;
    
    return analysis;
  } catch (error) {
    return {
      error: 'Could not analyze backup file',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}