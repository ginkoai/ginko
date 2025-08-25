# Session Handoff - Ginko to Ginko Platform Migration

**Date**: 2025-01-24  
**Time**: 09:15  
**Session ID**: ginko-migration-planning  
**Author**: Claude + Chris Norton  
**Email**: chris@ginko.ai  
**Branch**: feature/statusline-hooks-poc  
**Domain**: ginkoai.com (confirmed)

## 🎯 Session Achievement

**Comprehensive Migration Plan Complete** - Analyzed 240 files with Ginko references, designed parallel infrastructure strategy for zero-downtime transition to Ginko brand.

## 📊 Current Status

### Analysis Complete
- **240 files** contain Ginko references
- **366 instances** of "ginko.ai" domain
- **156 instances** of "@ginko.ai" emails
- **15 files** with Ginko in filename
- **Key components**: Marketing site, Dashboard, Browser Extension, MCP Client, Documentation

### Migration Decision
- **Strategy**: Fresh parallel project at `/Users/cnorton/Development/ginko`
- **Approach**: Full parallel infrastructure (Vercel, Supabase, GitHub)
- **Safety**: Ginko remains untouched and operational throughout
- **Timeline**: 2-week parallel operation before cutover

## 🚀 IMMEDIATE NEXT STEPS

### Start New Session in `/Users/cnorton/Development`

When you start the new session, use this command sequence:

```bash
# 1. Create fresh Ginko project
mkdir ginko
cd ginko
git init

# 2. Copy Ginko codebase (excluding git, node_modules, build artifacts)
rsync -av --exclude='.git' --exclude='node_modules' --exclude='.next' \
  --exclude='dist' --exclude='.vercel' --exclude='.env.local' \
  --exclude='*.tgz' --exclude='.turbo' \
  ../ginko/ ./

# 3. Create initial commit
git add .
git commit -m "Initial Ginko project - migrated from Ginko

Starting fresh rebranding from Ginko to Ginko.
Domain: ginkoai.com

Co-Authored-By: Chris Norton <chris@ginko.ai>"
```

## 📋 Phase 1: Customer-Facing Rebranding

### Execution Order & Key Changes

#### 1. Marketing Site (`/website/index.html`)
**Primary Changes**:
```bash
# Text replacements
"Ginko" → "Ginko"
"ginko.ai" → "ginkoai.com"
"chris@ginko.ai" → "chris@ginkoai.com"

# Asset updates needed
- Logo file (ginko-logo.svg)
- Favicon.ico
- Open Graph image
```

**Key Lines to Update**:
- Line 21: Website title and meta
- Line 61: Hero section branding
- Lines throughout: All brand mentions
- Email/domain references

#### 2. Dashboard Application (`/dashboard/`)
**Primary Files**:
- `src/app/dashboard/settings/page.tsx` (18 references)
- `src/components/ui/header.tsx` (logo and brand)
- `package.json` (project name)
- `.env.local` (API URLs)

**Environment Variables to Update**:
```bash
NEXT_PUBLIC_APP_URL=https://app.ginkoai.com
NEXT_PUBLIC_API_URL=https://mcp.ginkoai.com
NEXT_PUBLIC_SITE_NAME="Ginko"
```

#### 3. Browser Extension (`/browser-extension/`)
**Critical Files**:
- `manifest.json`:
  - name: "Ginko AI Assistant"
  - description: Update brand reference
  - homepage_url: "https://ginkoai.com"
  
- `sidebar.html`:
  - Line 13: Title update
  - Lines with Ginko branding
  
- `package.json`:
  - name: "ginko-browser-extension"

**Icon Requirements**:
- 16x16px icon
- 48x48px icon  
- 128x128px icon

#### 4. MCP Client (`/mcp-client/`)
**Updates Needed**:
- `package.json`: 
  - name: "ginko-mcp-client"
- `src/config.ts`:
  - Line 15: Update API URL to mcp.ginkoai.com
- Installation scripts: Update package references

### Global Search & Replace Commands

```bash
# After copying to ginko directory, run these replacements:

# Case-sensitive replacements (use your preferred tool)
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \
  -o -name "*.jsx" -o -name "*.json" -o -name "*.md" \
  -o -name "*.html" -o -name "*.css" \) \
  -not -path "./node_modules/*" \
  -exec sed -i '' 's/Ginko/Ginko/g' {} +

find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \
  -o -name "*.jsx" -o -name "*.json" -o -name "*.md" \
  -o -name "*.html" -o -name "*.css" \) \
  -not -path "./node_modules/*" \
  -exec sed -i '' 's/ginko/ginko/g' {} +

find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \
  -o -name "*.jsx" -o -name "*.json" -o -name "*.md" \
  -o -name "*.html" -o -name "*.css" \) \
  -not -path "./node_modules/*" \
  -exec sed -i '' 's/GINKO/GINKO/g' {} +

# Domain updates
find . -type f -not -path "./node_modules/*" \
  -exec sed -i '' 's/ginko\.ai/ginkoai.com/g' {} +

find . -type f -not -path "./node_modules/*" \
  -exec sed -i '' 's/@ginko\.ai/@ginkoai.com/g' {} +
```

