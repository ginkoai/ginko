# Scripts Development Guide - Automation & Utilities

## Overview
This directory contains **Ginko automation scripts** for database management, deployment preparation, testing, and development utilities.

**Purpose**: Streamline common development tasks, database operations, and system maintenance through reusable automation.

## Architecture Patterns

### Core Design Principles
- **Production-Ready Scripts**: Safe for use against production systems
- **Database-First Operations**: Scripts handle both connected and fallback scenarios
- **Error Handling**: Robust error checking and rollback capabilities
- **Documentation Integration**: Scripts that support documentation workflows

### Key Files & Structure
```
scripts/
├── prepare-api.sh                          # API deployment preparation
├── create-test-users.js                    # Production test user setup
├── create-adr.sh                          # Architecture Decision Record creation
├── generate-embeddings.ts                  # Generate Voyage AI embeddings (ADR-045 Phase 2)
├── generate-similarity-relationships.ts    # Generate typed similarity relationships (ADR-045 Phase 4)
├── migrate-best-practices.js               # Best practices migration
├── migrate-legacy-context.js               # Legacy context migration
├── seed-ai-best-practices.js               # AI best practices seeding
├── test-ai-attribution.js                  # AI attribution testing
└── pre-migration-check.js                 # Migration safety checks
```

## Script Categories

### 1. Deployment & Build Scripts
```bash
# prepare-api.sh - API deployment preparation
#!/bin/bash
echo "Preparing API for deployment..."
# Copies compiled libraries to API directory
# Ensures Vercel deployment has all dependencies
```

### 2. Database Operations
```javascript
// create-test-users.js - Production test user creation
const { createClient } = require('@supabase/supabase-js');

async function createTestUsers() {
  // Creates test users with predictable UUIDs
  // UUID: 000...002 (E2E testing)
  // UUID: 000...004 (development testing)
}
```

### 3. Migration & Setup Scripts
```javascript
// migrate-best-practices.js - Best practices data migration
async function migrateBestPractices() {
  // Migrates best practices data between systems
  // Handles both database and in-memory scenarios
}
```

### 4. Development Utilities
```bash
# create-adr.sh - ADR creation automation
#!/bin/bash
DOCS_DIR="docs/reference/architecture"
# Creates new Architecture Decision Record
# Updates ADR index and documentation
```

### 5. Embedding & Similarity Scripts (ADR-045)
```typescript
// generate-embeddings.ts - Generate Voyage AI embeddings
// Batch processes knowledge nodes to generate 1024-dim embeddings
// Usage: npm run embeddings:generate

// generate-similarity-relationships.ts - Create typed similarity relationships
// Uses multi-layer filtering to prevent over-connected graphs
// Usage: npm run similarity:generate
// Options: --min-score 0.75 --top-k 10 --project-id my-project --resume
```

## Development Patterns

### 1. Database-Safe Operations
```javascript
// Pattern for database operations
const db = await initializeDatabase();

if (db.isConnected()) {
  console.log('[DB] Using PostgreSQL connection');
  // Execute database operations
} else {
  console.log('[DB] Using in-memory fallback');
  // Handle fallback scenario
}
```

### 2. Error Handling & Rollback
```javascript
// Robust error handling pattern
async function safeOperation() {
  const rollbackActions = [];
  
  try {
    // Perform operations
    rollbackActions.push(() => undoAction());
  } catch (error) {
    console.error('[ERROR] Operation failed:', error);
    // Execute rollback actions
    for (const rollback of rollbackActions.reverse()) {
      await rollback();
    }
    throw error;
  }
}
```

### 3. Production-Safe Execution
```javascript
// Production safety checks
if (process.env.NODE_ENV === 'production') {
  console.log('[PROD] Running in production mode');
  // Additional safety checks
}
```

## Key Scripts Reference

### prepare-api.sh
**Purpose**: Prepares API directory for Vercel deployment
**Usage**: `bash scripts/prepare-api.sh`
**What it does**:
- Copies compiled TypeScript from `_lib/` directories
- Ensures all dependencies are available for serverless deployment
- Updates file permissions and directory structure

### create-test-users.js
**Purpose**: Creates test users in production Supabase auth
**Usage**: `node scripts/create-test-users.js`
**What it creates**:
- UUID `000...002`: E2E testing user
- UUID `000...004`: Development testing user
- Proper authentication entries for MCP server testing

