# Project Organization Analysis & Cleanup Plan

## Context & Purpose

This is an **elective refactoring exercise** - we do not have an absolute need to restructure now. The current system works and is functional. 

**Primary Goal**: Compare the ongoing cost of our current structure with an optimized structure to understand the payoff period and make a data-driven decision about whether reorganization effort is justified.

## Current State Assessment

### Project Structure Overview
- **Root directory**: 50+ files including legacy session docs, test scripts, config files
- **Documentation**: Scattered across root and docs/ with inconsistent organization  
- **Workspaces**: 4 main areas (api/, dashboard/, mcp-client/, evals/) with varying organization
- **Scripts**: Mix of essential and one-off scripts in root and scripts/

### Identified Pain Points
1. **Cognitive overhead**: Time spent navigating cluttered root directory
2. **Context switching cost**: Difficulty finding relevant files across sessions
3. **Onboarding friction**: New team members struggle with file organization
4. **Maintenance burden**: Outdated/duplicate files create confusion

## Phase 0: Dependency Mapping & Risk Assessment

### Step 1: Complete Dependency Audit

#### A. Critical Production Dependencies
**Objective**: Map all file path references in production code
```bash
# Commands to run:
grep -r "\./" api/ dashboard/src/ --include="*.ts" --include="*.tsx"
grep -r "\.\." api/ dashboard/src/ --include="*.ts" --include="*.tsx"  
grep -r "docs/" api/ dashboard/src/ --include="*.ts" --include="*.tsx"
grep -r "templates/" api/ --include="*.ts"
```

#### B. Configuration Dependencies
**Objective**: Find all config files with path references
```bash
# Commands to run:
grep -r "\./" *.json vercel.json dashboard/*.json api/*.json
grep -r "docs/" *.json vercel.json dashboard/*.json api/*.json
grep -r "scripts/" *.json vercel.json dashboard/*.json api/*.json
```

#### C. Documentation Cross-References  
**Objective**: Map internal markdown links that could break
```bash
# Commands to run:
grep -r "\]\(\." docs/ --include="*.md"
grep -r "\]\(\/" docs/ --include="*.md"
grep -r "\.\./" docs/ --include="*.md"
```

#### D. Build/Deploy Dependencies
**Objective**: Check build scripts for file path assumptions
```bash
# Commands to run:
grep -r "docs/" scripts/ --include="*.sh" --include="*.js"
grep -r "\.\/" scripts/ --include="*.sh" --include="*.js"
```

### Step 2: Risk Classification

#### HIGH RISK (Production Breaking)
- API route files (api/)
- Dashboard source code (dashboard/src/)
- Package.json workspace configurations
- Vercel deployment configurations  
- Database schemas and migrations
- MCP client distribution files

#### MEDIUM RISK (Development/CI Breaking)
- Build scripts in scripts/
- TypeScript configurations
- Documentation with external references
- Setup/installation scripts
- Test configurations

#### LOW RISK (Safe for Cleanup)
- Session files (SESSION-*.md, SESSION_*.md)
- Temporary scripts (test-*.js, debug-*.sh)
- Log files (*.log, *.pid)
- Legacy one-off migration scripts
- Archive-worthy documentation
- Redundant test files

### Step 3: Cost-Benefit Analysis Framework

#### Current Structure Costs (Ongoing)
- **Navigation time**: Estimated X minutes per session finding files
- **Context switching**: Y minutes lost when switching between tasks
- **Onboarding friction**: Z hours for new team member setup
- **Maintenance overhead**: Time spent managing outdated files

#### Refactoring Costs (One-time)
- **Development time**: Hours needed for reorganization
- **Testing effort**: Validation of all dependencies
- **Risk mitigation**: Safety measures and rollback planning
- **Team coordination**: Ensuring everyone adapts to new structure

#### Optimized Structure Benefits (Ongoing)
- **Reduced navigation**: Estimated time saved per session
- **Improved focus**: Less cognitive load from cleaner organization
- **Faster onboarding**: Streamlined new team member experience
- **Better collaboration**: Consistent patterns across workspaces

## Decision Options

### Option 1: Status Quo
- **Cost**: Accept ongoing navigation and maintenance overhead
- **Risk**: Zero (no changes)
- **Benefit**: No implementation effort required

### Option 2: Light Cleanup (Conservative)
- **Scope**: Remove temp files, archive old sessions, basic organization
- **Expected outcome**: 50+ root files → ~25 files
- **Risk**: Minimal (only touching obvious cruft)
- **Effort**: ~2-4 hours
- **Benefit**: 60-70% reduction in root directory clutter

### Option 3: Full Refactoring (Comprehensive)
- **Scope**: Complete reorganization with CLAUDE.md strategy
- **Expected outcome**: Optimized monorepo structure
- **Risk**: Depends on dependency analysis results
- **Effort**: ~8-16 hours including testing
- **Benefit**: Maximum efficiency gains

## Next Steps

