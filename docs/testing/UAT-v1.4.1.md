# User Acceptance Testing Script - Ginko v1.4.1

**Version**: 1.4.1
**Date**: 2025-11-10
**Tester**: Chris Norton
**Focus Areas**: Charter system, Init integration, Bug fixes

---

## Pre-Test Setup

### Environment Preparation
```bash
# 1. Create clean test directory
mkdir -p ~/ginko-uat-test
cd ~/ginko-uat-test

# 2. Verify Ginko version
ginko --version
# Expected: 1.4.1

# 3. Initialize git (required for ginko)
git init
git config user.name "Test User"
git config user.email "test@example.com"
echo "# UAT Test Project" > README.md
git add . && git commit -m "Initial commit"
```

**Pre-test Checklist:**
- [ ] Clean test directory created
- [ ] Ginko v1.4.1 verified
- [ ] Git repository initialized

---

## Test Suite 1: Charter Command (New Feature)

### Test 1.1: Charter Creation with Skip Flag
**Purpose**: Test charter creation with mock data

```bash
ginko charter --skip-conversation
```

**Expected Results:**
- [ ] Command completes without errors
- [ ] File created at `docs/PROJECT-CHARTER.md`
- [ ] Success message displays file path and version
- [ ] Next steps shown (ginko start, ginko charter --view)

**Notes:**
_Record any unexpected behavior:_

---

### Test 1.2: Charter Viewing (Bug Fix Validation)
**Purpose**: Verify regex bug fix in charter --view

```bash
ginko charter --view
```

**Expected Results:**
- [ ] Command completes without errors (previously crashed with regex error)
- [ ] Formatted charter displays in terminal
- [ ] Shows: Status, Version, Work Mode, Confidence
- [ ] Shows: Purpose, Users, Success Criteria, Scope
- [ ] No "Invalid regular expression" error

**Notes:**
_Record display quality and readability:_

---

### Test 1.3: Charter Help and Examples
**Purpose**: Validate documentation and help text

```bash
ginko charter --help
ginko charter --examples
```

**Expected Results:**
- [ ] Help shows all options (--view, --edit, --mode, --skip-conversation, --output-path)
- [ ] Examples show clear usage patterns
- [ ] No errors or warnings

**Notes:**

---

## Test Suite 2: Init with Charter Integration

### Test 2.1: Quick Init (Charter Skipped)
**Purpose**: Test init --quick mode skips charter

```bash
# Clean slate
cd ..
mkdir ginko-uat-quickinit
cd ginko-uat-quickinit
git init && echo "test" > README.md && git add . && git commit -m "init"

ginko init --quick
```

**Expected Results:**
- [ ] Init completes successfully
- [ ] NO charter created (docs/PROJECT-CHARTER.md should NOT exist)
- [ ] Output mentions "ginko charter" as next step
- [ ] Directory structure created (.ginko/, ginko.json, CLAUDE.md)
- [ ] No errors

**Verification:**
```bash
ls docs/PROJECT-CHARTER.md 2>/dev/null && echo "FAIL: Charter exists" || echo "PASS: No charter"
```

**Notes:**

---

### Test 2.2: Normal Init with Charter Conversation
**Purpose**: Test charter integration in normal init flow

```bash
# Clean slate
cd ..
mkdir ginko-uat-normalinit
cd ginko-uat-normalinit
git init && echo "test" > README.md && git add . && git commit -m "init"

# Run init (will be interactive)
ginko init
```

**Interactive Steps:**
1. When prompted "Create project charter through conversation?", respond `n` (no)

**Expected Results:**
- [ ] Prompt appears asking about charter creation
- [ ] Selecting "no" skips charter gracefully
- [ ] Message displayed: "Skipping charter (you can create one later with `ginko charter`)"
- [ ] Init completes successfully
- [ ] No charter file created

**Notes:**
_Record the quality of the prompt and messaging:_

---

## Test Suite 3: Charter File Validation

### Test 3.1: Charter File Structure
**Purpose**: Validate charter markdown format

```bash
cd ~/ginko-uat-test
cat docs/PROJECT-CHARTER.md | head -40
```

