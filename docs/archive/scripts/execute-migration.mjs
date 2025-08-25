#!/usr/bin/env node

/**
 * Production Database Migration Script
 * Safely executes 001-best-practices-marketplace.sql migration
 */

import { readFileSync } from 'fs';
import { DatabaseManager } from './mcp-server/dist/database.js';

async function runMigration() {
  console.log('🚀 Starting Best Practices Marketplace Migration...');
  console.log('📅 Date:', new Date().toISOString());
  
  let db;
  
  try {
    // Initialize database connection (same way as production API)
    let config;
    
    const postgresUrl = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
    
    if (postgresUrl) {
      console.log('✅ Using Supabase-Vercel connection string');
      const url = new URL(postgresUrl);
      config = {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1),
        username: url.username,
        password: url.password,
        ssl: true
      };
    } else {
      throw new Error('No database connection string found in environment');
    }

    db = new DatabaseManager(config);
    await db.connect();
    console.log('✅ Database connection established');

    // Safety check: Verify tables don't already exist
    console.log('🛡️  Running safety checks...');
    
    const tableCheck = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('best_practices', 'bp_tags', 'bp_adoptions', 'bp_usage_events')
    `);
    
    if (tableCheck.rows.length > 0) {
      console.error('❌ Migration aborted: Tables already exist:', tableCheck.rows.map(r => r.table_name));
      console.log('🔍 This indicates migration was already run or there is existing data.');
      process.exit(1);
    }
    
    console.log('✅ Safety check passed: No conflicting tables found');

    // Read and execute migration
    console.log('📄 Reading migration file...');
    const migrationSql = readFileSync('./mcp-server/database/migrations/001-best-practices-marketplace.sql', 'utf8');
    
    console.log('⚡ Executing migration...');
    await db.query(migrationSql);
    
    // Verify migration success
    console.log('🔍 Verifying migration results...');
    const verifyCheck = await db.query(`
      SELECT 
        table_name,
        CASE WHEN table_name IS NOT NULL THEN '✅' ELSE '❌' END as status
      FROM (VALUES 
        ('best_practices'),
        ('bp_tags'), 
        ('bp_adoptions'),
        ('bp_usage_events')
      ) AS expected(table_name)
      LEFT JOIN information_schema.tables t ON t.table_name = expected.table_name 
      WHERE t.table_schema = 'public' OR t.table_schema IS NULL
      ORDER BY expected.table_name
    `);
    
    console.log('\n📊 Migration Results:');
    verifyCheck.rows.forEach(row => {
      console.log(`  ${row.status} ${row.table_name}`);
    });
    
    // Check if all tables were created
    const successCount = verifyCheck.rows.filter(row => row.status === '✅').length;
    if (successCount === 4) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('📋 Best Practices Marketplace tables are now available');
      console.log('🔧 The get_best_practices tool should now work correctly');
    } else {
      console.log(`\n⚠️  Migration partially successful: ${successCount}/4 tables created`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error instanceof Error ? error.message : String(error));
    console.log('🔄 No changes were made to the database');
    process.exit(1);
  } finally {
    if (db) {
      await db.disconnect();
      console.log('✅ Database connection closed');
    }
  }
}

// Execute migration
runMigration().catch(console.error);