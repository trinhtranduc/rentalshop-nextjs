#!/usr/bin/env node
// ============================================================================
// Schema Sync Verification Script
// ============================================================================
// This script verifies that the database schema matches the Prisma schema
// by checking for orphaned columns (columns in database but not in schema)
// and missing columns (columns in schema but not in database).
//
// Usage:
//   node scripts/verify-schema-sync.js
//
// Prerequisites:
//   - DATABASE_URL environment variable set
//   - Prisma schema at prisma/schema.prisma
//   - @prisma/client installed
// ============================================================================

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================================================
// Parse Prisma Schema to Extract Model Fields
// ============================================================================

function parsePrismaSchema() {
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Prisma schema not found at ${schemaPath}`);
  }
  
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const models = {};
  
  // Extract model definitions
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/gs;
  let match;
  
  while ((match = modelRegex.exec(schemaContent)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];
    const fields = [];
    
    // Extract field definitions (lines that don't start with @@ or //)
    const fieldLines = modelBody.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && 
             !trimmed.startsWith('@@') && 
             !trimmed.startsWith('//') &&
             !trimmed.startsWith('///') &&
             trimmed.includes(' ');
    });
    
    for (const line of fieldLines) {
      // Extract field name (first word after optional @id, @default, etc.)
      const fieldMatch = line.match(/(\w+)\s+[A-Za-z]/);
      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        // Skip relation fields (they don't have columns in database)
        if (!line.includes('@relation') && !line.includes('[]')) {
          fields.push(fieldName);
        }
      }
    }
    
    models[modelName] = fields;
  }
  
  return models;
}

// ============================================================================
// Get Database Schema from PostgreSQL
// ============================================================================

async function getDatabaseSchema(prisma) {
  const tables = {};
  
  // Get all tables in public schema
  const tableResult = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  
  for (const row of tableResult) {
    const tableName = row.table_name;
    
    // Get columns for this table
    const columnsResult = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = ${tableName}
      ORDER BY ordinal_position
    `;
    
    tables[tableName] = columnsResult.map(col => col.column_name);
  }
  
  return tables;
}

// ============================================================================
// Compare Schemas
// ============================================================================

function compareSchemas(prismaModels, dbTables) {
  const issues = {
    orphanedColumns: [], // Columns in DB but not in Prisma schema
    missingColumns: [],  // Columns in Prisma but not in DB
    missingTables: [],   // Tables in Prisma but not in DB
    extraTables: []      // Tables in DB but not in Prisma (usually migration tables)
  };
  
  // Check each Prisma model
  for (const [modelName, prismaFields] of Object.entries(prismaModels)) {
    const dbTableName = modelName; // Prisma model names match table names
    
    if (!dbTables[dbTableName]) {
      issues.missingTables.push({
        table: dbTableName,
        model: modelName
      });
      continue;
    }
    
    const dbColumns = dbTables[dbTableName];
    
    // Check for missing columns (in Prisma but not in DB)
    for (const field of prismaFields) {
      // Convert camelCase to snake_case for comparison
      const snakeCaseField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
      
      if (!dbColumns.includes(field) && !dbColumns.includes(snakeCaseField)) {
        issues.missingColumns.push({
          table: dbTableName,
          model: modelName,
          field: field
        });
      }
    }
    
    // Check for orphaned columns (in DB but not in Prisma)
    for (const column of dbColumns) {
      // Convert snake_case to camelCase for comparison
      const camelCaseColumn = column.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      
      if (!prismaFields.includes(column) && !prismaFields.includes(camelCaseColumn)) {
        // Skip system columns and migration tables
        if (column !== 'id' && 
            !column.startsWith('_') && 
            !dbTableName.startsWith('_')) {
          issues.orphanedColumns.push({
            table: dbTableName,
            model: modelName,
            column: column
          });
        }
      }
    }
  }
  
  // Check for extra tables (in DB but not in Prisma)
  for (const tableName of Object.keys(dbTables)) {
    if (!prismaModels[tableName] && !tableName.startsWith('_')) {
      // Skip Prisma migration tables
      if (tableName !== '_prisma_migrations') {
        issues.extraTables.push({
          table: tableName
        });
      }
    }
  }
  
  return issues;
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  log('🔍 Schema Sync Verification', 'cyan');
  log('='.repeat(60), 'cyan');
  log('');
  
  if (!process.env.DATABASE_URL) {
    log('❌ DATABASE_URL environment variable is not set', 'red');
    process.exit(1);
  }
  
  const prisma = new PrismaClient({
    log: ['error'],
  });
  
  try {
    // Parse Prisma schema
    log('📋 Parsing Prisma schema...', 'blue');
    const prismaModels = parsePrismaSchema();
    log(`✅ Found ${Object.keys(prismaModels).length} models in Prisma schema`, 'green');
    log('');
    
    // Get database schema
    log('🔍 Querying database schema...', 'blue');
    const dbTables = await getDatabaseSchema(prisma);
    log(`✅ Found ${Object.keys(dbTables).length} tables in database`, 'green');
    log('');
    
    // Compare schemas
    log('🔍 Comparing schemas...', 'blue');
    const issues = compareSchemas(prismaModels, dbTables);
    log('');
    
    // Report results
    let hasIssues = false;
    
    // Critical: Orphaned columns (can cause Prisma errors)
    if (issues.orphanedColumns.length > 0) {
      hasIssues = true;
      log('⚠️  ORPHANED COLUMNS (in database but not in Prisma schema):', 'yellow');
      log('   These columns can cause Prisma P2032 errors!', 'yellow');
      for (const issue of issues.orphanedColumns) {
        log(`   - ${issue.table}.${issue.column}`, 'yellow');
      }
      log('');
    }
    
    // Missing columns
    if (issues.missingColumns.length > 0) {
      hasIssues = true;
      log('⚠️  MISSING COLUMNS (in Prisma schema but not in database):', 'yellow');
      for (const issue of issues.missingColumns) {
        log(`   - ${issue.table}.${issue.field}`, 'yellow');
      }
      log('');
    }
    
    // Missing tables
    if (issues.missingTables.length > 0) {
      hasIssues = true;
      log('⚠️  MISSING TABLES (in Prisma schema but not in database):', 'yellow');
      for (const issue of issues.missingTables) {
        log(`   - ${issue.table}`, 'yellow');
      }
      log('');
    }
    
    // Extra tables (usually not critical)
    if (issues.extraTables.length > 0) {
      log('ℹ️  EXTRA TABLES (in database but not in Prisma schema):', 'blue');
      for (const issue of issues.extraTables) {
        log(`   - ${issue.table}`, 'blue');
      }
      log('');
    }
    
    // Summary
    if (!hasIssues) {
      log('✅ Schema sync verification passed!', 'green');
      log('   No critical issues found.', 'green');
      process.exit(0);
    } else {
      log('❌ Schema sync verification failed!', 'red');
      log('   Please review the issues above and run migrations if needed.', 'red');
      process.exit(1);
    }
    
  } catch (error) {
    log(`❌ Error during schema verification: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { parsePrismaSchema, getDatabaseSchema, compareSchemas };

