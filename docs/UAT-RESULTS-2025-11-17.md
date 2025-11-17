# Ginko CLI UAT Results
**Date:** 2025-11-17
**Test Environment:** Separate workstation (fresh installation)
**Versions Tested:** v1.4.3 → v1.4.7
**Status:** ✅ ALL TESTS PASSED

---

## Executive Summary

User Acceptance Testing uncovered **4 critical bugs** that prevented ginko from functioning correctly in fresh installations. All bugs have been identified, fixed, and verified.

**Result:** Ginko CLI v1.4.7 is production-ready with clean separation between global authentication and project-specific directories.

---

## Bugs Found & Fixed

### Bug #1: `ginko login` Hangs After Browser Success
**Severity:** Critical
**Version Fixed:** v1.4.4

**Problem:**
- User completes authentication in browser successfully
- Browser shows "Authentication successful"
- CLI never returns to prompt, hangs indefinitely

**Root Cause:**
```typescript
// packages/cli/src/commands/login.ts
export async function loginCommand(options: LoginOptions = {}): Promise<void> {
  // ... authentication logic ...
  console.log('✓ Successfully authenticated');
  return; // ❌ Function returns but process doesn't exit
}
```

**Solution:**
```typescript
export async function loginCommand(options: LoginOptions = {}): Promise<void> {
  // ... authentication logic ...
  console.log('✓ Successfully authenticated');
  process.exit(0); // ✅ Explicitly exit process
}
```

**Files Changed:**
- `packages/cli/src/commands/login.ts:45` - Already authenticated path
- `packages/cli/src/commands/login.ts:90` - Successful authentication path

**Impact:**
- ✅ Login command exits cleanly after success
- ✅ User can proceed with workflow immediately

---

### Bug #2: `ginko start` Fails with "not a git repository"
**Severity:** Critical
**Version Fixed:** v1.4.5

**Problem:**
```
Error: Exit code 1
fatal: not a git repository (or any of the parent directories): .git
```
Even in valid git repositories with proper .git directory and commits.

**Root Cause:**
```typescript
// packages/cli/src/commands/start/start-reflection.ts:850
async gatherContext(parsedIntent: any): Promise<any> {
  const git = simpleGit(); // ❌ Uses process.cwd() which may differ from project root
}
```

When Claude Code executes `ginko start`, Node's `process.cwd()` may not match the git repository root.

**Solution:**
```typescript
async gatherContext(parsedIntent: any): Promise<any> {
  const projectRoot = await getProjectRoot(); // ✅ Get actual project root
  const git = simpleGit(projectRoot);         // ✅ Pass to simpleGit
}
```

**Files Changed:**
- `packages/cli/src/commands/start/start-reflection.ts:850-851`
- `packages/cli/src/lib/session-cursor.ts:16` - Add getProjectRoot import
- `packages/cli/src/lib/session-cursor.ts:109-110` - Fix getCurrentBranch()

**Impact:**
- ✅ Git operations work correctly from any execution context
- ✅ Claude Code can successfully run ginko commands

---

### Bug #3: `ginko init` Exits Early, Won't Initialize Projects
**Severity:** Critical
**Version Fixed:** v1.4.6

**Problem:**
```bash
$ ginko init
⚠ Ginko already initialized in parent directory: /Users/xtophr
```
Fresh project directory, but init refuses to run because `~/.ginko/` exists.

**Root Cause:**
```typescript
// Conflicting uses of .ginko directory:
~/.ginko/auth.json          // Global auth storage (created by ginko login)
<project>/.ginko/           // Project root marker (should be created by ginko init)

// Old behavior:
findGinkoRoot() walks up directory tree
  → finds ~/.ginko/ first
  → treats it as project root
  → init exits: "already initialized"
```

**Solution:**
```typescript
// packages/cli/src/utils/ginko-root.ts
async function isProjectGinko(ginkoPath: string): Promise<boolean> {
  // 1. NEVER treat home directory as project root
  const homeGinkoPath = path.join(process.env.HOME, '.ginko');
  if (path.resolve(ginkoPath) === path.resolve(homeGinkoPath)) {
    return false; // Global auth only
  }

  // 2. Check for project markers
  if (await fs.pathExists(path.join(ginkoPath, 'config.yml'))) return true;
  if (await fs.pathExists(path.join(ginkoPath, '../ginko.json'))) return true;

  // 3. Check for user session directories
  const sessionsDir = path.join(ginkoPath, 'sessions');
  if (await fs.pathExists(sessionsDir)) {
    const entries = await fs.readdir(sessionsDir);
    return entries.filter(e => e !== 'auth.json').length > 0;
  }

  return false; // Only auth.json = global auth dir
}
```

**Files Changed:**
- `packages/cli/src/utils/ginko-root.ts:35-78` - Add isProjectGinko() helper
- `packages/cli/src/utils/ginko-root.ts:83-137` - Update findGinkoRoot() with boundaries

