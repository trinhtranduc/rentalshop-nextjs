/**
 * Run Qdrant Reset with Real-time Progress Display
 * 
 * Script này chạy reset và hiển thị progress real-time
 * 
 * Usage:
 *   NODE_ENV=development QDRANT_COLLECTION_ENV=product-images-dev yarn tsx scripts/run-qdrant-reset-realtime.ts
 */

import { spawn } from 'child_process';
import { resolve } from 'path';

const nodeEnv = process.env.NODE_ENV || 'development';
const collectionEnv = process.env.QDRANT_COLLECTION_ENV || 'product-images-dev';

console.log('🚀 Starting Qdrant Reset with Real-time Progress');
console.log(`   Environment: ${nodeEnv}`);
console.log(`   Collection: ${collectionEnv}`);
console.log('─────────────────────────────────────────────────\n');

// Spawn the reset script
const scriptPath = resolve(process.cwd(), 'scripts/reset-qdrant-collection.ts');
const child = spawn('tsx', [scriptPath, '--confirm'], {
  env: {
    ...process.env,
    NODE_ENV: nodeEnv,
    QDRANT_COLLECTION_ENV: collectionEnv,
  },
  stdio: 'inherit', // This will show real-time output
  shell: false,
});

// Handle process events
child.on('error', (error) => {
  console.error('❌ Error spawning process:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('\n✅ Script completed successfully!');
  } else {
    console.log(`\n❌ Script exited with code ${code}`);
  }
  process.exit(code || 0);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Received SIGINT, stopping script...');
  child.kill('SIGINT');
  setTimeout(() => {
    console.log('✅ Script stopped');
    process.exit(0);
  }, 2000);
});