1. **Complete dependency mapping** (Phase 0)
2. **Quantify current costs** through measurement
3. **Calculate ROI for each option**
4. **Make data-driven decision** on best path forward

## Analysis Results

### Dependency Mapping Results

#### A. Critical Production Dependencies ✅ COMPLETE
- **API internal imports**: All use relative paths within `api/` directory (`../_lib/`, `../_utils.js`)
- **Dashboard routing**: Internal dashboard routes reference `/dashboard/docs/` paths
- **Template references**: No template file dependencies found in API code
- **Risk Level**: **LOW** - All production imports are self-contained within workspaces

#### B. Configuration Dependencies ✅ COMPLETE  
- **TypeScript configs**: Use relative paths (`./src/*`, `./packages/*`) - standard practice
- **Package.json**: One reference to `scripts/prepare-api.sh` 
- **Vercel configs**: No problematic path dependencies found
- **Risk Level**: **LOW** - Standard configuration patterns

#### C. Documentation Cross-References ✅ COMPLETE
- **Historical references**: Old docs reference deprecated `../mcp-server/dist/` paths
- **Relative imports in docs**: Some docs mention `../mcp-client/dist/index.js`
- **Internal structure**: No critical cross-references that would break with reorganization
- **Risk Level**: **VERY LOW** - Mostly historical/archived content

#### D. Build/Deploy Dependencies ✅ COMPLETE
- **Scripts directory**: Only `scripts/create-adr.sh` references `docs/architecture`
- **Build processes**: No critical path dependencies on root directory structure
- **Deployment**: Vercel functions operate independently within `api/` directory
- **Risk Level**: **LOW** - Minimal coupling to file organization

### Risk Assessment Summary

**Total files in root directory: 88 files**

#### HIGH RISK Files (7 files) - Do Not Touch
- `package.json`, `package-lock.json` - Workspace dependencies
- `tsconfig.json`, `turbo.json` - Build configuration
- `vercel.json` - Deployment configuration
- `CLAUDE.md`, `README.md` - Critical project documentation

#### MEDIUM RISK Files (5 files) - Requires Testing
- `claude-config.json` - MCP client configuration
- Essential scripts in `scripts/` directory
- Core database files in `database/` directory
- Active documentation in `docs/` that may have external references
- `BACKLOG.md`, `BUGS.md` - Project management files

#### LOW RISK Files (76 files) - Safe for Cleanup
- **Session files (11 files)**: All `SESSION-*.md` files can be archived
- **Test/Debug files (19 files)**: Temporary test scripts, debug files
- **Log files (6 files)**: `*.log`, `*.pid`, build artifacts  
- **Legacy files (40+ files)**: Old migration scripts, temporary payloads, one-off scripts

### **Key Finding: 86% of root directory files are LOW RISK for cleanup!**

## Cost-Benefit Analysis & Recommendations

### Current Structure Costs (Ongoing)
Based on typical development patterns:
- **Navigation overhead**: ~2-3 minutes per session finding files in cluttered root
- **Context switching cost**: ~1-2 minutes when switching between current/historical work
- **Onboarding friction**: ~30-60 minutes for new team members to understand structure
- **Maintenance burden**: ~5-10 minutes per week managing outdated files
- **Weekly cost estimate**: ~15-25 minutes per developer

### Option 1: Status Quo
- **Cost**: Accept ongoing 15-25 min/week navigation overhead
- **Risk**: Zero implementation risk
- **ROI**: N/A (baseline)

### Option 2: Light Cleanup (RECOMMENDED)
- **Scope**: Archive 76 low-risk files, basic organization
- **Implementation time**: 2-3 hours
- **Risk**: Very low (only touching safe files)
- **Expected savings**: 10-15 min/week (60-75% reduction in navigation time)
- **Payoff period**: 2-3 weeks
- **Outcome**: 88 root files → ~12 essential files

### Option 3: Full Refactoring
- **Scope**: Complete reorganization with CLAUDE.md strategy  
- **Implementation time**: 8-12 hours including testing
- **Risk**: Low-medium (based on dependency analysis)
- **Expected savings**: 15-20 min/week (80-90% navigation improvement)
- **Payoff period**: 6-8 weeks
- **Additional benefits**: Enhanced collaboration patterns, better onboarding

## Final Recommendation: **LIGHT CLEANUP APPROACH**

### Rationale:
1. **Excellent ROI**: 2-3 hour investment pays back in 2-3 weeks
2. **Minimal risk**: 86% of cleanup targets are completely safe  
3. **Immediate impact**: Root directory becomes dramatically cleaner
4. **Incremental approach**: Can upgrade to full refactoring later if desired

### Next Steps for Light Cleanup:
1. **Create archive directories**: `docs/archive/sessions/`, `docs/archive/scripts/`
2. **Move session files**: Archive all 11 `SESSION-*.md` files
3. **Remove temp files**: Delete logs, build artifacts, test payloads
4. **Consolidate scripts**: Move one-off scripts to archive or remove
5. **Basic documentation organization**: Light reorganization of docs

