# User Acceptance Testing Script - Ginko v1.4.1
## AI-Mediated Development Environment Testing

**Version**: 1.4.1
**Date**: 2025-11-10
**Tester**: Chris Norton
**AI Partner**: Claude Code (or other AI environment)
**Focus Areas**: Charter system, Init integration, Natural language interaction, Bug fixes

---

## Testing Philosophy

Ginko is designed for **AI-mediated development**:
- **Human**: Provides natural language requests
- **AI Partner**: Interprets intent and executes appropriate ginko commands
- **Ginko**: Captures context and maintains session state

This UAT tests the **complete interaction loop**, not just command execution.

---

## Pre-Test Setup

**Human Action**: Create a clean test environment

**Expected AI Response**:
AI should execute these commands proactively:

```bash
mkdir -p ~/ginko-uat-test
cd ~/ginko-uat-test
git init
git config user.name "Test User"
git config user.email "test@example.com"
echo "# UAT Test Project" > README.md
git add . && git commit -m "Initial commit"
ginko --version
```

**Evaluation Criteria:**
- [ ] AI executed commands without being told specific syntax
- [ ] AI verified version proactively
- [ ] AI confirmed setup complete with summary
- [ ] No manual command-line work required from human

**Notes:**

---

## Test Suite 1: Charter Creation Flow

### Test 1.1: Natural Language Charter Request
**Purpose**: Test AI interpretation of charter creation request

**Human Request**:
> "I want to create a project charter for this project"

**Expected AI Behavior:**
- AI recognizes charter creation intent
- AI explains what a charter is and its purpose
- AI executes `ginko charter --skip-conversation` (for UAT speed)
- AI summarizes the charter that was created
- AI explains next steps (how to view/edit)

**Evaluation Criteria:**
- [ ] AI executed appropriate ginko command
- [ ] AI explained the charter concept naturally
- [ ] AI proactively showed how to view the charter
- [ ] File created at `docs/PROJECT-CHARTER.md`
- [ ] Conversational flow felt natural (not robotic)

**Notes:**

---

### Test 1.2: Viewing Charter (Bug Fix Validation)
**Purpose**: Test AI-mediated charter viewing and regex bug fix

**Human Request**:
> "Show me the charter we just created"

**Expected AI Behavior:**
- AI executes `ginko charter --view`
- AI doesn't encounter regex errors (bug fix validation)
- AI summarizes key points from the charter
- AI offers to explain any section in detail

**Evaluation Criteria:**
- [ ] Command completed without errors (no regex crash)
- [ ] AI provided useful summary of charter content
- [ ] AI offered follow-up actions naturally
- [ ] Display was readable and well-formatted

**Notes:**

---

### Test 1.3: Charter Inquiry and Help
**Purpose**: Test AI's ability to explain charter features

**Human Request**:
> "What can I do with the charter? What are my options?"

**Expected AI Behavior:**
- AI may execute `ginko charter --help` or `--examples`
- AI explains charter capabilities in natural language:
  - Viewing (--view)
  - Editing (--edit)
  - Work modes (hack-ship, think-build, full-planning)
  - Custom output paths
- AI relates features to user's workflow

**Evaluation Criteria:**
- [ ] AI provided comprehensive explanation
- [ ] AI used help commands appropriately
- [ ] AI translated technical options into user benefits
- [ ] AI anticipated follow-up questions

**Notes:**

---

## Test Suite 2: Init with Charter Integration

### Test 2.1: Quick Project Setup
**Purpose**: Test AI-guided quick init without charter

**Human Request**:
> "Set up a new project quickly in a new directory called 'quicktest'"

**Expected AI Behavior:**
- AI creates new directory and initializes git
- AI recognizes "quickly" intent → uses `ginko init --quick`
- AI explains that quick mode skips charter creation
- AI mentions charter can be added later with `ginko charter`
- AI confirms setup complete

