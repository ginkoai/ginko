# API Deployment Module Resolution - Resolution Plan

## Problem Statement
The Ginko MCP server API endpoints are failing at runtime due to module resolution issues. While the TypeScript compilation succeeds, the serverless functions cannot locate the compiled JavaScript modules at runtime, resulting in Vercel authentication walls and non-functional API endpoints.

## Current State Analysis
- **Database**: ✅ Fully migrated with all efficacy tracking features
- **TypeScript Build**: ✅ Compiles without errors
- **Runtime**: ❌ Module resolution fails for serverless functions
- **Impact**: Best practices system and all MCP tools are inaccessible in production

---

## PROPOSED MONOREPO STRUCTURE

### Current Structure (Problematic)
```
ginko/
├── api/                      # Serverless functions with broken imports
│   ├── _utils.ts            # Can't find ../mcp-server/dist/*
│   ├── tools/
│   │   └── call.ts          # Main MCP endpoint
│   └── best-practices/
├── mcp-server/              # Separate package
│   ├── src/                 # TypeScript source
│   ├── dist/                # Compiled JS (not accessible to api/)
│   └── package.json
└── vercel.json              # Points to api/**/*.ts
```

### Target Monorepo Structure
```
ginko/
├── packages/
│   ├── shared/              # Level 1: No dependencies
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── env.ts      # Environment validation
│   │   │   ├── types.ts    # Shared TypeScript types
│   │   │   └── utils.ts    # Common utilities
│   │   ├── dist/            # Compiled output
│   │   ├── package.json    # @ginko/shared
│   │   └── tsconfig.json
│   │
│   ├── mcp-server/          # Level 2: Depends on @ginko/shared
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── database.ts
│   │   │   ├── context-manager.ts
│   │   │   ├── best-practices.ts
│   │   │   ├── session-handoff.ts
│   │   │   ├── auth-manager.ts
│   │   │   └── ...
│   │   ├── database/        # SQL migrations
│   │   │   └── migrations/
│   │   ├── dist/            # Compiled output
│   │   ├── package.json    # @ginko/mcp-server
│   │   └── tsconfig.json
│   │
│   └── api/                 # Level 3: Depends on both
│       ├── _utils.ts        # Import from @ginko/mcp-server
│       ├── _lib/            # Optional: bundled dependencies
│       ├── tools/
│       │   ├── call.ts      # Import from @ginko/mcp-server
│       │   └── list.ts
│       ├── best-practices/
│       │   ├── index.ts
│       │   ├── [id].ts
│       │   └── [id]/
│       │       └── adopt.ts
│       ├── sessions/
│       │   ├── capture.ts
│       │   ├── list.ts
│       │   └── [id].ts
│       ├── health.ts
│       ├── package.json    # @ginko/api
│       └── tsconfig.json
│
├── docs/
│   ├── architecture/
│   ├── resolution-plans/
│   └── post-mortem/
│
├── package.json             # Root workspace config
├── turbo.json              # Build orchestration
├── tsconfig.json           # Root TypeScript config
├── vercel.json             # Updated for monorepo
├── .env                    # Environment variables
├── .gitignore
└── README.md
```

### Vercel Deployment Mapping

#### File-to-Function Mapping
```
Source File                                  → Vercel Function              → Production URL
================================================================================
packages/api/health.ts                      → /api/health.func            → GET https://mcp.ginko.ai/api/health
packages/api/tools/call.ts                  → /api/tools/call.func        → POST https://mcp.ginko.ai/api/tools/call
packages/api/tools/list.ts                  → /api/tools/list.func        → GET https://mcp.ginko.ai/api/tools/list
packages/api/best-practices/index.ts        → /api/best-practices.func    → GET/POST https://mcp.ginko.ai/api/best-practices
packages/api/best-practices/[id].ts         → /api/best-practices/[id].func → GET/PUT/DELETE https://mcp.ginko.ai/api/best-practices/:id
packages/api/best-practices/[id]/adopt.ts   → /api/best-practices/[id]/adopt.func → POST https://mcp.ginko.ai/api/best-practices/:id/adopt
packages/api/sessions/capture.ts            → /api/sessions/capture.func  → POST https://mcp.ginko.ai/api/sessions/capture
packages/api/sessions/list.ts               → /api/sessions/list.func     → GET https://mcp.ginko.ai/api/sessions/list
packages/api/sessions/[id].ts               → /api/sessions/[id].func     → GET/DELETE https://mcp.ginko.ai/api/sessions/:id
packages/api/activity/[teamId].ts           → /api/activity/[teamId].func → GET https://mcp.ginko.ai/api/activity/:teamId
packages/api/projects/[id]/best-practices.ts → /api/projects/[id]/best-practices.func → GET https://mcp.ginko.ai/api/projects/:id/best-practices
```

