// Simple migration script for Vercel environment
const { readFileSync } = require('fs');
const { Pool } = require('pg');

async function runMigration() {
  console.log('🚀 Starting Best Practices Migration...');
  
  // Try different SSL configurations based on the connection string
  const connectionString = process.env.POSTGRES_URL;
  console.log('🔗 Using connection string scheme:', connectionString ? connectionString.split(':')[0] : 'none');
  
  const pool = new Pool({
    connectionString: connectionString,
    ssl: false  // Start without SSL
  });
  
  try {
    // Safety check
    console.log('🛡️  Safety check...');
    const check = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'best_practices'
    `);
    
    if (check.rows.length > 0) {
      console.log('❌ best_practices table already exists! Migration aborted.');
      return;
    }
    
    console.log('✅ Safety check passed');
    
    // Execute migration
    console.log('⚡ Executing migration...');
    const sql = readFileSync('./mcp-server/database/migrations/001-best-practices-marketplace.sql', 'utf8');
    await pool.query(sql);
    
    // Verify
    console.log('🔍 Verifying results...');
    const verify = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name IN ('best_practices', 'bp_tags', 'bp_adoptions', 'bp_usage_events')
    `);
    
    const tableCount = parseInt(verify.rows[0].count);
    console.log(`✅ Migration complete! Created ${tableCount}/4 tables`);
    
    if (tableCount === 4) {
      console.log('🎉 All best practices tables created successfully!');
    } else {
      console.log('⚠️  Some tables may be missing. Check logs.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);