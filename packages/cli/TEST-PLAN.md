# Ginko CLI Clean-Start Test Plan

## Objective
Validate the complete Ginko CLI experience from a fresh project perspective, ensuring all commands work correctly without prior context or configuration.

## Test Environment Setup
- Fresh directory with no Ginko history
- No existing `.ginko/` folder
- Clean git repository
- Various AI environments (Claude, GPT-4, none)

## Test Scenarios

### Scenario 1: First-Time User Experience
**Goal**: Validate onboarding flow for new users

#### Prerequisites
```bash
# Create fresh test project
mkdir ~/test-ginko-fresh
cd ~/test-ginko-fresh
git init
echo "# Test Project" > README.md
git add README.md
git commit -m "Initial commit"
```

#### Test Steps
1. **Install Ginko CLI**
   ```bash
   cd ~/Development/ginko/packages/cli
   npm link  # If not already linked
   cd ~/test-ginko-fresh
   ```
   - [ ] Verify: `ginko --version` shows version
   - [ ] Verify: `ginko --help` displays commands

2. **Initialize Ginko**
   ```bash
   ginko init
   ```
   - [ ] Verify: `.ginko/` directory created
   - [ ] Verify: `.ginko/config.json` exists with defaults
   - [ ] Verify: Privacy message displayed
   - [ ] Verify: `.gitignore` updated to exclude sensitive files

3. **Check Status (No Session)**
   ```bash
   ginko status
   ```
   - [ ] Verify: Shows "No active session"
   - [ ] Verify: Displays project info
   - [ ] Verify: Shows git branch/status
   - [ ] Verify: Privacy settings displayed

### Scenario 2: Basic Session Workflow
**Goal**: Test core session management commands

#### Test Steps
1. **Start First Session**
   ```bash
   ginko start
   ```
   - [ ] Verify: Session ID generated
   - [ ] Verify: Welcome message displayed
   - [ ] Verify: AI model detected correctly
   - [ ] Verify: Session file created in `.ginko/sessions/`

2. **Make Some Changes**
   ```bash
   echo "export function hello() { return 'world'; }" > index.js
   echo "console.log('test');" > test.js
   ```

3. **Create Handoff**
   ```bash
   ginko handoff "Implemented hello function and test file"
   ```
   - [ ] Verify: Handoff saved message
   - [ ] Verify: Files tracked in handoff
   - [ ] Verify: Next steps suggested
   - [ ] Verify: `.ginko/sessions/*/current.md` created

4. **Check Status (Active Session)**
   ```bash
   ginko status
   ```
   - [ ] Verify: Shows active session
   - [ ] Verify: Displays correct mode
   - [ ] Verify: Shows last handoff time

### Scenario 3: Session Resumption
**Goal**: Validate session continuity

#### Test Steps
1. **Simulate Session End**
   ```bash
   # Exit terminal or clear environment variables
   unset GINKO_SESSION_ID
   ```

2. **Resume Session**
   ```bash
   ginko start
   ```
   - [ ] Verify: Previous session detected
   - [ ] Verify: Summary of last session displayed
   - [ ] Verify: Continuation prompt works
   - [ ] Verify: Context restored correctly

3. **Resume with Specific Session**
   ```bash
   # Get session ID from previous handoff
   ls .ginko/sessions/*/archive/
   ginko start <session-id>
   ```
   - [ ] Verify: Specific session loaded
   - [ ] Verify: Correct handoff displayed

### Scenario 4: Context Management
**Goal**: Test context tracking features

#### Test Steps
1. **Add Context**
   ```bash
   ginko context add "*.js" --reason "JavaScript files"
   ginko context add "README.md" --priority high
   ```
   - [ ] Verify: Context rules saved
   - [ ] Verify: Confirmation messages

2. **Show Context**
   ```bash
   ginko context show
   ```
   - [ ] Verify: Lists all context rules
   - [ ] Verify: Shows priorities
   - [ ] Verify: Displays file counts

3. **Remove Context**
   ```bash
   ginko context remove "*.js"
   ```
   - [ ] Verify: Rule removed
   - [ ] Verify: Confirmation message

### Scenario 5: Configuration Management
**Goal**: Test configuration commands

#### Test Steps
1. **View Config**
   ```bash
   ginko config
   ```
   - [ ] Verify: Shows all settings
   - [ ] Verify: Privacy settings visible

2. **Set Config Values**
   ```bash
   ginko config set user.email "test@example.com"
   ginko config set ai.model "gpt4"
   ginko config set privacy.analytics.enabled false
   ```
   - [ ] Verify: Each setting saved
   - [ ] Verify: Confirmation messages
   - [ ] Verify: Config file updated

3. **Get Config Value**
   ```bash
   ginko config get user.email
   ```
   - [ ] Verify: Correct value returned

### Scenario 6: AI Model Detection
**Goal**: Validate adapter selection

#### Test Steps
1. **Test with Claude Environment**
   ```bash
   export MCP_SERVER_GINKO=1
   ginko start
   ```
   - [ ] Verify: Claude adapter selected
   - [ ] Verify: Markdown formatting with colors