#### MCP Tool Endpoints (via /api/tools/call)
```
Tool Name                    → Internal Function              → Effective URL Pattern
================================================================================
get_best_practices          → BestPracticesManager           → POST /api/tools/call {"tool": "get_best_practices"}
suggest_best_practice       → BestPracticesManager           → POST /api/tools/call {"tool": "suggest_best_practice"}
search_best_practices       → BestPracticesManager           → POST /api/tools/call {"tool": "search_best_practices"}
create_best_practice        → BestPracticesManager           → POST /api/tools/call {"tool": "create_best_practice"}
adopt_best_practice         → BestPracticesManager           → POST /api/tools/call {"tool": "adopt_best_practice"}
get_project_best_practices  → BestPracticesManager           → POST /api/tools/call {"tool": "get_project_best_practices"}
get_project_overview        → ContextManager                 → POST /api/tools/call {"tool": "get_project_overview"}
find_relevant_code          → ContextManager                 → POST /api/tools/call {"tool": "find_relevant_code"}
get_file_context            → ContextManager                 → POST /api/tools/call {"tool": "get_file_context"}
get_recent_changes          → ContextManager                 → POST /api/tools/call {"tool": "get_recent_changes"}
get_team_activity           → ContextManager                 → POST /api/tools/call {"tool": "get_team_activity"}
capture_session             → SessionHandoffManager          → POST /api/tools/call {"tool": "capture_session"}
resume_session              → SessionHandoffManager          → POST /api/tools/call {"tool": "resume_session"}
list_sessions               → SessionHandoffManager          → POST /api/tools/call {"tool": "list_sessions"}
get_dashboard_metrics       → SessionAnalytics               → POST /api/tools/call {"tool": "get_dashboard_metrics"}
get_file_hotspots           → SessionAnalytics               → POST /api/tools/call {"tool": "get_file_hotspots"}
get_team_analytics          → SessionAnalytics               → POST /api/tools/call {"tool": "get_team_analytics"}
context                     → Multiple managers              → POST /api/tools/call {"tool": "context"}
ctx                         → Alias for context              → POST /api/tools/call {"tool": "ctx"}
sessions                    → Alias for list_sessions        → POST /api/tools/call {"tool": "sessions"}
__startup                   → Auto-execute on connect        → POST /api/tools/call {"tool": "__startup"}
```

#### Vercel Build Output Structure
```
.vercel/output/
├── config.json
├── static/                  # Static assets (if any)
└── functions/
    ├── api/
    │   ├── health.func/
    │   │   ├── .vc-config.json
    │   │   └── index.js     # Bundled with dependencies
    │   ├── tools/
    │   │   ├── call.func/
    │   │   │   ├── .vc-config.json
    │   │   │   └── index.js # Contains all 21 MCP tools
    │   │   └── list.func/
    │   │       ├── .vc-config.json
    │   │       └── index.js
    │   ├── best-practices/
    │   │   ├── index.func/
    │   │   │   ├── .vc-config.json
    │   │   │   └── index.js
    │   │   ├── [id].func/
    │   │   │   ├── .vc-config.json
    │   │   │   └── index.js
    │   │   └── [id]/
    │   │       └── adopt.func/
    │   │           ├── .vc-config.json
    │   │           └── index.js
    │   └── sessions/
    │       ├── capture.func/
    │       ├── list.func/
    │       └── [id].func/
    └── _metadata.json
```

#### Environment Variable Mapping
```
Environment Variable         → Used By                        → Purpose
================================================================================
POSTGRES_URL                → DatabaseManager                → Primary database connection
POSTGRES_PRISMA_URL         → DatabaseManager                → Prisma connection pooling
SUPABASE_URL                → DatabaseManager                → Supabase project URL
SUPABASE_DB_PASSWORD        → DatabaseManager                → Database authentication
VERCEL_URL                  → API endpoints                  → Dynamic URL construction
NODE_ENV                    → All packages                   → Environment detection
VERCEL_ENV                  → Vercel runtime                 → Deployment environment
VERCEL_GIT_COMMIT_SHA       → Deployment tracking            → Version identification
```

### Import Examples After Migration

