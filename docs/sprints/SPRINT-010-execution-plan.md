# SPRINT-010: Git-Native Handoffs + Onboarding Execution Plan

**Sprint Start**: 2025-08-19 (Monday)  
**Sprint End**: 2025-08-30 (2 weeks)  
**Primary Goal**: Ship git-native handoffs MVP + WSL2 documentation  
**Secondary Goal**: Prepare onboarding flow for professional developers

## Strategic Sequencing Decision

### Why Git-Native Handoffs FIRST

1. **Immediate Value**: Solves current pain points for Ginko development itself
2. **Dog-fooding**: We can use it while building it
3. **No Dependencies**: Doesn't require dashboard changes or API work
4. **WSL2 Synergy**: File-based approach works identically on WSL2
5. **Marketing Impact**: Revolutionary feature to announce

### Why WSL2 Documentation PARALLEL

1. **Low Effort**: 1-2 days of documentation work
2. **Unblocks Windows Users**: Professional devs can start using immediately
3. **No Code Changes**: Just documentation and testing
4. **Validates Approach**: Get feedback while building handoffs

### Why Onboarding LAST

1. **Depends on Handoffs**: Better onboarding with killer feature ready
2. **Dashboard Work**: Requires fixing API key generation
3. **Higher Risk**: Multiple system changes needed
4. **Can Ship Incrementally**: WSL2 docs provide partial onboarding

## Week 1: Foundation (Aug 19-23)

### Monday-Tuesday: Git-Native Handoffs MVP
**Owner**: Chris + Claude  
**Goal**: Basic file-based handoff working in Ginko itself

- [ ] Create `.ginko/` directory structure
- [ ] Modify handoff command to write file
- [ ] Test Claude writing markdown file
- [ ] Create simple git hook for commits
- [ ] Document basic workflow

**Success Criteria**: 
- Claude can write handoff to `.ginko/session-handoff.md`
- File is readable in VSCode
- Git tracks the file

### Wednesday: WSL2 Documentation
**Owner**: Chris + Claude  
**Goal**: Professional developers can use Ginko on Windows

- [ ] Write WSL2 setup guide
- [ ] Test on Windows machine (if available)
- [ ] Create troubleshooting section
- [ ] Add to main README
- [ ] Publish to docs site

**Success Criteria**:
- Clear instructions for WSL2 setup
- All commands work in WSL2
- Documentation live on site

### Thursday-Friday: StatusLine Integration
**Owner**: Chris + Claude  
**Goal**: StatusLine shows handoff state

- [ ] Add file watcher to SDK agent
- [ ] Detect handoff file changes
- [ ] Show status in statusline
- [ ] Test edit detection
- [ ] Handle approval flow

**Success Criteria**:
- StatusLine shows "📝 Handoff draft" when file exists
- StatusLine shows "✏️ Editing handoff" when file modified
- StatusLine shows "✅ Handoff committed" after git commit

## Week 2: Enhancement (Aug 26-30)

### Monday-Tuesday: Advanced Git Integration
**Owner**: Chris + Claude  
**Goal**: Robust git workflow

- [ ] Create handoff templates
- [ ] Add archive functionality
- [ ] Implement diff analysis
- [ ] Create PR integration
- [ ] Add metrics tracking

**Success Criteria**:
- Templates available for common session types
- Old handoffs archived by date
- Can see diffs between handoffs

### Wednesday: Server Sync (Optional)
**Owner**: Chris + Claude  
**Goal**: Background sync to server (progressive enhancement)

- [ ] Create sync endpoint for file-based handoffs
- [ ] Add background sync to git hook
- [ ] Handle offline/failure cases
- [ ] Test resilience

**Success Criteria**:
- Handoffs sync to server when online
- Failures don't block local workflow
- Clear status of sync state

### Thursday-Friday: Polish & Demo
**Owner**: Chris + Claude  
**Goal**: Feature ready to ship

- [ ] Create demo video
- [ ] Write blog post
- [ ] Update marketing site
- [ ] Prepare launch announcement
- [ ] Test end-to-end flow

**Success Criteria**:
- Compelling 2-minute demo video
- Blog post explaining paradigm shift
- Feature working smoothly

## Parallel Track: Onboarding Preparation

### Throughout Sprint (Background Work)
**Owner**: Chris  
**Goal**: Prepare for next sprint's onboarding focus

- [ ] Investigate dashboard API key generation
- [ ] Design onboarding flow
- [ ] Create setup script outline
- [ ] List Windows testing requirements
- [ ] Identify beta testers

## Definition of Done

### Git-Native Handoffs ✅
- [ ] File-based handoffs working
- [ ] Git integration complete
- [ ] StatusLine showing state
- [ ] Documentation written
- [ ] Demo video created
- [ ] Blog post published

### WSL2 Support ✅
- [ ] Documentation complete
- [ ] Tested on WSL2
- [ ] Added to README
- [ ] Support guide created

### Ready for Next Sprint ✅
- [ ] Onboarding design complete
- [ ] Beta testers identified
- [ ] Dashboard investigation done

## Risk Mitigation

### Risk 1: File Permissions
**Mitigation**: Clear documentation, standard .gitignore patterns

### Risk 2: Windows Testing
**Mitigation**: WSL2 documentation first, native Windows later

### Risk 3: StatusLine Complexity
**Mitigation**: Start simple, enhance incrementally

### Risk 4: User Confusion
**Mitigation**: Clear documentation, video demo, blog explanation

## Success Metrics

- **Week 1**: Basic handoffs working, WSL2 docs live
- **Week 2**: Full feature shipped, demo created
- **Adoption**: Team using git-native handoffs
- **Feedback**: 3+ professional developers validated approach

## Communication Plan

### Monday Week 1
- Tweet: "Working on something revolutionary for AI session management..."

### Friday Week 1  
- Blog: "Why We're Treating AI Sessions Like Code"

### Friday Week 2
- Launch: "Introducing Git-Native AI Handoffs"
- Demo video
- Full documentation

## Decision: Sequential vs Parallel

### Recommendation: SEQUENTIAL with PARALLEL DOCS

**Week 1**: Git-native handoffs (code) + WSL2 docs (documentation)  
**Week 2**: Polish handoffs + prepare onboarding  
**Week 3** (next sprint): Full onboarding implementation

This approach:
- Ships revolutionary feature in 2 weeks
- Provides Windows support via WSL2 immediately  
- Sets up for comprehensive onboarding next sprint
- Maintains momentum with continuous shipping

## The Pitch for This Approach

"We're not just fixing handoffs - we're inventing a new category. Ship this first, and every other feature becomes easier to explain. 'It's git for AI sessions' is a paradigm shift that will get attention and adoption."

---

*Let's build the future of AI collaboration, one git commit at a time.*