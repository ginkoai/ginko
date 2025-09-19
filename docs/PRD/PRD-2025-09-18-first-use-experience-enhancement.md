# Product Requirements Document: Ginko First-Use Experience Enhancement

## Executive Summary
This PRD outlines critical improvements to the ginko CLI first-use experience based on comprehensive Windows fresh install testing. The primary goal is to reduce time-to-value from installation to productive use from the current 15-30 minutes to under 5 minutes while preventing common configuration errors that can corrupt project context.

## Problem Statement

### Current Pain Points
1. **Git Repository Requirement Not Clear** (Critical)
   - Users encounter cryptic git errors when running commands outside git repos
   - No guidance provided on how to resolve the issue
   - Results in immediate abandonment for non-technical users

2. **Context Isolation Failures** (Critical)
   - `ginko init` creates `.ginko/` directories in wrong locations
   - No validation of appropriate initialization location
   - Risk of context pollution across projects
   - Can lead to security risks from leaked project-specific patterns

3. **Directory Navigation Confusion** (High)
   - No clear guidance on expected working directory
   - Users unsure where to run commands after installation
   - Multiple `.ginko/` directories created accidentally

4. **Missing Initialization Guidance** (High)
   - Commands fail with unhelpful errors when project not initialized
   - No suggestion to run `ginko init` first
   - Users don't understand the initialization requirement

5. **Path Conflicts with Existing Projects** (Medium)
   - Hard-coded paths (docs/adr, docs/PRD) may conflict with existing structures
   - No configuration option to customize paths
   - Forces users to restructure existing projects

6. **Inconsistent Document Naming Standards** (Medium)
   - Various naming conventions across document types
   - Difficulty in sorting and finding documents chronologically
   - No automated naming enforcement leading to manual errors
   - Inconsistent patterns make programmatic access difficult

7. **Cross-Platform Hook Configuration Issues** (Medium)
   - Claude hooks configured with Unix/macOS paths fail on Windows
   - Hook scripts (.sh) incompatible with Windows batch/PowerShell
   - Users migrating between platforms encounter persistent hook errors
   - No automatic detection and adaptation of hook paths per platform

## Success Metrics

### Primary KPIs
- **Time to First Success**: < 5 minutes (from installation to productive use)
- **Installation Success Rate**: > 95% complete setup without errors
- **Context Isolation Success**: 100% of initializations in correct location
- **Zero Configuration Errors**: 0% chance of cross-project contamination

### Secondary KPIs
- **User Retention**: > 80% continue using after first session
- **Support Tickets**: < 5% of users require installation help
- **Path Conflict Resolution**: 100% of existing projects can integrate without restructuring
- **Document Naming Compliance**: > 95% of generated documents follow standard naming convention

## User Stories

### Story 1: First-Time Developer
**As a** developer new to ginko
**I want to** understand prerequisites and setup requirements immediately
**So that I** can start using the tool without confusion

**Acceptance Criteria:**
- Clear prerequisite checks on first run
- Guided setup flow for missing requirements
- Success confirmation with next steps

### Story 2: Existing Project Integration
**As a** developer with an existing project structure
**I want to** configure ginko to work with my current setup
**So that I** don't have to restructure my project

**Acceptance Criteria:**
- Configurable documentation paths
- Detection of existing structures
- Non-destructive integration

### Story 3: Context Isolation
**As a** developer working on multiple projects
**I want to** ensure each project's context remains isolated
**So that I** don't leak sensitive patterns between projects

**Acceptance Criteria:**
- Git repository validation before initialization
- Clear boundaries for context storage
- Warning for misplaced `.ginko/` directories

### Story 4: Document Organization
**As a** team lead managing documentation
**I want to** have consistent document naming across all generated files
**So that I** can easily find, sort, and reference documents programmatically

**Acceptance Criteria:**
- Automatic naming with TYPE-###-description format
- Sequential numbering within document types
- Ability to rename while preserving convention
- Clear sorting and discovery of documents

### Story 5: Cross-Platform Compatibility
**As a** developer switching between Windows/Mac/Linux
**I want to** have ginko work seamlessly across platforms
**So that I** don't encounter platform-specific errors

**Acceptance Criteria:**
- Automatic detection of current platform
- Platform-appropriate hook scripts and paths
- Migration tool for moving between platforms
- Clear error messages for platform-specific issues

## Solution Overview

### Phase 1: Critical Safety Features (Week 1)