**Evaluation Criteria:**
- [ ] AI created directory and initialized git automatically
- [ ] AI used `--quick` flag appropriately
- [ ] NO charter file created (verify docs/ doesn't exist or is empty)
- [ ] AI explained what was skipped and why
- [ ] AI provided clear next steps

**Notes:**

---

### Test 2.2: Full Project Initialization
**Purpose**: Test AI navigation of init with charter prompt

**Human Request**:
> "Set up Ginko for a new project in directory 'fulltest'. I don't need a charter right now."

**Expected AI Behavior:**
- AI creates directory and initializes git
- AI runs `ginko init` (without --quick)
- AI anticipates charter prompt and either:
  - Option A: Mentions the prompt will appear and suggests declining
  - Option B: Automatically declines based on user's "I don't need a charter" statement
- AI confirms init completed without charter

**Evaluation Criteria:**
- [ ] AI correctly interpreted user's charter preference
- [ ] AI handled the initialization flow smoothly
- [ ] No charter file created
- [ ] AI confirmed what was created (.ginko/, ginko.json, CLAUDE.md)
- [ ] AI's interpretation of user intent was accurate

**Notes:**

---

## Test Suite 3: Charter Content Quality

### Test 3.1: Charter File Inspection
**Purpose**: Test AI's ability to validate charter quality

**Human Request**:
> "Check the charter file and tell me if it looks correct. What's in it?"

**Expected AI Behavior:**
- AI reads `docs/PROJECT-CHARTER.md`
- AI validates structure (YAML frontmatter, markdown sections)
- AI summarizes key sections:
  - Purpose & value proposition
  - Users/personas
  - Success criteria (checkboxes)
  - Scope boundaries
- AI identifies any formatting issues
- AI confirms file location and size

**Evaluation Criteria:**
- [ ] AI proactively validated file structure
- [ ] AI provided clear summary of content
- [ ] AI identified key sections correctly
- [ ] AI noticed if any formatting issues exist
- [ ] AI explained charter structure naturally

**Notes:**

---

### Test 3.2: Charter Verification
**Purpose**: Test AI's ability to confirm charter storage

**Human Request**:
> "Is the charter saved in the right place? Can I commit it to git?"

**Expected AI Behavior:**
- AI verifies file location (`docs/PROJECT-CHARTER.md`)
- AI confirms file is git-trackable (not in .gitignore)
- AI explains that charter is team-shared
- AI may proactively check git status
- AI offers to commit the charter if appropriate

**Evaluation Criteria:**
- [ ] AI confirmed correct file location
- [ ] AI validated git tracking status
- [ ] AI explained team-sharing concept
- [ ] AI's explanation was clear and helpful

**Notes:**

---

## Test Suite 4: Session Integration

### Test 4.1: Starting Session with Charter
**Purpose**: Test session initialization with charter context (new feature validation)

**Human Request**:
> "Start a ginko session"

**Expected AI Behavior:**
- AI executes `ginko start` (or `ginko start --no-log` for UAT)
- AI notices the session readiness message (new feature)
- AI relays key information from readiness:
  - Flow state (Hot/Mid-stride/Cold)
  - Work mode (Think & Build)
  - Resume point
- AI confirms session is ready
- Readiness message should be concise (≤6 lines)

**Evaluation Criteria:**
- [ ] Session started without errors
- [ ] AI communicated session state clearly
- [ ] Readiness message appeared and was concise
- [ ] AI explained what "ready" means for next steps
- [ ] Flow state and work mode were mentioned

**Notes:**

---

### Test 4.2: Working with Charter During Session
**Purpose**: Test AI's charter awareness during active development

**Human Request**:
> "What should we work on? What does the charter say?"

**Expected AI Behavior:**
- AI views charter (`ginko charter --view`)
- AI summarizes success criteria from charter
- AI suggests work items aligned with charter scope
- AI references charter context in recommendations
- AI demonstrates charter-aware guidance

**Evaluation Criteria:**
- [ ] AI referenced charter proactively
- [ ] AI's suggestions aligned with charter content
- [ ] AI demonstrated understanding of charter purpose
- [ ] Conversation felt guided by charter context

**Notes:**

---

## Test Suite 5: Error Handling and Recovery

### Test 5.1: Missing Prerequisites
**Purpose**: Test AI's handling of environment errors

**Human Request**:
> "Create a charter in /tmp/nogit without setting up git first"

**Expected AI Behavior:**
- AI attempts charter creation
- AI encounters error (git required OR succeeds anyway)
- AI explains the error clearly
- AI suggests remediation (initialize git first)
- AI offers to fix the issue
- No crash or technical stack traces shown to user

**Evaluation Criteria:**
- [ ] AI handled error gracefully
- [ ] AI explained problem in user-friendly terms
- [ ] AI offered actionable solution
- [ ] AI maintained conversational tone
- [ ] No technical jargon or stack traces

**Notes:**

---

### Test 5.2: Duplicate Charter Handling
**Purpose**: Test AI's handling of existing charter

**Human Request**:
> "Create another charter" (when one already exists)

**Expected AI Behavior:**
- AI notices charter already exists
- AI explains the situation
- AI offers options:
  - View existing charter
  - Edit existing charter
  - Overwrite (with warning)
  - Cancel
- AI respects user's choice

**Evaluation Criteria:**
- [ ] AI detected existing charter
- [ ] AI provided clear options
- [ ] AI warned about overwriting if chosen
- [ ] AI's guidance was helpful and non-destructive

**Notes:**

---

### Test 5.3: Charter Not Found
**Purpose**: Test AI's handling of missing charter

**Human Request**:
> "Show me the project charter" (in a project without one)

**Expected AI Behavior:**
- AI attempts to view charter
- AI discovers no charter exists
- AI explains clearly: "No charter found"
- AI suggests creating one: `ginko charter`
- AI offers to create one immediately

**Evaluation Criteria:**
- [ ] AI handled missing charter gracefully
- [ ] AI provided clear next steps
- [ ] AI offered proactive help
- [ ] Error message was user-friendly

**Notes:**

---

## Test Suite 6: AI Partner Capabilities

### Test 6.1: Version Awareness
**Purpose**: Test AI's ability to check and report version

**Human Request**:
> "What version of Ginko are we using?"

**Expected AI Behavior:**
- AI executes `ginko --version`
- AI reports version clearly: "1.4.1"
- AI may check config files for consistency
- AI explains what's new in this version (if prompted)

**Evaluation Criteria:**
- [ ] AI checked version proactively
- [ ] AI reported version clearly
- [ ] No version mismatch issues
- [ ] AI demonstrated version awareness

**Notes:**

---

### Test 6.2: Contextual Awareness
**Purpose**: Test AI's understanding of charter in development context

**Human Request**:
> "We have a charter now. How should we use it during development?"

**Expected AI Behavior:**
- AI explains charter's role in development:
  - Alignment tool for human-AI collaboration
  - Reference for scope and priorities
  - Guide for decision-making
- AI suggests integration points:
  - Session starts
  - Before major features
  - During handoffs
- AI demonstrates understanding of charter purpose

**Evaluation Criteria:**
- [ ] AI explained charter value clearly
- [ ] AI suggested practical use cases
- [ ] AI demonstrated understanding of workflow
- [ ] AI's guidance felt actionable

**Notes:**

---

## UAT Summary

### Test Results Matrix

| Test Suite | Pass | Fail | Notes |
|------------|------|------|-------|
| 1. Charter Creation Flow | __/3 | __/3 | |
| 2. Init Integration | __/2 | __/2 | |
| 3. Content Quality | __/2 | __/2 | |
| 4. Session Integration | __/2 | __/2 | |
| 5. Error Handling | __/3 | __/3 | |
| 6. AI Capabilities | __/2 | __/2 | |
| **TOTAL** | __/14 | __/14 | |

---

## AI Partner Evaluation

**Conversational Quality:**
- [ ] Excellent - Natural, helpful, contextual
- [ ] Good - Mostly natural with minor awkwardness
- [ ] Fair - Functional but robotic
- [ ] Poor - Confusing or unhelpful

**Command Interpretation:**
- [ ] Excellent - Consistently chose correct commands
- [ ] Good - Mostly correct with minor missteps
- [ ] Fair - Several incorrect interpretations
- [ ] Poor - Frequently misunderstood intent

**Error Recovery:**
- [ ] Excellent - Graceful, helpful, proactive
- [ ] Good - Handled errors adequately
- [ ] Fair - Some confusion in error situations
- [ ] Poor - Crashed or provided unhelpful messages

**Overall AI Integration:**
- [ ] Excellent - Felt like natural collaboration
- [ ] Good - Productive with minor friction
- [ ] Fair - Functional but limited
- [ ] Poor - More hindrance than help

---

## Critical Issues Found

**Priority 1 (Blockers):**
_Issues that prevent release:_

**Priority 2 (Major):**
_Issues that significantly impact UX:_

**Priority 3 (Minor):**
_Issues that are annoying but not critical:_

**AI-Specific Issues:**
_Problems with AI interpretation or integration:_

---

## Overall Assessment

**Release Readiness:**
- [ ] ✅ APPROVED - Ready for release
- [ ] ⚠️ APPROVED WITH MINOR ISSUES - Release with known limitations
- [ ] ❌ NOT APPROVED - Major issues must be fixed

**Charter Feature:**
- [ ] Meets requirements
- [ ] User-friendly and valuable
- [ ] Well-integrated with AI workflow
- [ ] Concerns: ___________________________

**AI Integration:**
- [ ] AI interprets commands correctly
- [ ] AI provides helpful guidance
- [ ] AI handles errors gracefully
- [ ] Concerns: ___________________________

**Summary:**
_Overall impression, key findings, and release recommendation:_


**Tester:** _________________ **Date:** _________ **AI Partner:** _________________

---

## Post-Test Cleanup

**Human Request**:
> "Clean up the UAT test directories"

**Expected AI Behavior:**
AI should remove test directories safely:
```bash
rm -rf ~/ginko-uat-test ~/quicktest ~/fulltest
rm -rf /tmp/nogit
```
