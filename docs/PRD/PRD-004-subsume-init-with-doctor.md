# PRD: Subsume ginko init with ginko doctor Command

## Executive Summary
Transform `ginko init` from a standalone initialization command into an intelligent special case of `ginko doctor`, creating a unified command that can handle any project state from uninitialized to fully configured, reducing cognitive load and eliminating edge cases while leveraging the full power of our diagnostic and repair architecture.

## Problem Statement

### Current State
The ginko CLI currently maintains separate commands for initialization (`ginko init`) and diagnosis/repair (`ginko doctor`). This separation creates artificial boundaries between "setup" and "maintenance" that don't reflect real-world usage patterns. Users must remember which command to use based on their project's state, leading to errors and confusion.

### User Pain Points

1. **Command Confusion**: Users unsure whether to use `init` or `doctor`
   - Impact: Wasted time trying wrong commands, frustration, potential abandonment
   - Frequency: Every new user, every fresh project, every state change
   - Severity: High

2. **State Transition Failures**: Errors when project is partially initialized
   - Impact: Manual intervention required, broken workflows, lost productivity
   - Frequency: Common during migrations, updates, or interrupted setups
   - Severity: Critical

3. **Redundant Error Messages**: "Already initialized" or "Not initialized" blocks progress
   - Impact: Users must manually determine correct command sequence
   - Frequency: Daily for active developers across multiple projects
   - Severity: Medium

4. **Mental Model Complexity**: Two commands for what is conceptually one operation (ensuring healthy state)
   - Impact: Increased learning curve, documentation complexity, support burden
   - Frequency: Continuous cognitive overhead
   - Severity: Medium

### Root Cause Analysis
The separation of `init` and `doctor` stems from traditional CLI design where commands have single, specific purposes. However, with our intelligent doctor system capable of diagnosing and repairing any state, this separation is now an artificial constraint that creates more problems than it solves. Initialization is simply repairing the specific condition of "no ginko configuration present."

## Desired Outcomes

### User Outcomes
- Users will be able to run a single command (`ginko doctor`) regardless of project state
- Users will no longer need to determine whether to initialize or repair
- Users will experience seamless state transitions with intelligent guidance

### Business Outcomes
- Reduce support tickets related to initialization errors by 80%
- Decrease time-to-first-success from 5 minutes to < 1 minute
- Enable 95% of users to self-resolve all setup issues without documentation

## Success Metrics

| Metric | Current Value | Target Value | Measurement Method |
|--------|--------------|--------------|-------------------|
| Command Success Rate | 70% (init failures) | 95% | CLI telemetry |
| Time to First Success | 5 minutes | < 1 minute | User tracking |
| Support Tickets (init) | 50/month | < 10/month | Support system |
| User Retention (Day 1) | 60% | 85% | Usage analytics |
| Edge Case Failures | 15% | < 2% | Error reporting |

## User Stories

### Epic: Unified Intelligent Command

- **As a** developer
- **I want** one command that works regardless of project state
- **So that** I don't have to think about which command to use

#### Story 1: Fresh Project Initialization
- **As a** new ginko user
- **I want** to run `ginko doctor` in an empty project
- **So that** it automatically detects and offers to initialize
- **Acceptance Criteria**:
  - [ ] Doctor detects uninitialized state
  - [ ] Prompts user to initialize
  - [ ] Completes full initialization
  - [ ] Reports healthy status

#### Story 2: Partial Initialization Recovery
- **As a** developer with interrupted setup
- **I want** `ginko doctor` to complete partial initialization
- **So that** I don't have to start over or debug manually
- **Acceptance Criteria**:
  - [ ] Detects partial initialization
  - [ ] Identifies missing components
  - [ ] Completes only missing parts
  - [ ] Preserves existing configuration

#### Story 3: Idempotent Operations
- **As a** developer
- **I want** to run `ginko doctor` multiple times safely
- **So that** I can ensure healthy state without side effects
- **Acceptance Criteria**:
  - [ ] Running on initialized project is safe
  - [ ] No "already initialized" errors
  - [ ] Reports current health status
  - [ ] Suggests improvements if any

#### Story 4: Backward Compatibility
- **As a** existing ginko user
- **I want** `ginko init` to still work
- **So that** my scripts and workflows don't break
- **Acceptance Criteria**:
  - [ ] `ginko init` continues to function
  - [ ] Delegates to doctor internally
  - [ ] Maintains same output format
  - [ ] Deprecation notice provided

## Functional Requirements

### Must Have (P0)

1. **[REQ-001]**: Doctor detects uninitialized projects
   - Rationale: Core functionality for subsuming init
   - Acceptance: Doctor correctly identifies projects without .ginko/

2. **[REQ-002]**: Doctor performs full initialization when needed
   - Rationale: Must replace init functionality completely
   - Acceptance: Creates all required directories, files, and configurations

3. **[REQ-003]**: Doctor handles partial initialization states
   - Rationale: Real-world resilience for interrupted setups
   - Acceptance: Completes missing components without damaging existing ones

4. **[REQ-004]**: Init command delegates to doctor
   - Rationale: Backward compatibility and transition path
   - Acceptance: `ginko init` internally calls doctor with appropriate parameters

5. **[REQ-005]**: Idempotent operations
   - Rationale: Safety and predictability
   - Acceptance: Running commands multiple times causes no harm