### create-adr.sh
**Purpose**: Creates new Architecture Decision Records
**Usage**: `bash scripts/create-adr.sh "ADR Title"`
**What it does**:
- Creates new ADR file in `docs/reference/architecture/`
- Updates ADR index documentation
- Follows ADR naming and numbering conventions

### migrate-best-practices.js
**Purpose**: Migrates best practices data between systems
**Usage**: `node scripts/migrate-best-practices.js`
**Safety features**:
- Pre-migration validation
- Rollback capabilities
- Production database safe operations

### generate-embeddings.ts
**Purpose**: Generate Voyage AI embeddings for knowledge nodes (ADR-045 Phase 2)
**Usage**: `npm run embeddings:generate` or `npx tsx scripts/generate-embeddings.ts`
**What it does**:
- Batch processes knowledge nodes without embeddings
- Generates 1024-dim vectors using Voyage AI voyage-3.5
- Saves embeddings to Neo4j with metadata
- Checkpoint/resume capability every 100 nodes
**Options**: `--batch-size 128 --limit 1000 --resume`
**Guide**: See `scripts/GENERATE-EMBEDDINGS-GUIDE.md`

### generate-similarity-relationships.ts
**Purpose**: Create typed similarity relationships between nodes (ADR-045 Phase 4)
**Usage**: `npm run similarity:generate` or `npx tsx scripts/generate-similarity-relationships.ts`
**What it does**:
- Uses multi-layer filtering to find similar nodes (Top-K, score thresholds)
- Creates typed relationships (DUPLICATE_OF, HIGHLY_RELATED_TO, RELATED_TO)
- Quality gate: skips nodes with avg similarity < 0.80
- Validates relationship quality (5-15 rels/node, >0.80 avg score)
**Options**: `--min-score 0.75 --top-k 10 --project-id my-project --resume`
**Guide**: See `scripts/GENERATE-SIMILARITY-RELATIONSHIPS-GUIDE.md`

## Testing & Debugging

### Script Testing
⚠️ **Note**: Scripts are designed to work safely against production systems.

```bash
# Test deployment preparation
bash scripts/prepare-api.sh

# Verify test user creation (safe to re-run)
node scripts/create-test-users.js

# Test ADR creation
bash scripts/create-adr.sh "Test ADR"
```

### Debugging Tips
- **Database connections**: Scripts handle both connected/fallback scenarios
- **Error logging**: All scripts include comprehensive error logging
- **Rollback safety**: Database operations include rollback mechanisms
- **Production checks**: Scripts validate environment before operations

## Common Tasks

### Adding New Scripts
1. **Create script file** with appropriate extension (`.sh`, `.js`)
2. **Follow error handling patterns** from existing scripts
3. **Add database safety checks** for production operations
4. **Document usage** in this CLAUDE.md file

### Database Migrations
1. **Use pre-migration checks**: Run `pre-migration-check.js` first
2. **Test against fallback**: Ensure script works without database
3. **Implement rollback**: Include undo operations for safety
4. **Validate results**: Check migration success before completing

### Deployment Automation
1. **API preparation**: Run `prepare-api.sh` before deployment
2. **Test user setup**: Ensure test users exist for E2E testing
3. **Verify connectivity**: Test MCP server and dashboard connectivity
4. **Monitor logs**: Check Vercel logs for deployment success

## Integration Points

### With API Development
- **prepare-api.sh**: Critical for Vercel deployments
- **Test users**: Required for API authentication testing
- **Database scripts**: Support API database operations

### With Documentation
- **create-adr.sh**: Maintains architecture documentation
- **Documentation updates**: Scripts update docs when needed
- **Index maintenance**: Keeps documentation indexes current

### With Database Systems
- **Migration scripts**: Handle Supabase database operations
- **Fallback support**: Work with in-memory fallback systems
- **Safety checks**: Validate database state before operations

## Environment Requirements

### Node.js Scripts
- **Node.js**: v18+ for compatibility with MCP SDK
- **Dependencies**: Use project's shared dependencies
- **Environment variables**: Access to Supabase credentials

### Shell Scripts  
- **Bash**: Compatible with macOS/Linux environments
- **File permissions**: Execute permissions on `.sh` files
- **Directory access**: Write access to docs and build directories

---

**Quick Reference**:
- **Prepare API**: `bash scripts/prepare-api.sh`
- **Create test users**: `node scripts/create-test-users.js`
- **New ADR**: `bash scripts/create-adr.sh "Title"`
- **Check migrations**: `node scripts/pre-migration-check.js`
- **Migrate practices**: `node scripts/migrate-best-practices.js`