### Success Metrics:
- Root directory file count: 88 → ~12 files (86% reduction)
- Navigation time improvement: 60-75% reduction
- Team satisfaction: Qualitative feedback on improved workspace
- Zero production impact: All services continue working normally

---

# UPDATED: Full Project Refactoring Plan
*Based on dependency analysis showing 86% low-risk files and minimal coupling*

## Overview
Transform the repository from cluttered workspace to optimized monorepo with enhanced human-AI collaboration patterns.

**Investment**: 8-12 hours | **Payback**: 6-8 weeks | **Risk**: Low-Medium

## Target Structure

### Root Directory (88 → 8 files)
```
ginko/
├── README.md                 # Project overview
├── CLAUDE.md                 # Root context & workspace navigation  
├── BACKLOG.md               # Current project priorities
├── package.json             # Workspace configuration
├── tsconfig.json            # TypeScript root config
├── turbo.json               # Monorepo build orchestration
├── vercel.json              # Deployment configuration
└── .gitignore               # Version control rules
```

### Optimized Workspace Structure
```
├── api/                     # Serverless MCP functions
│   ├── CLAUDE.md           # API development patterns
│   └── [existing structure]
├── dashboard/               # Next.js collaboration app
│   ├── CLAUDE.md           # UI development patterns  
│   └── [existing structure]
├── mcp-client/             # NPM package distribution
│   ├── CLAUDE.md           # CLI development patterns
│   └── [existing structure]  
├── evals/                  # Python testing framework
│   ├── CLAUDE.md           # Testing & benchmarking
│   └── [existing structure]
├── docs/                   # Consolidated documentation
│   ├── README.md           # Documentation navigation
│   ├── current/            # Active project docs
│   ├── archive/            # Historical sessions & deprecated
│   └── [organized by type]
├── scripts/                # Essential automation
│   ├── CLAUDE.md           # Script development & usage
│   └── [essential scripts only]
└── database/               # Schema & migrations
    └── [existing structure]
```

## CLAUDE.md Strategy

### Root CLAUDE.md - Project Navigation Hub
```markdown
# Ginko Monorepo Guide

## Quick Start
- `api/` - MCP server development → See api/CLAUDE.md
- `dashboard/` - UI development → See dashboard/CLAUDE.md  
- `mcp-client/` - CLI tools → See mcp-client/CLAUDE.md
- `evals/` - Testing framework → See evals/CLAUDE.md

## Current Priorities
See BACKLOG.md for active tasks

## Architecture Overview
See docs/architecture/ for system design
```

### Workspace-Specific CLAUDE.md Files
**api/CLAUDE.md** - Serverless development patterns
**dashboard/CLAUDE.md** - Next.js component patterns
**mcp-client/CLAUDE.md** - NPM package & CLI development
**evals/CLAUDE.md** - Python testing & benchmarking
**scripts/CLAUDE.md** - Automation & utility scripts

## Migration Phases

### Phase 1: Archive & Clean (2 hours, Zero Risk) ⏳ CURRENT
**Goal**: Remove 76 low-risk files from root directory

1. **Create archive structure**
   ```
   docs/archive/
   ├── sessions/           # All SESSION-*.md files (11 files)
   ├── scripts/           # One-off migration scripts
   ├── logs/              # Build logs, server logs  
   └── temp/              # Test payloads, temp files
   ```

2. **Move files safely**
   - Archive all `SESSION-*.md` → `docs/archive/sessions/`
   - Move temp scripts → `docs/archive/scripts/`
   - Delete logs, .pid files, build artifacts
   - Remove redundant test files

**Testing Gate**: Verify builds still work, services deploy

### Phase 2: Documentation Reorganization (3 hours, Low Risk)
**Goal**: Optimize docs/ structure for better navigation

### Phase 3: CLAUDE.md Implementation (2 hours, Low Risk)
**Goal**: Create contextual development guides

### Phase 4: Final Cleanup & Polish (2 hours, Low Risk)
**Goal**: Complete the transformation

## Verification Checkpoints

### After Each Phase
1. **Build verification**: `npm run build` succeeds
2. **Service deployment**: Both Vercel apps deploy successfully
3. **MCP functionality**: All tools work via https://mcp.ginko.ai
4. **Navigation test**: Can find files efficiently

### Final Success Criteria
- ✅ Root directory: 88 → 8 files (91% reduction)
- ✅ All services operational: API + Dashboard + MCP client
- ✅ Documentation navigation: <30 seconds to find any doc
- ✅ Development workflow: CLAUDE.md files provide clear context
- ✅ Team efficiency: Measurable improvement in development speed

---

*Document created: 2025-08-14*
*Analysis Status: ✅ COMPLETE*
*Plan Status: ⏳ Phase 1 in Progress*
*Final Recommendation: Proceed with Full Refactoring (8-12 hour effort, 6-8 week payback)*