#### 1.1 Git Repository Validation
```typescript
// Before any ginko command execution
if (!isGitRepository()) {
  console.log(`
    ✗ Not in a git repository

    Ginko requires a git repository for context tracking.

    Options:
    → Initialize git: git init
    → Navigate to existing repo: cd /path/to/your/project
    → Clone a repository: git clone <repository-url>

    Then run: ginko init
  `);
  process.exit(1);
}
```

#### 1.2 Initialization Location Validation
```typescript
// In ginko init command
async function validateInitLocation() {
  // Check if we're in a git repo
  if (!isGitRepository()) {
    throw new Error("Please run from within a git repository");
  }

  // Check for parent .ginko directories
  const parentGinko = findParentGinko();
  if (parentGinko) {
    console.warn(`
      ⚠️ Found .ginko/ in parent directory: ${parentGinko}
      This may cause context conflicts.

      Continue initialization here? (y/n)
    `);
  }

  // Show where we'll initialize
  console.log(`Will initialize ginko in: ${process.cwd()}`);
}
```

#### 1.3 Missing Initialization Detection
```typescript
// Add to all ginko commands
if (!fs.existsSync('.ginko')) {
  console.log(`
    ✗ Ginko not initialized in this project

    → Run 'ginko init' to set up AI collaboration

    This will create:
    • .ginko/ - Context and session storage
    • CLAUDE.md - AI collaboration guide
    • ginko.json - Configuration (optional)
  `);
  process.exit(1);
}
```

### Phase 2: Configuration System (Week 2)

#### 2.1 ginko.json Configuration
```json
{
  "version": "1.0.0",
  "paths": {
    "docs": {
      "root": "docs",
      "adr": "${docs.root}/adr",
      "prd": "${docs.root}/PRD",
      "sprints": "${docs.root}/sprints"
    },
    "ginko": {
      "root": ".ginko",
      "context": "${ginko.root}/context",
      "sessions": "${ginko.root}/sessions",
      "backlog": "${ginko.root}/backlog"
    }
  },
  "features": {
    "autoCapture": true,
    "gitIntegration": true,
    "aiEnhancement": true
  }
}
```

#### 2.2 Interactive Configuration During Init
```typescript
// In ginko init
async function configureGinko() {
  if (fs.existsSync('docs')) {
    const choice = await prompt({
      type: 'list',
      message: 'Found existing docs/ folder. How should ginko organize documentation?',
      choices: [
        { name: 'Use docs/ginko/ subdirectory (recommended)', value: 'docs/ginko' },
        { name: 'Use docs/ directly (may conflict)', value: 'docs' },
        { name: 'Custom path...', value: 'custom' }
      ]
    });

    return generateConfig(choice);
  }

  return defaultConfig();
}
```

### Phase 3: Document Naming Standardization (Week 3)

#### 3.1 Naming Convention System
```typescript
interface DocumentNamingConfig {
  types: {
    ADR: { prefix: "ADR", path: "docs/adr" },
    PRD: { prefix: "PRD", path: "docs/PRD" },
    SPRINT: { prefix: "SPRINT", path: "docs/sprints" }
  },
  format: "{TYPE}-{NUMBER:03d}-{description}",
  dateFormat: "YYYY-MM-DD" // Optional date in description
}

class DocumentNamer {
  async getNextNumber(type: string): Promise<number> {
    const files = await glob(`${config.paths[type]}/${type}-*.md`);
    const numbers = files.map(extractNumber).filter(Boolean);
    return Math.max(0, ...numbers) + 1;
  }

  generateName(type: string, description: string): string {
    const number = await this.getNextNumber(type);
    const sanitized = description
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return `${type}-${String(number).padStart(3, '0')}-${sanitized}.md`;
  }
}
```

#### 3.2 Automatic Renaming Tool
```bash
ginko rename --standardize

Scanning for documents to standardize...
Found 15 documents with non-standard names:

✗ architecture-decision-auth.md
  → ADR-001-authentication-architecture.md

✗ PRD_user_management.md
  → PRD-002-user-management.md

✗ sprint-2025-09-16.md
  → SPRINT-001-2025-09-16.md

Rename all? (y/n/interactive)
```

#### 3.3 Naming Enforcement
```typescript
// In ginko reflect command
async function createDocument(domain: string, content: string) {
  const config = getDocumentConfig(domain);
  const filename = await documentNamer.generateName(
    config.type,
    extractTitle(content)
  );

  console.log(`Creating: ${filename}`);
  await fs.writeFile(path.join(config.path, filename), content);
}
```

### Phase 4: First-Run Experience (Week 4)