2. **Test with GPT-4 Environment**
   ```bash
   unset MCP_SERVER_GINKO
   export OPENAI_API_KEY="test-key"
   ginko start
   ```
   - [ ] Verify: GPT-4 adapter selected
   - [ ] Verify: JSON output option available

3. **Test with No AI Environment**
   ```bash
   unset OPENAI_API_KEY
   ginko start
   ```
   - [ ] Verify: Universal adapter selected
   - [ ] Verify: Clean, simple output

### Scenario 7: Error Handling
**Goal**: Validate graceful error handling

#### Test Steps
1. **Invalid Commands**
   ```bash
   ginko invalid-command
   ginko start --invalid-flag
   ```
   - [ ] Verify: Helpful error messages
   - [ ] Verify: Suggests valid commands

2. **Missing Required Arguments**
   ```bash
   ginko context add  # Missing pattern
   ginko config set   # Missing key/value
   ```
   - [ ] Verify: Clear error messages
   - [ ] Verify: Usage examples shown

3. **Corrupted Config**
   ```bash
   echo "invalid json" > .ginko/config.json
   ginko status
   ```
   - [ ] Verify: Error detected
   - [ ] Verify: Suggests fix or reinit

### Scenario 8: Git Integration
**Goal**: Test git-aware features

#### Test Steps
1. **Handoff with Uncommitted Changes**
   ```bash
   echo "uncommitted" > new-file.js
   ginko handoff "Test uncommitted tracking"
   ```
   - [ ] Verify: Detects uncommitted files
   - [ ] Verify: Includes in handoff
   - [ ] Verify: Mode detection (Building/Debugging)

2. **Status with Git Info**
   ```bash
   git checkout -b feature/test
   ginko status
   ```
   - [ ]Verify: Shows correct branch
   - [ ] Verify: Shows modified file count

### Scenario 9: Multi-Session Management
**Goal**: Test handling multiple sessions

#### Test Steps
1. **Create Multiple Handoffs**
   ```bash
   ginko handoff "First task complete"
   # Make changes
   ginko handoff "Second task complete"
   # Make more changes
   ginko handoff "Third task complete"
   ```
   - [ ] Verify: Archives created correctly
   - [ ] Verify: Current always points to latest

2. **List Sessions**
   ```bash
   ls -la .ginko/sessions/*/archive/
   ```
   - [ ] Verify: All sessions preserved
   - [ ] Verify: Timestamps in filenames

### Scenario 10: Performance & Scale
**Goal**: Test with realistic project size

#### Test Steps
1. **Large File Context**
   ```bash
   # Create many files
   for i in {1..50}; do echo "file $i" > "file$i.js"; done
   ginko handoff "Large project test"
   ```
   - [ ] Verify: Handles many files gracefully
   - [ ] Verify: Performance acceptable (<2 seconds)

2. **Long Session History**
   ```bash
   # Create many handoffs
   for i in {1..20}; do ginko handoff "Handoff $i"; done
   ```
   - [ ] Verify: Archives managed properly
   - [ ] Verify: No performance degradation

## Acceptance Criteria

### Must Pass (Critical)
- [ ] All basic commands work (init, start, handoff, status)
- [ ] Session persistence works correctly
- [ ] No data loss between sessions
- [ ] Privacy-first: no network calls for core features
- [ ] Git-native storage working

### Should Pass (Important)
- [ ] AI detection works for major models
- [ ] Error messages are helpful
- [ ] Performance is acceptable (<2s for commands)
- [ ] Configuration management works

### Nice to Have
- [ ] Colors and formatting work correctly
- [ ] Suggestions and tips are relevant
- [ ] Mode detection is accurate

## Test Execution Log

### Run 1: [Date/Time]
**Tester**: [Name]
**Environment**: [OS, Node version, Terminal]

#### Issues Found
1. Issue: [Description]
   - Severity: [Critical/High/Medium/Low]
   - Steps to reproduce
   - Expected vs Actual
   - Fix applied: [Description]

#### Summary
- Tests passed: X/Y
- Critical issues: 0
- Time to complete: X minutes

## Polish Items Discovered

Based on test execution, prioritize these improvements:

### High Priority
- [ ] Fix: [Issue description]
- [ ] Improve: [Feature that needs polish]
- [ ] Add: [Missing critical feature]

### Medium Priority
- [ ] Enhance: [UX improvement]
- [ ] Clarify: [Confusing message/flow]

### Low Priority
- [ ] Polish: [Nice-to-have improvement]
- [ ] Optimize: [Performance enhancement]

## Command Cheatsheet for Testing

```bash
# Quick test setup
mkdir ~/test-ginko-$(date +%s) && cd $_
git init && echo "# Test" > README.md
git add . && git commit -m "Init"

# Full workflow test
ginko init
ginko start
echo "test" > test.js
ginko handoff "Test handoff"
ginko status

# Cleanup
cd ~ && rm -rf test-ginko-*
```