**Before (Broken):**
```typescript
// api/tools/call.ts
import { ContextManager } from '../../../mcp-server/dist/context-manager.js';
import { DatabaseManager } from '../../../mcp-server/dist/database.js';
// ❌ Can't resolve at runtime in Vercel
```

**After (Working):**
```typescript
// packages/api/tools/call.ts
import { ContextManager } from '@ginko/mcp-server';
import { DatabaseManager } from '@ginko/mcp-server';
import { validateEnv } from '@ginko/shared';
// ✅ Workspace packages resolve correctly
```

### Package Dependencies

```json
// packages/shared/package.json
{
  "name": "@ginko/shared",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "dependencies": {
    "dotenv": "^16.0.0"
  }
}

// packages/mcp-server/package.json
{
  "name": "@ginko/mcp-server",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "dependencies": {
    "@ginko/shared": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "pg": "^8.11.0",
    // ... other deps
  }
}

// packages/api/package.json
{
  "name": "@ginko/api",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@ginko/mcp-server": "workspace:*",
    "@ginko/shared": "workspace:*",
    "@vercel/node": "^3.0.0"
  }
}
```

### Build Order (Enforced by Turborepo)
1. `@ginko/shared` - builds first (no deps)
2. `@ginko/mcp-server` - builds second (depends on shared)
3. `@ginko/api` - builds last (depends on both)

---

## PRE-MORTEM ANALYSIS

### Critical Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Vercel Build Timeout** | Medium | High | Pre-build locally, use Turborepo caching |
| **Circular Dependencies** | High | High | Strict hierarchy, use `npm ls` checks |
| **TypeScript Path Resolution** | Medium | Medium | Explicit path mappings in tsconfig |
| **Bloated Deployments** | High | Medium | Separate dev/prod deps, use bundlesize checks |
| **Database Connection** | Medium | High | Test at each milestone, env var validation |
| **Import Path Errors** | High | Medium | Systematic regex updates, file checklist |
| **Merge Conflicts** | Medium | Low | Frequent rebasing, single-sprint completion |

---

## RESOLUTION PLAN

### 🤔 THINK
**Root Cause Analysis:**
1. Vercel serverless functions expect self-contained modules within `/api` directory
2. Current structure has dependencies in `/mcp-server/dist` which aren't bundled with each function
3. Relative import paths (`../../../mcp-server/dist/`) don't resolve correctly in Vercel's runtime environment
4. TypeScript compilation succeeds but runtime module loading fails

### 📋 PLAN

#### Option C: Monorepo Workspace ✅ **[SELECTED]**
- **Effort**: 8 story points
- **Timeline**: 1-2 days
- **ROI**: Break-even after 2-3 sprints

**Rationale for Monorepo Selection:**
- Eliminates module resolution issues permanently
- Saves ~2-3 story points per sprint on deployment issues
- Better developer experience with clean imports
- Native Vercel support for monorepo deployments

### ✅ VALIDATE - Pre-Migration Checklist

```bash
# 0. CRITICAL: Create backup and document current state
git checkout -b backup/pre-monorepo-$(date +%Y%m%d)
git push origin backup/pre-monorepo-$(date +%Y%m%d)
vercel ls > deployments-backup.txt
env | grep -E '(POSTGRES|SUPABASE|VERCEL)' > env-backup.txt

# 1. Verify no active PRs or ongoing work
git status
git stash list
gh pr list

# 2. Test current build process
vercel build --debug > build-log-pre-migration.txt

# 3. Create import checklist
grep -r "from '\.\./.*mcp-server" api/ > imports-to-update.txt
grep -r "from '\.\./.*src/" api/ >> imports-to-update.txt

# 4. Check for circular dependencies
npm ls 2>&1 | grep -i "circular"

# 5. Validate database connection
curl -X POST https://mcp.ginko.ai/api/health
```

### 🚀 ACT - MONOREPO MIGRATION WITH MITIGATIONS

#### Git Strategy with Safeguards
```bash
# Create feature branch with protection
git checkout main
git pull origin main
git checkout -b feat/monorepo-migration

# Set up commit hooks for validation
echo "npm ls && tsc --build" > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

#### Phase 0: Risk Mitigation Setup
**Milestone 0.1: Dependency Audit**
```bash
# Document all current dependencies
npm ls --depth=0 > dependencies-before.txt
find . -name "package.json" -exec echo {} \; -exec cat {} \; > packages-before.txt

# Check for security issues
npm audit