#### 4.1 Welcome Flow
```typescript
// On first run after installation
async function firstRunExperience() {
  console.log(`
    🌿 Welcome to Ginko!

    Let's set up AI-powered collaboration for your project.

    Prerequisites check:
    ✓ Node.js ${process.version}
    ${checkGit()}
    ${checkGitRepo()}

    Ready to initialize? (y/n)
  `);

  if (await confirm()) {
    await ginkoInit();
  }
}
```

#### 4.2 Guided Setup
```typescript
async function guidedSetup() {
  // Step 1: Check environment
  await checkPrerequisites();

  // Step 2: Detect project type
  const projectType = await detectProjectType();

  // Step 3: Configure paths
  const config = await configurePaths(projectType);

  // Step 4: Initialize
  await initializeGinko(config);

  // Step 5: Success confirmation
  showSuccessGuide();
}
```

### Phase 5: Cross-Platform Compatibility (Week 5)

#### 5.1 Platform Detection and Adaptation
```typescript
class PlatformAdapter {
  detectPlatform(): Platform {
    if (process.platform === 'win32') return 'windows';
    if (process.platform === 'darwin') return 'macos';
    return 'linux';
  }

  getHookExtension(): string {
    const platform = this.detectPlatform();
    return {
      windows: '.bat',
      macos: '.sh',
      linux: '.sh'
    }[platform];
  }

  adaptHookPath(hookName: string): string {
    const platform = this.detectPlatform();
    const homeDir = os.homedir();
    const ext = this.getHookExtension();

    return path.join(homeDir, '.claude', 'hooks', `${hookName}${ext}`);
  }
}
```

#### 5.2 Hook Migration Tool
```typescript
async function migrateHooks() {
  const platform = platformAdapter.detectPlatform();
  const oldHooks = await findExistingHooks();

  for (const hook of oldHooks) {
    if (hook.platform !== platform) {
      console.log(`Migrating ${hook.name} from ${hook.platform} to ${platform}`);
      await convertHookScript(hook, platform);
    }
  }
}

// Example conversion
function convertShToBat(shContent: string): string {
  // Convert common shell commands to batch equivalents
  return shContent
    .replace(/^#!/, '@echo off\nREM ')
    .replace(/exit 0/g, 'exit /b 0')
    .replace(/echo /g, 'echo ');
}
```

#### 5.3 Platform-Specific Hook Templates
```typescript
const hookTemplates = {
  windows: {
    post_tool_use: `@echo off
REM Windows post-tool-use hook
REM Add your Windows-specific logic here
exit /b 0`,
  },
  unix: {
    post_tool_use: `#!/bin/bash
# Unix/macOS post-tool-use hook
# Add your Unix-specific logic here
exit 0`,
  }
};
```

### Phase 6: Safety and Recovery Tools (Week 6)

#### 6.1 ginko doctor Command
```bash
ginko doctor

Checking ginko health...
✓ Git repository detected
✓ .ginko/ in correct location
⚠ Found orphaned .ginko/ in parent directory
✓ Configuration valid
✗ Missing required paths

Suggested fixes:
1. Remove orphaned .ginko/: rm -rf ../.ginko
2. Create missing paths: mkdir -p docs/adr

Run 'ginko doctor --fix' to auto-repair
```

#### 6.2 Context Isolation Enforcement
```typescript
// Never search parent directories
function loadContext() {
  const gitRoot = getGitRoot();
  const contextPath = path.join(gitRoot, '.ginko');

  // Only load from git root, never parents
  if (!fs.existsSync(contextPath)) {
    throw new Error('Context not found. Run ginko init');
  }

  return loadContextFrom(contextPath);
}
```

## Technical Requirements

### Performance Requirements
- Initialization: < 2 seconds
- Prerequisite checks: < 500ms
- Configuration loading: < 100ms
- Doctor command: < 3 seconds

### Compatibility
- Node.js 18+
- Git 2.0+
- Windows, macOS, Linux support
- Graceful degradation for missing features

### Security Requirements
- Never store credentials in ginko.json
- Validate all path inputs
- Prevent directory traversal
- Clear context isolation between projects

## Implementation Plan

### Week 1: Critical Safety
- [ ] Git repository validation
- [ ] Initialization location checks
- [ ] Missing init detection
- [ ] Basic error messages

### Week 2: Configuration
- [ ] ginko.json schema
- [ ] Config loader implementation
- [ ] Path resolution system
- [ ] Update all reflectors

