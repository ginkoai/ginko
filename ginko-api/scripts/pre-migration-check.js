#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Pre-Migration Check for Legacy Context');
console.log('==========================================\n');

// Check legacy sessions
const legacyPath = path.join(process.cwd(), '.contextmcp/sessions');
if (!fs.existsSync(legacyPath)) {
  console.log('❌ Legacy sessions directory not found:', legacyPath);
  process.exit(1);
}

const files = fs.readdirSync(legacyPath).filter(f => f.endsWith('.json'));
console.log(`📁 Found ${files.length} legacy session files:\n`);

let totalSize = 0;
const sessionInfo = [];

files.forEach(file => {
  const filePath = path.join(legacyPath, file);
  const stats = fs.statSync(filePath);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  totalSize += stats.size;
  
  sessionInfo.push({
    file,
    size: stats.size,
    created: content.createdAt,
    task: content.currentTask || 'Unknown',
    workingDir: content.workingDirectory
  });
});

// Display session information
sessionInfo.forEach(info => {
  console.log(`📄 ${info.file}`);
  console.log(`   Task: ${info.task}`);
  console.log(`   Created: ${new Date(info.created).toLocaleString()}`);
  console.log(`   Size: ${(info.size / 1024).toFixed(2)} KB`);
  console.log(`   Working Dir: ${info.workingDir}`);
  console.log('');
});

console.log(`📊 Summary:`);
console.log(`   Total files: ${files.length}`);
console.log(`   Total size: ${(totalSize / 1024).toFixed(2)} KB`);
console.log(`   Date range: ${new Date(sessionInfo[0]?.created).toLocaleDateString()} - ${new Date(sessionInfo[sessionInfo.length - 1]?.created).toLocaleDateString()}`);

// Check legacy server
console.log('\n🔍 Checking legacy server...');
try {
  const response = await fetch('http://localhost:3031/health').catch(() => null);
  if (response && response.ok) {
    console.log('⚠️  Legacy Socket.IO server is running on port 3031');
    console.log('   This should be stopped after migration');
  } else {
    console.log('✅ Legacy server is not running');
  }
} catch (e) {
  console.log('✅ Legacy server is not running');
}

// Check environment
console.log('\n🔍 Environment Check:');
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
console.log(`   SUPABASE_DB_URL: ${process.env.SUPABASE_DB_URL ? '✅ Set' : '❌ Not set'}`);
console.log(`   DB_HOST: ${process.env.DB_HOST || 'Not set'}`);
console.log(`   DB_NAME: ${process.env.DB_NAME || 'Not set'}`);

console.log('\n⚠️  Migration Notes:');
console.log('1. Sessions will be migrated with placeholder user_id');
console.log('2. Original files will be preserved (non-destructive)');
console.log('3. A backup will be created before migration');
console.log('4. Full migration report will be generated');

console.log('\n📝 Next Steps:');
console.log('1. Ensure database credentials are configured');
console.log('2. Run: node scripts/migrate-legacy-context.js');
console.log('3. Verify migration report');
console.log('4. Update MCP client configuration');
console.log('5. Stop legacy server on port 3031');