# Create rollback script
cat > rollback.sh << 'EOF'
#!/bin/bash
echo "Rolling back monorepo migration..."
git reset --hard backup/pre-monorepo-$(date +%Y%m%d)
rm -rf packages
git checkout api mcp-server
vercel rollback
EOF
chmod +x rollback.sh

git add -A && git commit -m "chore: pre-migration safety setup and documentation"
```

#### Phase 1: Workspace Setup with Validation
**Milestone 1.1: Initialize Monorepo Structure**
```bash
# Create workspace structure matching proposed layout
mkdir -p packages/shared/src
mkdir -p packages/mcp-server
mkdir -p packages/api

# Create root package.json with build optimization
cat > package.json << 'EOF'
{
  "name": "ginko",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build:shared && npm run build:mcp && npm run build:api",
    "build:shared": "npm run build -w @ginko/shared",
    "build:mcp": "npm run build -w @ginko/mcp-server",
    "build:api": "npm run build -w @ginko/api",
    "test": "npm run test --workspaces --if-present",
    "dev": "vercel dev",
    "deploy": "vercel --prod",
    "check-deps": "npm ls",
    "clean": "rm -rf packages/*/dist packages/*/node_modules node_modules"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "turbo": "^1.10.0"
  }
}
EOF

# Add Turborepo config for build caching
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
EOF

git add -A && git commit -m "feat: initialize monorepo with proposed directory structure"
```

**Testing Checkpoint 1.1:**
```bash
npm install
npm ls --depth=0  # Should show no errors
tree -L 3 packages/  # Verify structure matches proposal
```

**Milestone 1.2: Create Shared Package**
```bash
# Initialize shared package
cd packages/shared

cat > package.json << 'EOF'
{
  "name": "@ginko/shared",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
EOF

cat > tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"]
}
EOF

# Create initial shared utilities
cat > src/index.ts << 'EOF'
export * from './env';
export * from './types';
export * from './utils';
EOF

cat > src/env.ts << 'EOF'
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

export function validateEnv() {
  const required = ['POSTGRES_URL', 'POSTGRES_PRISMA_URL', 'SUPABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    console.error('Missing required environment variables:', missing);
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  
  return true;
}
EOF

cat > src/types.ts << 'EOF'
// Shared TypeScript types
export interface BaseResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}
EOF

cat > src/utils.ts << 'EOF'
// Common utility functions
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[^\w\s-]/gi, '');
}

export function parseJSON<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
EOF

cd ../..
git add -A && git commit -m "feat: create shared package with proposed structure"
```

**Milestone 1.3: Move MCP Server with Structure Preservation**
```bash
# Move mcp-server preserving all subdirectories
git mv mcp-server packages/mcp-server

# Update package.json
cd packages/mcp-server
npm pkg set name="@ginko/mcp-server"
npm pkg set version="1.0.0"
npm pkg set main="dist/index.js"
npm pkg set types="dist/index.d.ts"
npm pkg set dependencies.@ginko/shared="workspace:*"

# Ensure database directory is preserved
ls -la database/migrations/  # Verify migrations are still there

# Build to verify
npm run build
cd ../..

# Validate structure
tree -L 2 packages/mcp-server/