### File & Directory Renames

```bash
# Directories
mv .ginko .ginko
mv packages/create-ginko-project packages/create-ginko-project

# Executables and scripts
mv ginko ginko
mv rebrand-to-ginko.sh rebrand-to-ginko.sh
mv ginko-privacy.sh ginko-privacy.sh

# Package files
cd packages/create-ginko-project/bin
mv create-ginko-project.js create-ginko-project.js

# MCP client files
cd mcp-client/src/statusline
mv ginko-statusline.cjs ginko-statusline.cjs
```

## 🏗️ Infrastructure Setup (Parallel)

### 1. Vercel Setup
```bash
# In ginko directory
vercel

# Configure as new project:
Project Name: ginko
Team: (your team)
Link to existing project?: No

# Add domains in Vercel dashboard:
- ginkoai.com (production)
- app.ginkoai.com (dashboard)  
- mcp.ginkoai.com (API)
```

### 2. Supabase Setup
1. Create new project: `ginko-prod`
2. Copy schema from Ginko project
3. Set up OAuth apps:
   - GitHub OAuth: Update callback to `https://app.ginkoai.com/auth/callback`
   - Google OAuth: Update callback to `https://app.ginkoai.com/auth/callback`
4. Copy environment variables to new project

### 3. GitHub Repository
```bash
# Create new repository
gh repo create ginkoai/ginko --public

# Add remote and push
git remote add origin https://github.com/ginkoai/ginko.git
git push -u origin main
```

### 4. Environment Variables
Create `.env.local` files with updated values:

**Dashboard `.env.local`**:
```
NEXT_PUBLIC_SUPABASE_URL=https://[new-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[new-anon-key]
NEXT_PUBLIC_APP_URL=https://app.ginkoai.com
```

**API `.env.local`**:
```
DATABASE_URL=[new-supabase-connection-string]
SUPABASE_SERVICE_ROLE_KEY=[new-service-key]
```

## ✅ Testing Checklist

### After Each Component Update:
- [ ] Component builds successfully (`npm run build`)
- [ ] No TypeScript errors
- [ ] No "ginko" references in UI
- [ ] Functionality preserved
- [ ] Deployment successful

### Component-Specific Tests:
- [ ] **Marketing Site**: All links work, brand consistent
- [ ] **Dashboard**: OAuth login works, settings page updated
- [ ] **Browser Extension**: Loads in Chrome, sidebar works
- [ ] **MCP Client**: Connects to new server endpoint

### End-to-End Validation:
- [ ] User can sign up with OAuth
- [ ] Browser extension connects to dashboard
- [ ] MCP client communicates with server
- [ ] Session handoffs work
- [ ] All branding is "Ginko"

## 📅 Timeline & Milestones

### Week 1: Infrastructure & Phase 1
- **Day 1**: Create ginko project, set up Git
- **Day 2**: Configure Vercel, Supabase, GitHub
- **Day 3-4**: Execute Phase 1 rebranding
- **Day 5**: Testing and validation

### Week 2: Monitoring & Phase 2
- **Day 6-7**: Phase 2 backend updates (if needed)
- **Day 8-12**: Parallel operation monitoring
- **Day 13-14**: DNS cutover preparation

### Week 3-4: Transition & Deprecation
- **Week 3**: DNS cutover to ginkoai.com
- **Week 4**: Monitor, then deprecate Ginko

## 🔧 Technical Context Preserved

### Current Ginko State
- **Branch**: feature/statusline-hooks-poc
- **Last Commit**: 53e7340 (Browser Extension Phase 1 complete)
- **Production URLs**: 
  - ginko.ai (marketing)
  - app.ginko.ai (dashboard)
  - mcp.ginko.ai (API)

### Asset Requirements for Ginko
Before starting, prepare:
- [ ] Ginko logo (SVG format preferred)
- [ ] Favicon.ico
- [ ] Browser extension icons (16x16, 48x48, 128x128)
- [ ] Open Graph image for social sharing
- [ ] Email template logos (if applicable)

## 🎬 Ready for Migration

The migration plan is comprehensive and ready for execution. Ginko will remain fully operational throughout the transition, ensuring zero downtime and risk-free rebranding.

**Next Session Opening**:
```
cd /Users/cnorton/Development
# Start new Claude Code session here
# Then follow the migration steps above
```

### Critical Success Factors
1. **Parallel infrastructure** - Both brands run simultaneously
2. **Systematic execution** - Follow the order precisely
3. **Continuous testing** - Validate after each step
4. **Safe cutover** - Only switch DNS after full validation

---

*Session Duration: ~45 minutes*  
*Collaboration Style: Strategic planning with detailed analysis*  
*Next Session Focus: Execute Ginko migration in fresh project*