import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeDatabase } from './api/_utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let db;
  
  try {
    db = await initializeDatabase();
    
    // Get all tables
    const allTables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    // Check best_practices table specifically
    const bpCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'best_practices'
      )
    `);
    
    // Get database connection info (safe parts)
    const dbInfo = await db.query(`
      SELECT current_database() as db_name, version() as pg_version
    `);
    
    return res.status(200).json({
      success: true,
      database: dbInfo.rows[0],
      all_tables: allTables.rows.map(r => r.table_name),
      best_practices_exists: bpCheck.rows[0]?.exists || false,
      table_count: allTables.rows.length
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Database query failed',
      details: error instanceof Error ? error.message : String(error)
    });
  } finally {
    if (db) {
      await db.disconnect();
    }
  }
}