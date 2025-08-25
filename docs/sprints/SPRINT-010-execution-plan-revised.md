# SPRINT-010: Git-Native Handoffs + Onboarding Execution Plan (REVISED)

**Sprint Start**: 2025-08-19 (Monday)  
**Sprint End**: 2025-08-30 (2 weeks)  
**Primary Goal**: Ship PERSONAL git-native handoffs MVP + WSL2 documentation  
**Secondary Goal**: Prepare onboarding flow for professional developers

## Critical Revision: Personal Handoffs First

Based on pre-mortem analysis, we're focusing on **personal session handoffs** first:
- One developer, multiple sessions
- No team merge conflicts
- Clear ownership model
- GitHub user ID as identifier

## User Identification Strategy

### GitHub-Based Identity
```bash
# Automatic user detection
$ git config user.name  # "Chris Norton"
$ git config user.email # "chris@ginko.ai"

# Directory structure
.ginko/
├── chris/                    # Personal handoff directory
│   ├── session-handoff.md   # Current session
│   └── archive/             # Historical sessions
└── config.yml               # User preferences
```

**Key Insight**: Use git's existing user configuration for identity. This is already set up and familiar to developers.

## Week 1: Foundation (Aug 19-23) - REVISED

### Day 0 (Monday Morning): Critical Validation
**Owner**: Chris + Claude  
**Goal**: Validate core assumptions before building

**MUST TEST FIRST**:
- [ ] Claude can write to `.ginko/chris/session-handoff.md`
- [ ] Claude can read back the file reliably
- [ ] Git properly tracks the file
- [ ] File permissions work correctly

**Abort Conditions**:
- Cannot read/write files reliably
- Permission issues on >20% of attempts
- Git corrupts markdown files

### Monday PM - Tuesday: Personal Handoffs MVP
**Owner**: Chris + Claude  
**Goal**: Simplest possible working version

- [ ] Create `.ginko/{username}/` directory structure
- [ ] Get GitHub username from git config
- [ ] Write simple handoff file (no templates yet)
- [ ] Basic git add/commit workflow
- [ ] Test read-back functionality

**Success Criteria**: 
- Claude knows "I am Chris" from git config
- Handoff written to `.ginko/chris/session-handoff.md`
- Can read file back in next session
- No merge conflicts (personal directory)

### Wednesday: Workflow Clarity
**Owner**: Chris + Claude  
**Goal**: Make the workflow crystal clear

- [ ] Create visual workflow diagram
- [ ] Write step-by-step guide
- [ ] Add clear statusline messages
- [ ] Test with fresh mind (morning test)
- [ ] Document gotchas discovered

**Success Criteria**:
- Workflow understood in <2 minutes
- Clear when handoff is "saved" vs "committed"
- No confusion about file location

### Thursday: WSL2 Documentation
**Owner**: Chris + Claude  
**Goal**: Windows developers can use Ginko

- [ ] Write WSL2 setup guide
- [ ] Include git config setup
- [ ] Test file paths on WSL2
- [ ] Add troubleshooting section
- [ ] Publish to docs

**Success Criteria**:
- WSL2 users can complete setup
- File paths work correctly
- Git config properly detected

### Friday: Safety & Polish
**Owner**: Chris + Claude  
**Goal**: Prevent data loss and confusion

- [ ] Add secrets scanning (.gitignore patterns)
- [ ] Implement file size warnings (>50KB)
- [ ] Create backup before overwrites
- [ ] Add "uncommitted changes" warning
- [ ] Test disaster recovery

**Success Criteria**:
- No accidental secret commits
- No data loss scenarios
- Clear warnings for risky states

## Week 2: Enhancement (Aug 26-30) - REVISED

### Monday: StatusLine Intelligence
**Owner**: Chris + Claude  
**Goal**: Ambient awareness without noise

- [ ] Detect handoff file states
- [ ] Show only important events
- [ ] Add configurable verbosity
- [ ] Test for annoyance factor
- [ ] Create disable option

**Success Criteria**:
- Helpful but not distracting
- Can be silenced if needed
- Shows critical warnings

### Tuesday: Archive & History
**Owner**: Chris + Claude  
**Goal**: Manage growing handoff collection

- [ ] Auto-archive old handoffs by date
- [ ] Create search functionality
- [ ] Add size management
- [ ] Implement cleanup commands
- [ ] Test with many files

**Success Criteria**:
- Old handoffs preserved but organized
- Can find historical sessions
- Directory doesn't grow unbounded

### Wednesday: Templates & Patterns
**Owner**: Chris + Claude  
**Goal**: Improve handoff quality

- [ ] Create 3 default templates (bug, feature, refactor)
- [ ] Allow custom templates
- [ ] Prevent template sprawl
- [ ] Add template selection
- [ ] Test template workflow

**Success Criteria**:
- Templates improve handoff quality
- Not overwhelming choices
- Easy to ignore if not wanted

### Thursday: Beta Testing
**Owner**: Chris  
**Goal**: Validate with real developers

- [ ] Recruit 3 professional developers
- [ ] Provide setup instructions
- [ ] Observe first-time use
- [ ] Collect feedback
- [ ] Document issues found

