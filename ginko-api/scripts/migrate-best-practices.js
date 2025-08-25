#!/usr/bin/env node

/**
 * Best Practices Marketplace Migration Runner
 * Applies database schema changes for Phase 1 MVP
 */

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/contextmcp',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🔌 Connecting to database...');
        await client.connect();
        
        // Create migrations table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);

        // Check if migration already applied
        const { rows: existing } = await client.query(
            'SELECT migration_name FROM schema_migrations WHERE migration_name = $1',
            ['001-best-practices-marketplace']
        );

        if (existing.length > 0) {
            console.log('✅ Migration 001-best-practices-marketplace already applied');
            return;
        }

        // Read and execute migration
        const migrationPath = path.join(__dirname, '../database/migrations/001-best-practices-marketplace.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('🚀 Applying migration 001-best-practices-marketplace...');
        await client.query('BEGIN');
        
        try {
            await client.query(migrationSQL);
            await client.query(
                'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
                ['001-best-practices-marketplace']
            );
            await client.query('COMMIT');
            
            console.log('✅ Migration applied successfully!');
            
            // Verify tables were created
            const { rows: tables } = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('best_practices', 'bp_tags', 'bp_adoptions', 'bp_usage_events')
                ORDER BY table_name
            `);
            
            console.log('\n📊 Created tables:');
            tables.forEach(({ table_name }) => {
                console.log(`  ✓ ${table_name}`);
            });

            // Check views
            const { rows: views } = await client.query(`
                SELECT table_name 
                FROM information_schema.views 
                WHERE table_schema = 'public' 
                AND table_name IN ('public_best_practices', 'organization_best_practices')
                ORDER BY table_name
            `);
            
            console.log('\n🔍 Created views:');
            views.forEach(({ table_name }) => {
                console.log(`  ✓ ${table_name}`);
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Migration interrupted');
    process.exit(0);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMigration().then(() => {
        console.log('\n🎉 Best Practices Marketplace database ready!');
        process.exit(0);
    });
}

export { runMigration };