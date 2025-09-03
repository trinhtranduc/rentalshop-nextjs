import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface BackupOptions {
  type: 'full' | 'incremental' | 'schema-only';
  includeData: boolean;
  compress: boolean;
  tables?: string[];
}

interface BackupResult {
  success: boolean;
  backupId: string;
  filename: string;
  size: number;
  duration: number;
  tables: string[];
  timestamp: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const options: BackupOptions = {
      type: body.type || 'full',
      includeData: body.includeData !== false,
      compress: body.compress !== false,
      tables: body.tables
    };

    console.log('🔄 Starting backup process:', options);

    // Generate backup ID and filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup-${timestamp}`;
    const filename = `${backupId}.sql`;
    const backupPath = path.join(process.cwd(), 'backups', filename);
    
    // Ensure backups directory exists
    await fs.mkdir(path.dirname(backupPath), { recursive: true });

    let backupCommand: string;
    let tables: string[] = [];

    if (options.type === 'schema-only') {
      // Schema-only backup
      backupCommand = `pg_dump "${process.env.DATABASE_URL}" --schema-only --no-owner --no-privileges`;
      tables = ['schema'];
    } else if (options.tables && options.tables.length > 0) {
      // Specific tables backup
      const tableList = options.tables.join(' ');
      backupCommand = `pg_dump "${process.env.DATABASE_URL}" --data-only --no-owner --no-privileges --table=${tableList}`;
      tables = options.tables;
    } else {
      // Full backup
      backupCommand = `pg_dump "${process.env.DATABASE_URL}" --no-owner --no-privileges`;
      
      // Get all table names
      const tableResult = await prisma.$queryRaw`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename;
      ` as Array<{ tablename: string }>;
      tables = tableResult.map(t => t.tablename);
    }

    // Add compression if requested
    if (options.compress) {
      backupCommand += ' | gzip';
    }

    // Execute backup
    console.log('📦 Executing backup command...');
    const { stdout, stderr } = await execAsync(backupCommand);
    
    if (stderr && !stderr.includes('NOTICE')) {
      throw new Error(`Backup failed: ${stderr}`);
    }

    // Write backup to file
    const backupData = options.compress ? stdout : stdout;
    await fs.writeFile(backupPath, backupData);

    // Get file size
    const stats = await fs.stat(backupPath);
    const fileSize = stats.size;

    // Log backup completion
    console.log(`✅ Backup completed: ${filename} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    const result: BackupResult = {
      success: true,
      backupId,
      filename: options.compress ? `${filename}.gz` : filename,
      size: fileSize,
      duration: Date.now() - startTime,
      tables,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Backup failed:', error);
    
    const result: BackupResult = {
      success: false,
      backupId: '',
      filename: '',
      size: 0,
      duration: Date.now() - startTime,
      tables: [],
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    return NextResponse.json(result, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const backupsDir = path.join(process.cwd(), 'backups');
    
    // Check if backups directory exists
    try {
      await fs.access(backupsDir);
    } catch {
      return NextResponse.json({
        success: true,
        backups: [],
        message: 'No backups found'
      });
    }

    // List all backup files
    const files = await fs.readdir(backupsDir);
    const backupFiles = files
      .filter(file => file.endsWith('.sql') || file.endsWith('.sql.gz'))
      .map(async (file) => {
        const filePath = path.join(backupsDir, file);
        const stats = await fs.stat(filePath);
        
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      });

    const backups = await Promise.all(backupFiles);
    
    // Sort by creation date (newest first)
    backups.sort((a, b) => b.created.getTime() - a.created.getTime());

    return NextResponse.json({
      success: true,
      backups,
      total: backups.length,
      totalSize: backups.reduce((sum, backup) => sum + backup.size, 0)
    });

  } catch (error) {
    console.error('❌ Failed to list backups:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list backups'
    }, { status: 500 });
  }
}