**Success Criteria**:
- 3+ developers successfully use it
- Workflow understood without help
- Positive feedback on approach

### Friday: Ship It!
**Owner**: Chris + Claude  
**Goal**: Launch ready

- [ ] Fix critical issues from beta
- [ ] Create demo video (2 min)
- [ ] Write blog post
- [ ] Prepare announcement
- [ ] Final end-to-end test

**Success Criteria**:
- Demo clearly shows value
- Blog explains paradigm shift
- No blocking issues remain

## Pre-Mortem Integration

### Critical Failure Mitigations

#### "Git Confusion" → Clear State Indicators
```
Statusline states:
"📝 Draft saved (not in git)"
"⚠️ Uncommitted changes"
"✅ Committed locally"
"🔄 Pushed to remote"
```

#### "Merge Conflicts" → Personal Directories
```
.ginko/
├── chris/session-handoff.md
├── alice/session-handoff.md
└── bob/session-handoff.md
```
No conflicts between users!

#### "Claude Can't Read" → Validation First
Day 1 morning: Extensive read/write testing before building features

#### "Accidental Secrets" → Pre-commit Scanning
```gitignore
# .ginko/.gitignore
*.key
*.pem
*_secret*
.env*
```

#### "StatusLine Noise" → Smart Filtering
Only show:
- State changes (not every save)
- Warnings (uncommitted > 30 min)
- Errors (write failed)

## Success Metrics (Revised)

### Week 1 Success
- [ ] Personal handoffs working for Chris
- [ ] No data loss incidents
- [ ] Workflow documented clearly
- [ ] WSL2 documentation complete

### Week 2 Success
- [ ] 3+ beta testers successful
- [ ] No confusion about workflow
- [ ] Positive feedback on approach
- [ ] Ready to announce publicly

### Overall Success
- [ ] Solves markdown display problem
- [ ] Enables personal session continuity
- [ ] No increase in support burden
- [ ] Foundation for team features later

## Key Decisions from Pre-Mortem

1. **Start Personal**: No team features in MVP
2. **GitHub Identity**: Use existing git config
3. **Validation First**: Test core assumptions Day 1
4. **Clear States**: Unambiguous statusline messages
5. **Safety Nets**: Backups, warnings, scanning

## Communication Plan (Revised)

### Week 1 Communications
- **Tuesday**: Internal team update on progress
- **Thursday**: Share WSL2 docs with Windows users
- **Friday**: Blog draft for review

### Week 2 Communications
- **Monday**: Beta tester recruitment
- **Wednesday**: Preview to selected developers
- **Friday**: Public launch

## The Refined Pitch

"Personal session handoffs that live in YOUR git repository, identified by YOUR GitHub identity, managed with YOUR workflow. Start solo, add team features when ready."

---

## Appendix: Complete Pre-Mortem Analysis

### 🔴 Critical Failure Scenarios

#### 1. The "Git Confusion" Disaster
**What Went Wrong**: Users don't understand when handoffs are "saved" vs "committed" vs "synced"
- Claude writes file → User thinks it's done
- File not committed → Lost on branch switch
- User rage: "I lost 3 hours of context!"

**Mitigation**:
- Clear statusline: "⚠️ Handoff written but not committed"
- Auto-commit option for less git-savvy users
- Prominent warnings before branch switches

#### 2. The "Merge Conflict Hell"
**What Went Wrong**: Multiple team members create conflicting handoffs

**Mitigation**: 
- Personal directories: `.ginko/chris/`
- No shared files in MVP
- Team features in v2

#### 3. The "Claude Can't Read" Problem
**What Went Wrong**: Claude can't read back edited handoffs reliably

**Mitigation**:
- Day 1 validation testing
- Abort if read/write unreliable
- Clear fallback instructions

### 🟡 Moderate Failure Scenarios

#### 4. The "Accidental Commit" Issue
**What Went Wrong**: Sensitive information committed to git

**Mitigation**:
- Pre-configured .gitignore
- Secrets scanning
- Review reminder in statusline

#### 5. The "Performance Degradation"
**What Went Wrong**: Large handoff files slow down git

**Mitigation**:
- 50KB warning
- Auto-archive old handoffs
- Compression for archives

#### 6. The "StatusLine Noise"
**What Went Wrong**: StatusLine becomes annoying

**Mitigation**:
- Smart filtering
- Configurable verbosity
- Easy disable option

### Success-Critical Questions (Answered)

1. **Can Claude reliably read/write to `.ginko/`?**
   - Test Day 1 morning, abort if fails

2. **Will git hooks work on all platforms?**
   - Start without hooks, add if reliable

3. **Can we detect file changes reliably?**
   - Use simple file existence first

4. **Will users understand the workflow?**
   - Test with 3 developers Week 2

5. **Can we prevent secret leakage?**
   - .gitignore + scanning from Day 1

### Key Insight from Pre-Mortem

The highest risk isn't technical - it's **conceptual confusion**. 

**Solution**: Make the first experience **magically simple** - just personal handoffs in your own directory, identified by your GitHub username.

---

*This revised plan incorporates all pre-mortem learnings and focuses on personal handoffs first, team features later.*