**Expected Results:**
- [ ] YAML frontmatter present (id, projectId, status, workMode, version, etc.)
- [ ] Markdown headers properly formatted (# Project Charter, ## Purpose, etc.)
- [ ] Success criteria as checkboxes (- [ ])
- [ ] Scope sections present (In Scope, Out of Scope, TBD)
- [ ] Changelog section present
- [ ] No formatting errors or broken markdown

**Notes:**
_Record any formatting issues:_

---

### Test 3.2: Charter Storage Locations
**Purpose**: Verify file storage working

```bash
cd ~/ginko-uat-test

# Check file exists and is readable
ls -lh docs/PROJECT-CHARTER.md
cat docs/PROJECT-CHARTER.md | wc -l
# Should be ~50 lines for mock charter
```

**Expected Results:**
- [ ] File exists at docs/PROJECT-CHARTER.md
- [ ] File is readable (not empty)
- [ ] File size reasonable (~1-2KB for mock)
- [ ] File contains valid content

**Notes:**

---

## Test Suite 4: Integration and Workflow

### Test 4.1: Start Command with Charter
**Purpose**: Test ginko start with existing charter

```bash
cd ~/ginko-uat-test
ginko start --no-log
```

**Expected Results:**
- [ ] Start command completes successfully
- [ ] Session initializes without errors
- [ ] Readiness message appears (new feature)
- [ ] Readiness message is concise (≤6 lines)
- [ ] Flow state and work mode displayed
- [ ] Resume point shown

**Notes:**
_Evaluate readiness message quality and usefulness:_

---

### Test 4.2: Charter Edit Flow
**Purpose**: Test charter modification workflow

```bash
cd ~/ginko-uat-test

# View current charter
ginko charter --view

# Note: --edit requires conversational flow, skip for UAT
# Instead verify command is available
ginko charter --help | grep "edit"
```

**Expected Results:**
- [ ] --edit option listed in help
- [ ] View command works consistently (no crashes)

**Notes:**

---

## Test Suite 5: Error Handling and Edge Cases

### Test 5.1: Charter in Non-Git Directory
**Purpose**: Test error handling for missing git

```bash
cd /tmp
mkdir ginko-uat-nogit
cd ginko-uat-nogit

ginko charter --skip-conversation
```

**Expected Results:**
- [ ] Graceful error message (git required)
- [ ] OR command succeeds (creates docs/ regardless)
- [ ] No crash or stack trace

**Notes:**
_Record the error message quality:_

---

### Test 5.2: Duplicate Charter Creation
**Purpose**: Test behavior when charter already exists

```bash
cd ~/ginko-uat-test

# Charter already exists from Test 1.1
ginko charter --skip-conversation
```

**Expected Results:**
- [ ] Command handles existing charter gracefully
- [ ] Either: (a) Overwrites with warning, or (b) Errors with helpful message
- [ ] No data corruption or crashes

**Notes:**
_Record the behavior:_

---

### Test 5.3: Charter View with No Charter
**Purpose**: Test error handling when charter doesn't exist

```bash
cd ~/ginko-uat-quickinit  # No charter created here
ginko charter --view
```

**Expected Results:**
- [ ] Clear error message: "No charter found"
- [ ] Helpful next step: "Run `ginko charter` to create one"
- [ ] No crash or confusing error

**Notes:**

---

## Test Suite 6: Version and Compatibility

### Test 6.1: Version Consistency
**Purpose**: Verify version is consistent everywhere

```bash
ginko --version
cat ~/ginko-uat-test/ginko.json | grep -A1 '"cli"'
```

**Expected Results:**
- [ ] `ginko --version` returns 1.4.1
- [ ] Config files reference correct version
- [ ] No version mismatch warnings

**Notes:**

---

## UAT Summary

### Test Results Matrix

| Test Suite | Pass | Fail | Skip | Notes |
|------------|------|------|------|-------|
| 1. Charter Command | __/3 | __/3 | __/3 | |
| 2. Init Integration | __/2 | __/2 | __/2 | |
| 3. File Validation | __/2 | __/2 | __/2 | |
| 4. Integration | __/2 | __/2 | __/2 | |
| 5. Error Handling | __/3 | __/3 | __/3 | |
| 6. Version Check | __/1 | __/1 | __/1 | |
| **TOTAL** | __/13 | __/13 | __/13 | |

---

## Critical Issues Found

**Priority 1 (Blockers):**
- [ ] None found / List issues below

**Priority 2 (Major):**
- [ ] None found / List issues below

**Priority 3 (Minor):**
- [ ] None found / List issues below

---

## Overall Assessment

**Release Readiness:** ⬜ APPROVED / ⬜ APPROVED WITH MINOR ISSUES / ⬜ NOT APPROVED

**Summary:**
_Overall impression and recommendation:_


**Tester Signature:** _________________ **Date:** _________

---

## Cleanup

```bash
# Remove test directories
cd ~
rm -rf ginko-uat-test ginko-uat-quickinit ginko-uat-normalinit
rm -rf /tmp/ginko-uat-nogit
```
