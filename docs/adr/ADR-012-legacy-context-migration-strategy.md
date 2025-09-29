---
type: architecture
status: implemented
decision_date: 2025-08-05
tags: [migration, context, database, legacy]
related: [ADR-009-serverless-first-mvp-architecture.md, SPRINT-003-20250804-serverless-migration-best-practices.md]
priority: critical
audience: [developer, architect]
estimated_read: 8-min
---

# ADR-012: Legacy Context Migration Strategy

## Status
Implemented

## Context
Ginko's legacy context system stored session data as JSON files in `.contextmcp/sessions/` with a Socket.IO server for real-time updates. With the serverless migration (ADR-009), we needed to:
- Preserve 14 legacy sessions containing valuable development context
- Migrate from file-based to database-backed storage
- Deprecate the Socket.IO server running on port 3031
- Ensure zero data loss during migration

## Decision
Implement a phased migration strategy to move legacy sessions to PostgreSQL:

### 1. **Non-Destructive Migration**
```javascript
// Preserve originals, create backups, use checksums
class LegacyContextMigration {
  async createBackup() {
    // Copy all files to backup directory
    // Never modify original files
  }
  
  calculateChecksum(data) {
    // SHA-256 hash for verification
    return crypto.createHash('sha256').update(jsonStr).digest('hex');
  }
}
```

### 2. **Schema Adaptation**
Created simplified sessions table without Supabase dependencies:
```sql
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    quality_score INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### 3. **5-Phase Migration Process**
- **Phase 1**: Discovery & Analysis - Catalog all session files
- **Phase 2**: Pre-Migration Validation - Backup & verify database
- **Phase 3**: Migration Execution - Transform & insert sessions
- **Phase 4**: Verification & Testing - Validate checksums
- **Phase 5**: Cutover & Cleanup - Update configs, stop legacy server

## Implementation Details

### Migration Script Features
- Automatic backup creation before migration
- Checksum generation for each session
- Quality score calculation based on content completeness
- Tag extraction from focus areas and features
- Comprehensive migration report generation

### Data Transformation
```javascript
transformSession(legacy) {
  return {
    title: legacy.currentTask || 'Legacy Session',
    description: legacy.conversationSummary,
    content: {
      // Preserve all original data
      workingDirectory: legacy.workingDirectory,
      keyDecisions: legacy.keyDecisions,
      recentFiles: legacy.recentFiles,
      // Include original IDs for reference
      originalId: legacy.id,
      originalTeamId: legacy.teamId
    },
    quality_score: calculateQualityScore(legacy),
    tags: extractTags(legacy)
  };
}
```

## Results

### Migration Success Metrics
- **Sessions Migrated**: 14/14 (100% success rate)
- **Date Range**: July 30 - August 2, 2025
- **Total Size**: 41.93 KB
- **Migration Time**: < 5 minutes
- **Data Loss**: 0 (verified by checksums)

### Infrastructure Changes
- Stopped Socket.IO server on port 3031
- Updated MCP client config to production endpoint
- Created local PostgreSQL sessions table
- Generated comprehensive migration report

## Consequences

### Positive
- **Data Preservation**: All legacy sessions preserved with checksums
- **Future-Proof**: Database storage enables advanced querying
- **Simplified Architecture**: Removed Socket.IO dependency
- **Audit Trail**: Complete migration report for verification

### Negative
- **Placeholder User IDs**: Requires post-migration update
- **Local Storage**: Sessions in local DB, not production
- **Manual Cleanup**: Legacy files require manual archival

### Neutral
- Migration is reversible with backup files
- Original file structure preserved in JSONB
- Quality scores auto-calculated from content

## Lessons Learned

1. **Non-Destructive First**: Always preserve originals
2. **Checksum Everything**: Essential for verification
3. **Phased Approach**: Reduces risk, enables rollback
4. **Schema Flexibility**: JSONB preserves all original data
5. **Comprehensive Reporting**: Critical for trust

## Future Considerations

- Implement user ID mapping for proper ownership
- Consider production database migration
- Archive legacy files after stability period
- Add session search and filtering capabilities

---

**Migration Command**: `node scripts/migrate-legacy-context.js`  
**Pre-Check Command**: `node scripts/pre-migration-check.js`  
**Report Location**: `.contextmcp/migration-report.json`