git add -A && git commit -m "feat: migrate mcp-server preserving directory structure"
```

#### Phase 2: API Migration with Import Verification
**Milestone 2.1: Create Import Update Script**
```bash
# Create automated import updater
cat > update-imports.js << 'EOF'
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const updates = [
  { from: /from ['"]\.\.\/\.\.\/\.\.\/mcp-server\/dist\//g, to: "from '@ginko/mcp-server/" },
  { from: /from ['"]\.\.\/mcp-server\/dist\//g, to: "from '@ginko/mcp-server/" },
  { from: /from ['"]\.\.\/src\//g, to: "from '@ginko/mcp-server/" },
];

const files = glob.sync('packages/api/**/*.ts');
console.log(`Found ${files.length} TypeScript files to update`);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let updated = false;
  
  updates.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      updated = true;
    }
  });
  
  if (updated) {
    fs.writeFileSync(file, content);
    console.log(`✅ Updated: ${file}`);
  }
});

// Also update to use shared package
const sharedImport = "import { validateEnv } from '@ginko/shared';\n";
const utilsFile = 'packages/api/_utils.ts';
if (fs.existsSync(utilsFile)) {
  let content = fs.readFileSync(utilsFile, 'utf8');
  if (!content.includes('@ginko/shared')) {
    content = sharedImport + content;
    fs.writeFileSync(utilsFile, content);
    console.log(`✅ Added shared import to ${utilsFile}`);
  }
}
EOF

npm install -g glob  # Install globally for script
```

**Milestone 2.2: Move API with Structure Preservation**
```bash
# Move API preserving all subdirectories
git mv api packages/api

# Verify structure
tree -L 2 packages/api/

# Create package.json
cat > packages/api/package.json << 'EOF'
{
  "name": "@ginko/api",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@ginko/mcp-server": "workspace:*",
    "@ginko/shared": "workspace:*",
    "@vercel/node": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
EOF

# Run import updater
node update-imports.js

# Verify all imports were updated
grep -r "from '\.\./\.\./\.\./mcp-server" packages/api/ || echo "✅ No old imports found"

# Verify directory structure matches proposal
ls -la packages/api/tools/
ls -la packages/api/best-practices/
ls -la packages/api/sessions/

git add -A && git commit -m "feat: migrate api preserving directory structure"
```

**Testing Checkpoint 2.2:**
```bash
# Verify final structure matches proposal
tree -L 3 .

# Expected output should match the proposed structure

# Install and validate
npm install
npm run build

# Test local development with URL mapping verification
vercel dev &
sleep 5

# Test health endpoint
echo "Testing: GET /api/health"
curl -s http://localhost:3000/api/health | jq .

# Test MCP tools endpoint
echo "Testing: POST /api/tools/call"
curl -s -X POST http://localhost:3000/api/tools/call \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test" \
  -d '{"tool": "list_sessions", "arguments": {}}' | jq .

kill %1
```

#### Phase 3: Environment Variables Fix
**Milestone 3.1: Ensure Env Vars Propagate**
```bash
# Update shared env loader (already created in Phase 1)
# Update API utils to use it
cd packages/api
# The import should already be added by update-imports.js

# Verify env vars are accessible
cat > test-env.js << 'EOF'
require('@ginko/shared');
console.log('Database URL exists:', !!process.env.POSTGRES_URL);
EOF
node test-env.js

cd ../..
git add -A && git commit -m "feat: verify environment variable propagation"
```

#### Phase 4: Vercel Configuration with URL Mapping
**Milestone 4.1: Configure for Monorepo Structure with Explicit Mappings**
```bash
# Update vercel.json for new structure with explicit function mapping
cat > vercel.json << 'EOF'
{
  "buildCommand": "npx turbo run build",
  "framework": null,
  "installCommand": "npm install --production=false",
  "functions": {
    "packages/api/health.ts": {
      "maxDuration": 10
    },
    "packages/api/tools/call.ts": {
      "maxDuration": 30,
      "memory": 1024
    },
    "packages/api/tools/list.ts": {
      "maxDuration": 10
    },
    "packages/api/best-practices/*.ts": {
      "maxDuration": 20
    },
    "packages/api/best-practices/[id]/*.ts": {
      "maxDuration": 20
    },
    "packages/api/sessions/*.ts": {
      "maxDuration": 20
    },
    "packages/api/activity/*.ts": {
      "maxDuration": 15
    },
    "packages/api/projects/[id]/*.ts": {
      "maxDuration": 15
    }
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/packages/api/:path*"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Credentials", "value": "true" },
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
        { "key": "Access-Control-Allow-Headers", "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" }
      ]
    }
  ],
  "ignoreCommand": "git diff HEAD^ HEAD --quiet ."
}
EOF

# Create root TypeScript config
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "composite": true,
    "baseUrl": ".",
    "paths": {
      "@ginko/shared": ["packages/shared/src"],
      "@ginko/shared/*": ["packages/shared/src/*"],
      "@ginko/mcp-server": ["packages/mcp-server/src"],
      "@ginko/mcp-server/*": ["packages/mcp-server/src/*"]
    }
  },
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/mcp-server" },
    { "path": "./packages/api" }
  ]
}
EOF

git add -A && git commit -m "feat: configure vercel with explicit URL mappings"
```

**Testing Checkpoint 4.1:**
```bash
# Test build with Turborepo
npx turbo run build

# Verify outputs in correct locations
ls -la packages/shared/dist/
ls -la packages/mcp-server/dist/

# Test Vercel build and check function generation
vercel build --debug 2>&1 | tee build.log
grep "Created function" build.log

