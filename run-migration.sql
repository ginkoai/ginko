-- PRODUCTION MIGRATION EXECUTION
-- Date: 2025-08-06
-- Migration: 001-best-practices-marketplace.sql
-- Purpose: Add missing best practices tables to production

-- Safety check: Verify we're not overwriting existing data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'best_practices') THEN
        RAISE EXCEPTION 'best_practices table already exists! Aborting migration to prevent data loss.';
    END IF;
    
    RAISE NOTICE 'Migration safety check passed. Proceeding with table creation...';
END
$$;

-- Execute the full migration
\i mcp-server/database/migrations/001-best-practices-marketplace.sql

-- Post-migration verification
SELECT 
    'best_practices' as table_name,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'best_practices') as exists
UNION ALL
SELECT 
    'bp_tags' as table_name,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bp_tags') as exists
UNION ALL
SELECT 
    'bp_adoptions' as table_name,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bp_adoptions') as exists
UNION ALL
SELECT 
    'bp_usage_events' as table_name,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bp_usage_events') as exists;

-- Success message
SELECT 'Migration completed successfully!' as status;