/**
 * @fileType: guide
 * @status: current
 * @updated: 2025-11-07
 * @tags: [documentation, migration, sync, local-to-cloud]
 * @related: [USER-GUIDE.md, CLI-REFERENCE.md]
 * @priority: high
 * @complexity: medium
 */

# Migration Guide: Local Files to Cloud Knowledge Graph

This guide helps you migrate existing local knowledge files (ADRs, PRDs, context modules) to Ginko's cloud knowledge graph.

---

## Table of Contents

1. [Overview](#overview)
2. [Before You Migrate](#before-you-migrate)
3. [Migration Strategies](#migration-strategies)
4. [Using `ginko knowledge sync`](#using-ginko-knowledge-sync)
5. [Manual Migration](#manual-migration)
6. [Conflict Resolution](#conflict-resolution)
7. [Post-Migration](#post-migration)
8. [Rollback Procedures](#rollback-procedures)
9. [Best Practices](#best-practices)

---

## Overview

### What Gets Migrated?

The migration process converts local markdown files into cloud knowledge nodes:

**Supported File Types:**
- Architecture Decision Records (ADRs)
- Product Requirements Documents (PRDs)
- Context Modules (patterns, gotchas, insights)
- Session logs
- Code file metadata

**What's Preserved:**
- ✅ Title and content
- ✅ Tags (from frontmatter or filename)
- ✅ Status (from frontmatter)
- ✅ Creation/update dates (from frontmatter or git)
- ✅ Author information (from git)

**What's Generated:**
- 🆕 Vector embeddings (for semantic search)
- 🆕 Unique node IDs
- 🆕 Relationship suggestions (based on similarity)

### Why Migrate?

**Benefits of Cloud Knowledge Graph:**
- **Semantic Search** - Find knowledge by meaning, not just keywords
- **Team Collaboration** - Share knowledge across your team automatically
- **Never Lose Context** - Cloud backup + versioning
- **Public Discovery** - Share open-source knowledge with the community
- **AI Integration** - Context-aware queries for better AI assistance

---

## Before You Migrate

### 1. Take Inventory

Understand what you have:

```bash
# Count ADRs
find docs/adr -name "*.md" | wc -l

# Count PRDs
find docs/prd -name "*.md" | wc -l

# List all markdown files
find . -name "*.md" -type f
```

### 2. Backup Your Files

Always backup before migration:

```bash
# Create backup
tar -czf knowledge-backup-$(date +%Y%m%d).tar.gz docs/

# Verify backup
tar -tzf knowledge-backup-*.tar.gz
```

### 3. Clean Up Files

Fix issues before migration:

**Common Issues:**
- Missing titles (add H1 header: `# Title`)
- Inconsistent frontmatter
- Duplicate files
- Non-markdown files mixed in

**Example Cleanup:**
```bash
# Find files without H1 titles
grep -L "^# " docs/adr/*.md

# Find files without frontmatter
grep -L "^---" docs/adr/*.md

# Find duplicates by title
find docs/adr -name "*.md" -exec grep -H "^# " {} \; | sort
```

### 4. Standardize Frontmatter

Ginko recognizes these frontmatter fields:

```markdown
---
title: Use PostgreSQL for Primary Database
status: accepted
tags: [database, architecture]
created: 2025-10-15
updated: 2025-11-07
author: alice@example.com
---

# Use PostgreSQL for Primary Database

Content goes here...
```

**Optional but Recommended:**
```bash
# Add frontmatter to files that lack it
# (Manual process or script)
```

### 5. Authenticate and Setup Project

```bash
# Login
ginko login

# Create project (if not exists)
ginko project create my-app --repo=github.com/yourname/my-app

# Verify active project
ginko project list
```

---

## Migration Strategies

Choose the strategy that fits your needs:

### Strategy 1: Incremental Migration (Recommended)

Migrate in small batches, validate each batch.

**Best For:**
- Large knowledge bases (>50 files)
- Critical knowledge that needs validation
- Teams actively using local files

**Process:**
1. Migrate ADRs first (most critical)
2. Validate and fix issues
3. Migrate PRDs second
4. Validate and fix issues
5. Migrate context modules last
6. Final validation

### Strategy 2: Bulk Migration

Migrate everything at once.

**Best For:**
- Small knowledge bases (<50 files)
- Well-organized files with consistent structure
- Fresh starts (new projects)

**Process:**
1. Dry-run preview
2. Bulk sync all files
3. Validate post-migration
4. Fix issues

### Strategy 3: Selective Migration

Only migrate specific files.

**Best For:**
- Archiving old knowledge (keep active only)
- Public vs private separation
- Testing migration process

**Process:**
1. Identify files to migrate
2. Create filtered list
3. Migrate selected files
4. Maintain local files for non-migrated content

---

## Using `ginko knowledge sync`

### Basic Sync

**Dry Run (Preview):**
```bash
ginko knowledge sync docs/adr/ --type ADR --dry-run
```

**Output:**
```
🔍 Scanning: docs/adr/

Found 23 markdown files:
  ✅ ADR-001-use-postgresql.md → Will create
  ✅ ADR-002-graphql-api.md → Will create
  ⚠️  ADR-003-neo4j-graph.md → Already exists (use --force to overwrite)
  ✅ ADR-004-voyage-embeddings.md → Will create
  ...

Summary:
  - Will create: 20 nodes
  - Will skip (duplicates): 3 nodes
  - Total: 23 files

Run without --dry-run to sync.
```

**Actual Sync:**
```bash
ginko knowledge sync docs/adr/ --type ADR
```

**Output:**
```
🔄 Syncing: docs/adr/

Creating nodes...
  ✅ ADR-001-use-postgresql.md → Created (adr_abc123)
  ✅ ADR-002-graphql-api.md → Created (adr_def456)
  ⏭️  ADR-003-neo4j-graph.md → Skipped (duplicate)
  ✅ ADR-004-voyage-embeddings.md → Created (adr_ghi789)
  ...

Summary:
  - Created: 20 nodes
  - Skipped: 3 nodes
  - Errors: 0
  - Duration: 12s

✨ Sync complete!
```

### Advanced Sync Options

**Force Overwrite Duplicates:**
```bash
ginko knowledge sync docs/adr/ --type ADR --force
```

**Custom File Pattern:**
```bash
# Only sync files matching pattern
ginko knowledge sync docs/ --type ContextModule --pattern "**/*.context.md"
```

**Sync Multiple Directories:**
```bash
# Sync ADRs
ginko knowledge sync docs/adr/ --type ADR

# Sync PRDs
ginko knowledge sync docs/prd/ --type PRD

# Sync modules
ginko knowledge sync docs/patterns/ --type ContextModule
```

### How Sync Works

**1. File Discovery**
- Scans directory for markdown files
- Applies glob pattern filter
- Excludes hidden files and directories

**2. Content Parsing**
- Extracts frontmatter (if present)
- Parses markdown content
- Identifies H1 as title (if no frontmatter title)
- Extracts tags from frontmatter or filename

**3. Duplicate Detection**
- Checks for existing nodes with same title
- Compares content hash (if --force not used)
- Skips duplicates unless --force specified

**4. Node Creation**
- Creates knowledge node via API
- Generates vector embeddings
- Indexes content for search
- Returns node ID

**5. Error Handling**
- Retries failed requests (3 attempts)
- Logs errors with file path
- Continues on errors (doesn't halt sync)
- Reports summary at end

---

## Manual Migration

For fine-grained control, migrate files manually:

### Single File Migration

```bash
# Read file content
CONTENT=$(cat docs/adr/ADR-001-postgres.md)

# Create node
ginko knowledge create \
  --type ADR \
  --title "Use PostgreSQL for Primary Database" \
  --content "$CONTENT" \
  --tags database,architecture \
  --status accepted
```

### Script-Based Migration

**Example Script: `migrate-adrs.sh`**

```bash
#!/bin/bash

# Migrate all ADRs from docs/adr/ to cloud

for file in docs/adr/*.md; do
  echo "Migrating: $file"

  # Extract title from H1
  title=$(grep -m 1 "^# " "$file" | sed 's/^# //')

  # Read content
  content=$(cat "$file")

  # Extract tags from filename (e.g., ADR-001-postgres.md → postgres)
  filename=$(basename "$file" .md)
  tags="${filename#*-*-}"  # Remove "ADR-001-" prefix
  tags=$(echo "$tags" | tr '-' ',')  # Convert hyphens to commas

  # Create node
  ginko knowledge create \
    --type ADR \
    --title "$title" \
    --content "$content" \
    --tags "$tags" \
    --status accepted

  # Wait to avoid rate limiting
  sleep 0.5
done

echo "✨ Migration complete!"
```

**Run Script:**
```bash
chmod +x migrate-adrs.sh
./migrate-adrs.sh
```

---

## Conflict Resolution

### Handling Duplicates

**Scenario:** Node with same title already exists

**Options:**

**1. Skip Duplicate (Default)**
```bash
ginko knowledge sync docs/adr/ --type ADR
# Skips existing nodes, creates new ones
```

**2. Overwrite Duplicate**
```bash
ginko knowledge sync docs/adr/ --type ADR --force
# Updates existing nodes with local content
```

**3. Rename and Keep Both**
```bash
# Manually rename local file
mv docs/adr/ADR-001-postgres.md docs/adr/ADR-001-postgres-v2.md

# Sync with new name
ginko knowledge sync docs/adr/ --type ADR
```

**4. Manual Merge**
```bash
# 1. Fetch existing node
curl "https://app.ginkoai.com/api/v1/knowledge/nodes/adr_abc123?graphId=graph_xyz" \
  -H "Authorization: Bearer $GINKO_API_KEY" > existing.json

# 2. Compare with local file
diff existing.json docs/adr/ADR-001-postgres.md

# 3. Manually merge changes
# 4. Update node via API or --force sync
```

### Content Conflicts

**Scenario:** Local file updated since migration

**Best Practice:**
1. Always use version control (git)
2. Maintain local files as source of truth during migration
3. After migration, use cloud as source of truth
4. Use `ginko knowledge sync --force` to push local changes

---

## Post-Migration

### 1. Validate Migration

**Check Node Count:**
```bash
# Expected: Should match file count
ginko knowledge search "" --limit 1000 --threshold 0 | grep "Found"
```

**Spot Check Random Nodes:**
```bash
ginko knowledge search "database" --table
ginko knowledge search "authentication" --table
ginko knowledge search "api" --table
```

**Verify Specific Nodes:**
```bash
# Get node by ID (from sync output)
curl "https://app.ginkoai.com/api/v1/knowledge/nodes/adr_abc123?graphId=graph_xyz" \
  -H "Authorization: Bearer $GINKO_API_KEY" | jq
```

### 2. Test Search

**Semantic Search:**
```bash
ginko knowledge search "database choice"
# Should return PostgreSQL ADR
```

**Tag Search:**
```bash
ginko knowledge search "database" --type ADR
```

**Graph Visualization:**
```bash
# Get node ID from search
ginko knowledge graph <node-id>
```

### 3. Setup Team Access

**Invite Team Members:**
```bash
ginko project add-member alice@example.com --role editor
ginko project add-member bob@example.com --role editor
```

**Create Teams:**
```bash
ginko team create backend-team
ginko team add-member backend-team alice@example.com
ginko team add-to-project backend-team my-app --role editor
```

### 4. Update Workflows

**Replace Local References:**

**Before:**
```bash
# Old workflow
grep -r "authentication" docs/adr/
```

**After:**
```bash
# New workflow
ginko knowledge search "authentication" --type ADR
```

**Update Documentation:**
- Update README with Ginko commands
- Document new knowledge creation workflow
- Share with team

### 5. Archive or Remove Local Files

**Option 1: Keep as Backup**
```bash
# Move to archive directory
mkdir -p docs/archive
mv docs/adr docs/archive/adr-backup-$(date +%Y%m%d)
```

**Option 2: Remove (if fully migrated)**
```bash
# Only after validation!
rm -rf docs/adr
git commit -m "Migrated ADRs to cloud knowledge graph"
```

**Option 3: Keep as Source**
```bash
# Continue maintaining local files
# Sync periodically with --force
ginko knowledge sync docs/adr/ --type ADR --force
```

---

## Rollback Procedures

### If Migration Fails

**1. Restore from Backup:**
```bash
# Extract backup
tar -xzf knowledge-backup-20251107.tar.gz
```

**2. Delete Migrated Nodes (if needed):**
```bash
# Use API to bulk delete nodes created during migration
# (Filter by creation date)
```

**3. Fix Issues and Re-Migrate:**
```bash
# Fix file issues
# Re-run sync with --dry-run first
ginko knowledge sync docs/adr/ --type ADR --dry-run
```

### If Data Lost

**Disaster Recovery:**
1. Restore local backup
2. Check git history for deleted files
3. Contact support: chris@watchhill.ai

---

## Best Practices

### 1. Migrate During Low Activity

- Choose quiet time (weekend, evening)
- Notify team of migration window
- Expect ~10 minutes per 100 files

### 2. Test with Small Batch First

```bash
# Create test directory
mkdir test-migration
cp docs/adr/ADR-001* test-migration/

# Test sync
ginko knowledge sync test-migration/ --type ADR --dry-run
ginko knowledge sync test-migration/ --type ADR

# Validate
ginko knowledge search "test"

# Clean up test nodes if needed
```

### 3. Use Version Control

```bash
# Commit before migration
git add .
git commit -m "Pre-migration snapshot"

# Tag release
git tag pre-cloud-migration

# Push
git push origin main --tags
```

### 4. Document Custom Fields

If you have custom frontmatter fields:

```markdown
---
title: My ADR
custom_field: custom_value  # Not supported by Ginko
---
```

**Solution:** Map to supported fields or add to content:

```bash
# Add custom fields to content
echo "\n\n## Metadata\n- Custom Field: custom_value" >> file.md
```

### 5. Maintain Change Log

Create migration log:

**`MIGRATION-LOG.md`:**
```markdown
# Migration Log

## 2025-11-07: ADRs Migrated
- Migrated 23 ADRs from docs/adr/
- Created nodes: adr_abc123, adr_def456, ...
- Skipped duplicates: 3
- Errors: 0

## 2025-11-08: PRDs Migrated
- Migrated 15 PRDs from docs/prd/
- Created nodes: prd_ghi789, ...
- Errors: 0
```

### 6. Gradual Adoption

Don't force immediate switch:

**Phase 1: Parallel (2 weeks)**
- Maintain both local and cloud
- Team learns cloud workflows
- Sync local→cloud regularly

**Phase 2: Cloud-First (2 weeks)**
- Create new knowledge in cloud
- Reference cloud for searches
- Keep local as backup

**Phase 3: Cloud-Only (ongoing)**
- Archive local files
- All knowledge in cloud
- Sync from cloud→local (reverse) if needed

---

## Troubleshooting

### "Duplicate node" errors

**Cause:** Node with same title exists

**Fix:**
- Use `--force` to overwrite
- Or rename local file

### "Authentication failed"

**Cause:** API key invalid or expired

**Fix:**
```bash
ginko login --force
```

### "Rate limit exceeded"

**Cause:** Too many requests in short time

**Fix:**
- Add delays between syncs: `sleep 1`
- Use smaller batches
- Contact support for higher limits

### "Invalid content format"

**Cause:** Markdown parsing error

**Fix:**
- Check file encoding (should be UTF-8)
- Remove special characters
- Validate markdown syntax

### "File not found" during sync

**Cause:** File path issue

**Fix:**
```bash
# Use absolute paths
ginko knowledge sync /full/path/to/docs/adr/ --type ADR

# Or cd to directory first
cd /path/to/docs
ginko knowledge sync adr/ --type ADR
```

---

## Getting Help

- **Migration Support:** chris@watchhill.ai
- **User Guide:** [USER-GUIDE.md](./USER-GUIDE.md)
- **CLI Reference:** [CLI-REFERENCE.md](./CLI-REFERENCE.md)
- **GitHub Issues:** https://github.com/chrispangg/ginko/issues

---

## Summary Checklist

- [ ] Inventory existing knowledge files
- [ ] Backup all files
- [ ] Clean up and standardize files
- [ ] Authenticate with `ginko login`
- [ ] Create/verify project
- [ ] Test sync with small batch
- [ ] Dry-run full migration
- [ ] Execute full migration
- [ ] Validate all nodes migrated
- [ ] Test search functionality
- [ ] Setup team access
- [ ] Update team workflows
- [ ] Archive or remove local files
- [ ] Document migration

**Congratulations!** Your knowledge is now in the cloud. Next: Explore [semantic search](./USER-GUIDE.md#search--discovery) and [team collaboration](./USER-GUIDE.md#team-collaboration) features.