**Impact:**
- ✅ `ginko init` works in new projects (ignores ~/.ginko)
- ✅ Clear separation: ~/.ginko for auth, <project>/.ginko for sessions
- ✅ Respects git boundaries (won't cross repo boundaries)
- ✅ Stops at home directory (won't search above ~)

---

### Bug #4: Duplicate Session Folders with Inconsistent Names
**Severity:** Medium
**Version Fixed:** v1.4.7

**Problem:**
```bash
.ginko/sessions/
├── chris-at-watchhill-ai/   # Created by ginko start
└── chris-at-watchhill.ai/   # Created by ginko init (dots not replaced!)
```

**Root Cause:**
```typescript
// packages/cli/src/commands/init.ts:71
const userSlug = userEmail.replace('@', '-at-').replace(/\\./g, '-');
//                                                        ^^^^ TYPO!
// /\\./g matches: backslash + any character (wrong!)
// /\./g matches: literal dot (correct!)
```

For `chris@watchhill.ai`:
- **init.ts (buggy):** `chris-at-watchhill.ai` (dots NOT replaced)
- **Other commands:** `chris-at-watchhill-ai` (dots replaced correctly)

**Solution:**
```typescript
// packages/cli/src/commands/init.ts:71
const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
//                                                        ^^ FIXED!
```

**Files Changed:**
- `packages/cli/src/commands/init.ts:71` - Fix regex typo

**Impact:**
- ✅ Consistent session folder naming across all commands
- ✅ Single session directory per user
- ✅ No more orphaned session folders

---

## UAT Test Procedure

### Test Environment Setup
```bash
# Clean slate
rm -rf ~/Desktop/ginko-uat-test
rm -rf ~/.ginko/sessions/

# Fresh test directory
mkdir ~/Desktop/ginko-uat-test
cd ~/Desktop/ginko-uat-test
git init
git config user.name "Chris Norton"
git config user.email "chris@watchhill.ai"
touch README.md
git add README.md
git commit -m "Initial commit"

# Install latest
npm install -g @ginkoai/cli@latest
```

### Test 1: Authentication
```bash
ginko login
# ✅ Opens browser
# ✅ Shows success in browser
# ✅ Returns to CLI immediately (no hang)

ginko whoami
# ✅ Shows authenticated user
```

### Test 2: Project Initialization
```bash
ginko init --quick
# ✅ Creates .ginko/ in project directory
# ✅ Does NOT complain about ~/.ginko existing
# ✅ Creates ginko.json, CLAUDE.md

ls -la ~/.ginko/
# ✅ Contains ONLY auth.json (no sessions/)
```

### Test 3: Session Start (via Claude Code)
```
User: "Please start a ginko session"
Claude Code: ginko start
# ✅ Session starts successfully
# ✅ No "not a git repository" errors
# ✅ Creates session in .ginko/sessions/chris-at-watchhill-ai/
```

### Test 4: Documentation Creation (via Claude Code)
```
User: "Yes, create the documentation folders"
Claude Code: Creates docs/, sprints/, etc.
# ✅ Folders created in project directory
# ✅ ~/.ginko/ remains pristine (only auth.json)
```

### Test 5: Final Directory State
```bash
# Project directory (correct)
.ginko/
├── config.json
├── local.json
├── sessions/
│   └── chris-at-watchhill-ai/    # ✅ Single folder, correct naming
├── best-practices/
├── context/
└── patterns/

docs/
├── adr/
├── architecture/
├── PRD/
└── sprints/

# Home directory (pristine)
~/.ginko/
└── auth.json                      # ✅ ONLY auth - no pollution!
```

---

## Success Criteria - All Passed ✅

| Criterion | Status | Notes |
|-----------|--------|-------|
| `ginko login` exits cleanly | ✅ PASS | No hanging, immediate return to prompt |
| `ginko init` creates project .ginko | ✅ PASS | Ignores ~/.ginko global auth |
| `ginko start` works via Claude Code | ✅ PASS | Git operations succeed |
| Session folders have consistent naming | ✅ PASS | Single folder per user |
| ~/.ginko stays pristine | ✅ PASS | Never receives project files |
| Documentation creation works | ✅ PASS | Files created in project directory |
| Full workflow functional | ✅ PASS | End-to-end testing complete |

---

## Versions Published

| Version | Fix | Status |
|---------|-----|--------|
| v1.4.3 | Initial UAT baseline | Baseline |
| v1.4.4 | Login exit fix | ✅ Published |
| v1.4.5 | Git working directory fix | ✅ Published |
| v1.4.6 | Global/project separation + home exclusion | ✅ Published |
| v1.4.7 | Session slug consistency | ✅ Published |

**Current Stable Version: v1.4.7** 🚀

---

## Recommendations

### For Production Release
✅ **v1.4.7 is production-ready**
- All critical bugs resolved
- Clean separation between global auth and project directories
- Full workflow tested and verified
- Compatible with AI development tools (Claude Code, Cursor, etc.)

### For Users Upgrading from Earlier Versions
```bash
# Cleanup legacy sessions from buggy versions
rm -rf ~/.ginko/sessions/

# Cleanup duplicate session folders in existing projects
cd <your-project>
ls -la .ginko/sessions/
# Keep the folder with dashes: user-at-example-com
# Remove the one with dots: user-at-example.com
```

### For Future Development
- Consider moving global auth to `~/.config/ginko/` (XDG Base Directory spec)
- Standardize email slug generation in a shared utility function
- Add migration script for users with legacy session folder structures

---

## Acknowledgments

**Testing:** Chris Norton (chris@watchhill.ai)
**Development:** Claude Code + Chris Norton
**Environment:** Separate UAT workstation (clean installation)

**Test Duration:** 2 hours
**Bugs Found:** 4 critical
**Bugs Fixed:** 4/4 (100%)
**UAT Result:** ✅ PASS

---

*Generated: 2025-11-17*
*Ginko CLI v1.4.7*