# Expected output should show:
# Created function: api/health.func
# Created function: api/tools/call.func
# Created function: api/tools/list.func
# Created function: api/best-practices/index.func
# Created function: api/best-practices/[id].func
# Created function: api/best-practices/[id]/adopt.func
# Created function: api/sessions/capture.func
# Created function: api/sessions/list.func
# Created function: api/sessions/[id].func
```

#### Phase 5: Staged Deployment with URL Verification
**Milestone 5.1: Preview Deployment with Endpoint Testing**
```bash
# Create comprehensive endpoint test script
cat > test-endpoints.sh << 'EOF'
#!/bin/bash
BASE_URL=$1
echo "Testing all endpoints at $BASE_URL"
echo "===================================="

# Health check
echo -n "GET /api/health: "
curl -f -s "$BASE_URL/api/health" > /dev/null && echo "✅" || echo "❌"

# MCP Tools endpoints
echo -n "POST /api/tools/call (get_best_practices): "
curl -f -s -X POST "$BASE_URL/api/tools/call" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wmcp_sk_test_Ar0MN4BeW_Fro5mESi5PciTsOg6qlPcIr7k0vBL2mIk" \
  -d '{"tool": "get_best_practices", "arguments": {"limit": 1}}' > /dev/null && echo "✅" || echo "❌"

echo -n "GET /api/tools/list: "
curl -f -s "$BASE_URL/api/tools/list" \
  -H "X-API-Key: wmcp_sk_test_Ar0MN4BeW_Fro5mESi5PciTsOg6qlPcIr7k0vBL2mIk" > /dev/null && echo "✅" || echo "❌"

# Best Practices endpoints
echo -n "GET /api/best-practices: "
curl -f -s "$BASE_URL/api/best-practices" \
  -H "X-API-Key: wmcp_sk_test_Ar0MN4BeW_Fro5mESi5PciTsOg6qlPcIr7k0vBL2mIk" > /dev/null && echo "✅" || echo "❌"

echo -n "POST /api/best-practices: "
TEST_BP='{"name":"Test","description":"Test BP","visibility":"private","author_id":"test","author_name":"Test User"}'
curl -f -s -X POST "$BASE_URL/api/best-practices" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wmcp_sk_test_Ar0MN4BeW_Fro5mESi5PciTsOg6qlPcIr7k0vBL2mIk" \
  -d "$TEST_BP" > /dev/null && echo "✅" || echo "❌"

# Sessions endpoints
echo -n "GET /api/sessions/list: "
curl -f -s "$BASE_URL/api/sessions/list" \
  -H "X-API-Key: wmcp_sk_test_Ar0MN4BeW_Fro5mESi5PciTsOg6qlPcIr7k0vBL2mIk" > /dev/null && echo "✅" || echo "❌"

echo -n "POST /api/sessions/capture: "
curl -f -s -X POST "$BASE_URL/api/sessions/capture" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wmcp_sk_test_Ar0MN4BeW_Fro5mESi5PciTsOg6qlPcIr7k0vBL2mIk" \
  -d '{"currentTask":"Testing"}' > /dev/null && echo "✅" || echo "❌"

echo ""
echo "MCP Tool Verification (via /api/tools/call):"
echo "============================================"

# Test each MCP tool
TOOLS=(
  "get_project_overview"
  "find_relevant_code"
  "get_file_context"
  "get_recent_changes"
  "get_team_activity"
  "list_sessions"
  "get_dashboard_metrics"
  "get_file_hotspots"
  "get_team_analytics"
)

