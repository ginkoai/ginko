-- Migration: Clean up orphaned e2e test teams
-- Task: adhoc_260117_s01_t14
-- Purpose: Remove test teams created during e2e testing that clutter the team list
--
-- This migration deletes teams where:
-- 1. Name contains 'e2e', 'test', or 'uat' (case insensitive)
-- 2. OR graph_id contains 'e2e', 'test', or 'uat' (case insensitive)
--
-- Note: team_members rows will be cascade deleted due to FK constraint

-- First, identify teams to be deleted (for logging/verification)
-- SELECT id, name, graph_id, created_at
-- FROM teams
-- WHERE
--   LOWER(name) LIKE '%e2e%'
--   OR LOWER(name) LIKE '%test%'
--   OR LOWER(name) LIKE '%uat%'
--   OR LOWER(COALESCE(graph_id, '')) LIKE '%e2e%'
--   OR LOWER(COALESCE(graph_id, '')) LIKE '%test%'
--   OR LOWER(COALESCE(graph_id, '')) LIKE '%uat%';

-- Delete orphaned e2e/test teams
DELETE FROM teams
WHERE
  LOWER(name) LIKE '%e2e%'
  OR LOWER(name) LIKE '%test%'
  OR LOWER(name) LIKE '%uat%'
  OR LOWER(COALESCE(graph_id, '')) LIKE '%e2e%'
  OR LOWER(COALESCE(graph_id, '')) LIKE '%test%'
  OR LOWER(COALESCE(graph_id, '')) LIKE '%uat%';