### Should Have (P1)

1. **[REQ-010]**: Intelligent state detection and prompting
   - Rationale: Better user experience
   - Acceptance: Contextual prompts based on detected state

2. **[REQ-011]**: Progressive enhancement for partial states
   - Rationale: Graceful handling of edge cases
   - Acceptance: System enhances existing setup without full reset

3. **[REQ-012]**: Migration from init to doctor messaging
   - Rationale: User education and transition
   - Acceptance: Clear messaging guides users to new pattern

### Nice to Have (P2)

1. **[REQ-020]**: Smart defaults based on project detection
   - Rationale: Even faster setup
   - Acceptance: Detects project type and configures accordingly

2. **[REQ-021]**: Interactive guided setup mode
   - Rationale: Enhanced onboarding
   - Acceptance: Step-by-step wizard for new users

## Non-Functional Requirements

### Performance
- Uninitialized state detection < 100ms
- Full initialization < 2 seconds
- State diagnosis < 500ms

### Security
- No automatic operations without user consent
- Preserve file permissions and ownership
- No exposure of sensitive configuration

### Usability
- Single command for all states
- Clear, actionable messages
- No technical jargon in user-facing text

### Scalability
- Handle projects of any size
- Support future state types without command proliferation
- Extensible diagnostic system

## Solutions Considered

### Option 1: Complete Unification (Recommended)
**Description**: Make init a thin wrapper that delegates to doctor, with doctor smart enough to handle all states
**Pros**:
- Single mental model for users
- Leverages existing doctor architecture
- Eliminates edge cases
- Future-proof design
**Cons**:
- Breaking change in concept
- Requires documentation updates
**Effort**: Small (1 week)
**Risk**: Low

### Option 2: Parallel Commands with Shared Logic
**Description**: Keep both commands but share implementation
**Pros**:
- No breaking changes
- Familiar to existing users
**Cons**:
- Maintains confusion
- Doesn't solve core problem
- Technical debt
**Effort**: Medium (2 weeks)
**Risk**: Medium

### Option 3: Do Nothing
**Description**: Maintain status quo
**Pros**:
- No implementation cost
- No risk
**Cons**:
- Problems persist
- Support burden continues
- Poor user experience
**Effort**: None
**Risk**: High (user abandonment)

## Recommended Solution

**Recommendation**: Option 1 - Complete Unification

**Rationale**:
The doctor system's architecture is already designed to handle any state diagnosis and repair. Initialization is simply a special case of repair where the diagnosis is "no ginko present." By unifying these commands, we eliminate an entire category of user errors while simplifying the mental model to "run doctor whenever you need help."

## Value Assessment

### Cost-Benefit Analysis
- **Implementation Cost**: 5 person-days
- **Ongoing Cost**: Reduced (fewer commands to maintain)
- **Support Cost Savings**: 40 hours/month reduction in support
- **User Productivity Gains**: 5 minutes saved per initialization × thousands of users
- **ROI Timeline**: 2 weeks

### Strategic Value
- **Competitive Advantage**: First CLI with truly intelligent self-configuration
- **Market Positioning**: "The CLI that just works"
- **Platform Capabilities**: Foundation for future AI-driven features
- **Future Opportunities**: Extend pattern to other commands

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|--------------------|
| User confusion during transition | Medium | Low | Clear documentation, migration messages |
| Breaking existing workflows | Low | Medium | Maintain backward compatibility |
| Unexpected state handling bugs | Low | High | Comprehensive testing, gradual rollout |
| Performance regression | Low | Low | Benchmark before/after, optimization |

## Timeline and Phases

### Phase 1: Core Implementation (Week 1)
- Enhance doctor to detect uninitialized state
- Implement initialization as repair operation
- Make init delegate to doctor
- Success Criteria: All init scenarios work through doctor

### Phase 2: Edge Case Handling (Week 2)
- Handle partial initialization states
- Add interactive prompts
- Implement progressive enhancement
- Success Criteria: 95% of edge cases handled gracefully

### Phase 3: Polish and Migration (Week 3)
- Update documentation
- Add transition messaging
- Performance optimization
- Success Criteria: < 1 minute time-to-first-success

## Stakeholders

| Role | Name/Team | Interest | Influence |
|------|-----------|----------|----------|
| Sponsor | Product Team | High | High |
| Users | All Developers | High | Medium |
| Engineering | CLI Team | Medium | High |
| Support | DevRel Team | High | Medium |
| Documentation | Tech Writers | Medium | Low |

## Appendix

### Research Data
- UX Testing Notes: docs/UX/windows-fresh-install.md
- Architecture Decision: docs/adr/ADR-028-first-use-experience-architecture.md
- Doctor System PRD: docs/PRD/PRD-003-ginko-doctor-reflector.md

### Related Documents
- ADR-028: First-Use Experience Enhancement Architecture
- PRD-003: Ginko Doctor Reflector
- PRD-2025-09-18: First-Use Experience Enhancement

### Implementation Notes
The implementation leverages the existing doctor system's DiagnosticEngine and RepairEngine, requiring minimal new code. The primary work is enhancing the diagnostic checks to recognize uninitialized states and treat initialization as a repair operation.

---
**Document Status**: Draft
**Last Updated**: 2025-09-19
**Author**: Product Team
**Reviewers**: Engineering, DevRel, UX