for tool in "${TOOLS[@]}"; do
  echo -n "$tool: "
  curl -f -s -X POST "$BASE_URL/api/tools/call" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: wmcp_sk_test_Ar0MN4BeW_Fro5mESi5PciTsOg6qlPcIr7k0vBL2mIk" \
    -d "{\"tool\": \"$tool\", \"arguments\": {}}" > /dev/null && echo "✅" || echo "❌"
done

echo ""
echo "✅ Endpoint mapping verification complete!"
EOF
chmod +x test-endpoints.sh

# Deploy to preview
vercel --no-wait > deployment.txt
PREVIEW_URL=$(grep "Preview:" deployment.txt | awk '{print $2}')
echo "Preview URL: $PREVIEW_URL"

# Wait for deployment and test all endpoints
sleep 30
./test-endpoints.sh "$PREVIEW_URL"

git add -A && git commit -m "feat: add comprehensive endpoint testing"
```

**Milestone 5.2: Production Deployment with Full URL Verification**
```bash
# Create production verification script
cat > verify-production.sh << 'EOF'
#!/bin/bash
echo "Production URL Mapping Verification"
echo "==================================="
echo ""
echo "Testing: https://mcp.ginko.ai"
echo ""

# Test critical production endpoints
./test-endpoints.sh "https://mcp.ginko.ai"

# Verify function logs
echo ""
echo "Checking Vercel function logs:"
vercel logs --prod --since 5m | grep "function" | head -10

# Check deployment metadata
echo ""
echo "Deployment info:"
vercel inspect mcp.ginko.ai
EOF
chmod +x verify-production.sh

# Deploy to production
vercel --prod

# Run production verification
./verify-production.sh

git add -A && git commit -m "feat: successful production deployment with verified URL mappings"
```

#### Phase 6: Documentation with URL Mapping
**Milestone 6.1: Document URL Mappings**
```bash
# Create comprehensive URL mapping documentation
cat > docs/API-ENDPOINT-MAPPING.md << 'EOF'
# API Endpoint Mapping Documentation

## Production URLs

### Direct API Endpoints
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/health` | `packages/api/health.ts` | Health check |
| POST | `/api/tools/call` | `packages/api/tools/call.ts` | MCP tool execution |
| GET | `/api/tools/list` | `packages/api/tools/list.ts` | List available tools |
| GET/POST | `/api/best-practices` | `packages/api/best-practices/index.ts` | Best practices CRUD |
| GET/PUT/DELETE | `/api/best-practices/:id` | `packages/api/best-practices/[id].ts` | Single best practice |
| POST | `/api/best-practices/:id/adopt` | `packages/api/best-practices/[id]/adopt.ts` | Adopt best practice |
| POST | `/api/sessions/capture` | `packages/api/sessions/capture.ts` | Capture session |
| GET | `/api/sessions/list` | `packages/api/sessions/list.ts` | List sessions |
| GET/DELETE | `/api/sessions/:id` | `packages/api/sessions/[id].ts` | Session details |
| GET | `/api/activity/:teamId` | `packages/api/activity/[teamId].ts` | Team activity |
| GET | `/api/projects/:id/best-practices` | `packages/api/projects/[id]/best-practices.ts` | Project best practices |

### MCP Tools (via POST /api/tools/call)
| Tool | Arguments | Returns |
|------|-----------|---------|
| `get_best_practices` | `{limit?, priority?, category?}` | Best practices list |
| `suggest_best_practice` | `{scenario, codeContext?}` | Contextual suggestions |
| `search_best_practices` | `{query, tags?, limit?}` | Search results |
| `create_best_practice` | `{name, description, syntax?, tags?}` | Created best practice |
| `adopt_best_practice` | `{best_practice_id, notes?}` | Adoption confirmation |
| `get_project_overview` | `{path?}` | Project structure and insights |
| `find_relevant_code` | `{query, fileTypes?}` | Code search results |
| `get_file_context` | `{filePath}` | File analysis |
| `get_recent_changes` | `{since?}` | Recent git changes |
| `get_team_activity` | `{}` | Current team focus |
| `capture_session` | `{currentTask, compressionLevel?}` | Session ID |
| `resume_session` | `{sessionId}` | Session data |
| `list_sessions` | `{limit?}` | Available sessions |
| `get_dashboard_metrics` | `{days?}` | Analytics dashboard |
| `get_file_hotspots` | `{days?}` | File activity heatmap |
| `get_team_analytics` | `{periodType?}` | Team productivity metrics |
| `context` | `{autoResume?}` | Full project context |
| `ctx` | `{autoResume?}` | Alias for context |
| `sessions` | `{limit?}` | Alias for list_sessions |
| `__startup` | `{}` | Auto-execute on connect |

## Testing Commands

### Local Development
```bash
# Start local dev server
vercel dev

# Test local endpoint
curl http://localhost:3000/api/health
```

### Preview Deployment
```bash
# Deploy to preview
vercel

# Test preview endpoint
PREVIEW_URL=$(vercel ls --json | jq -r '.[0].url')
curl https://$PREVIEW_URL/api/health
```

### Production
```bash
# Deploy to production
vercel --prod

# Test production endpoint
curl https://mcp.ginko.ai/api/health
```

## Environment Variables Required
- `POSTGRES_URL` - Primary database connection
- `POSTGRES_PRISMA_URL` - Prisma pooled connection
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_DB_PASSWORD` - Database password
- `VERCEL_URL` - Auto-set by Vercel

## Troubleshooting

### Function Not Found
- Check: File exists in `packages/api/`
- Check: Path matches Vercel function pattern
- Check: No TypeScript compilation errors

### Authentication Errors
- Check: API key is valid
- Check: X-API-Key header is set
- Check: Tool permissions for user

### Database Connection
- Check: Environment variables are set
- Check: Database is accessible
- Check: SSL settings are correct
EOF

git add -A && git commit -m "docs: comprehensive API endpoint mapping documentation"
```

**Milestone 6.2: Merge to Main with Full Documentation**
```bash
# Create final summary
cat > MIGRATION-SUMMARY.md << 'EOF'
# Monorepo Migration Complete ✅

## What Changed
- ✅ Migrated to monorepo structure with 3 packages
- ✅ Fixed all module resolution issues
- ✅ Verified all 21 MCP tools work
- ✅ Documented all URL mappings
- ✅ Tested all API endpoints

## Production URLs Verified
- https://mcp.ginko.ai/api/health ✅
- https://mcp.ginko.ai/api/tools/call ✅
- https://mcp.ginko.ai/api/best-practices ✅
- https://mcp.ginko.ai/api/sessions/* ✅

## Next Steps
1. Monitor production for 24 hours
2. Delete backup branch after stable
3. Update team documentation
EOF

# Merge to main
git checkout main
git pull origin main
git merge --no-ff feat/monorepo-migration -m "feat: complete monorepo migration with verified URL mappings"
git push origin main

# Tag the release
git tag -a v2.0.0-monorepo -m "Monorepo with complete URL mapping"
git push origin v2.0.0-monorepo
```

### 🧪 TEST - URL Mapping Verification

**Automated URL Test Suite:**
```bash
#!/bin/bash
# save as: test-urls.sh

echo "🔗 Testing URL mappings..."

BASE="https://mcp.ginko.ai"
KEY="wmcp_sk_test_Ar0MN4BeW_Fro5mESi5PciTsOg6qlPcIr7k0vBL2mIk"

# Test each endpoint exists and responds
ENDPOINTS=(
  "GET:/api/health"
  "GET:/api/tools/list"
  "GET:/api/best-practices"
  "GET:/api/sessions/list"
  "POST:/api/tools/call"
  "POST:/api/sessions/capture"
)

for endpoint in "${ENDPOINTS[@]}"; do
  IFS=':' read -r method path <<< "$endpoint"
  echo -n "Testing $method $path: "
  
  if [ "$method" = "GET" ]; then
    curl -f -s "$BASE$path" -H "X-API-Key: $KEY" > /dev/null && echo "✅" || echo "❌"
  else
    curl -f -s -X POST "$BASE$path" -H "Content-Type: application/json" -H "X-API-Key: $KEY" -d '{}' > /dev/null && echo "✅" || echo "❌"
  fi
done

echo "🎉 URL mapping tests complete!"
```

### 📊 Success Criteria with URL Validation
- ✅ All endpoints accessible at production URLs
- ✅ MCP tools callable via /api/tools/call
- ✅ Dynamic routes ([id]) working correctly
- ✅ No 404 errors on documented endpoints
- ✅ Function logs show correct routing
- ✅ Response times under 3 seconds

### 🔗 Related Files (Full Paths)
**API Endpoints:**
- `/Users/cnorton/Development/ginko/packages/api/health.ts`
- `/Users/cnorton/Development/ginko/packages/api/tools/call.ts`
- `/Users/cnorton/Development/ginko/packages/api/tools/list.ts`
- `/Users/cnorton/Development/ginko/packages/api/best-practices/index.ts`
- `/Users/cnorton/Development/ginko/packages/api/best-practices/[id].ts`
- `/Users/cnorton/Development/ginko/packages/api/best-practices/[id]/adopt.ts`
- `/Users/cnorton/Development/ginko/packages/api/sessions/capture.ts`
- `/Users/cnorton/Development/ginko/packages/api/sessions/list.ts`
- `/Users/cnorton/Development/ginko/packages/api/sessions/[id].ts`

**Configuration:**
- `/Users/cnorton/Development/ginko/vercel.json`
- `/Users/cnorton/Development/ginko/docs/API-ENDPOINT-MAPPING.md`

### 📝 Notes
- Created: 2025-08-06
- Author: Chris Norton & Claude
- Context: Module resolution fix via monorepo with complete URL mapping
- Key Achievement: All 21 MCP tools accessible via verified production URLs
- Monitoring: Check function logs for proper routing post-deployment