### Week 3: Document Naming Standardization
- [ ] Implement DocumentNamer class
- [ ] Create automatic renaming tool
- [ ] Add naming enforcement to reflect commands
- [ ] Update existing document generators
- [ ] Add migration tool for existing documents

### Week 4: First-Run UX
- [ ] Welcome flow
- [ ] Guided setup
- [ ] Project type detection
- [ ] Success confirmation

### Week 5: Cross-Platform Compatibility
- [ ] Implement platform detection
- [ ] Create hook migration tool
- [ ] Add platform-specific templates
- [ ] Test on Windows/Mac/Linux
- [ ] Update documentation for each platform

### Week 6: Safety Tools
- [ ] ginko doctor command
- [ ] Auto-repair functionality
- [ ] Context isolation enforcement
- [ ] Migration tools

## Testing Strategy

### Unit Tests
- Path resolution logic
- Configuration validation
- Git repository detection
- Error message generation
- Document naming logic
- Number extraction and sequencing
- Platform detection logic
- Hook path adaptation

### Integration Tests
- Full initialization flow
- Configuration with existing projects
- Doctor command repairs
- Cross-platform compatibility
- Document renaming workflow
- Naming conflict resolution
- Hook migration between platforms
- Platform-specific script execution

### User Acceptance Testing
- Fresh install on Windows/Mac/Linux
- Integration with existing projects
- Multi-project context isolation
- Error recovery scenarios

## Rollout Strategy

### Beta Testing (Week 7)
- Internal team testing
- 10 external beta users
- Gather feedback on UX
- Identify edge cases
- Test document naming migration

### Gradual Rollout (Week 8)
- 10% of users: Monitor for issues
- 50% of users: Confirm stability
- 100% of users: Full release

### Success Criteria for Launch
- Zero critical bugs in beta
- > 90% successful installations
- < 5 minute average setup time
- Positive user feedback
- > 95% document naming compliance
- Successful migration of existing documents

## Risk Analysis

### High Risk
- **Breaking existing installations**: Mitigate with backward compatibility
- **Path conflicts**: Mitigate with configuration system
- **Cross-platform issues**: Mitigate with thorough testing

### Medium Risk
- **User confusion**: Mitigate with clear documentation
- **Performance regression**: Mitigate with benchmarking
- **Config complexity**: Mitigate with smart defaults
- **Document renaming breaking references**: Mitigate with reference updater
- **Naming conflicts**: Mitigate with collision detection

### Low Risk
- **Adoption resistance**: Mitigate with gradual rollout
- **Documentation gaps**: Mitigate with user feedback

## Future Enhancements

### Phase 5: Performance Optimization
- In-memory daemon for instant context access
- Intelligent caching strategies
- Background synchronization

### Phase 6: Advanced Integration
- External tool integration (Jira, ADO)
- Team configuration sharing
- Cloud backup options

### Phase 7: AI Enhancement
- Auto-detection of project patterns
- Intelligent path suggestions
- Context pre-loading

## Success Metrics Review

### Launch + 1 Week
- Installation success rate
- Time to first success
- Error report frequency

### Launch + 1 Month
- User retention
- Feature adoption
- Support ticket volume

### Launch + 3 Months
- User satisfaction scores
- Community contributions
- Enterprise adoption rate

## Appendix

### A. Error Message Guidelines
All error messages should:
1. Clearly state the problem
2. Explain why it matters
3. Provide actionable solutions
4. Include relevant commands

### B. Document Naming Examples
```
Standard Format: TYPE-###-description.md

Examples:
- ADR-001-authentication-strategy.md
- ADR-002-database-selection.md
- PRD-001-user-management.md
- PRD-002-first-use-experience.md
- SPRINT-001-2025-09-16.md
- SPRINT-002-2025-09-23.md

Benefits:
- Chronological sorting by type
- Easy programmatic parsing
- Clear document type identification
- Consistent across teams
```

### C. Configuration Examples
```json
// Existing project with custom structure
{
  "paths": {
    "docs": {
      "root": "documentation",
      "adr": "architecture/decisions",
      "prd": "requirements"
    }
  }
}

// Monorepo configuration
{
  "paths": {
    "docs": {
      "root": "packages/shared/docs"
    }
  }
}
```

### D. Migration Guide
For users with existing ginko installations:
1. Run `ginko doctor` to identify issues
2. Back up existing `.ginko/` directory
3. Run `ginko init --migrate` to update
4. Verify with `ginko doctor --verify`

---

**Document Version**: 1.0.0
**Last Updated**: 2025-09-18
**Author**: Product Team
**Status**: Ready for Review