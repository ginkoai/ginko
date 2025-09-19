# Product Requirements Document: Ginko Doctor Reflector

## Executive Summary
The Ginko Doctor Reflector is an AI-powered diagnostic and repair tool that automatically identifies and resolves configuration, filesystem, and environment issues that degrade ginko performance and user experience. By leveraging ambient AI capabilities, it provides intelligent troubleshooting that adapts to user-reported problems and proactively fixes common issues.

## Problem Statement

### Current Challenges
1. **Configuration Drift**
   - Manual edits to `.ginko/config.json` can break functionality
   - Mismatched versions between config and CLI
   - Invalid path configurations causing command failures

2. **Filesystem Corruption**
   - Missing or corrupted `.ginko/` directories
   - Orphaned context files in wrong locations
   - Permission issues preventing read/write operations

3. **Environment Issues**
   - Missing dependencies not in PATH
   - Incorrect Node.js versions
   - Network connectivity problems affecting operations

4. **User Frustration**
   - Cryptic error messages without solutions
   - No automated recovery mechanisms
   - Time wasted on manual troubleshooting

5. **Support Burden**
   - High volume of configuration-related issues
   - Repetitive troubleshooting steps
   - Difficulty diagnosing user environments remotely

## Success Metrics

### Primary KPIs
- **Mean Time to Resolution (MTTR)**: < 2 minutes for common issues
- **Auto-Fix Success Rate**: > 80% of issues resolved without manual intervention
- **Error Recovery Rate**: > 95% of users recover from errors successfully
- **Support Ticket Reduction**: 60% decrease in configuration-related tickets

### Secondary KPIs
- **Diagnostic Coverage**: > 90% of known error conditions detected
- **False Positive Rate**: < 5% incorrect diagnoses
- **User Satisfaction**: > 4.5/5 rating for error recovery experience
- **Performance Impact**: < 500ms diagnostic overhead

## User Stories

### Story 1: Error Recovery
**As a** developer encountering an error
**I want to** have ginko automatically diagnose and fix the issue
**So that I** can continue working without interruption

**Acceptance Criteria:**
- Natural language error reporting
- Automatic root cause analysis
- One-command fix execution
- Clear explanation of what was fixed

### Story 2: Proactive Health Checks
**As a** team lead maintaining ginko installations
**I want to** run periodic health checks
**So that I** can prevent issues before they occur

**Acceptance Criteria:**
- Scheduled diagnostic runs
- Warning for potential issues
- Preventive maintenance suggestions
- Health report generation

### Story 3: AI-Assisted Troubleshooting
**As a** user with a complex issue
**I want to** describe my problem in natural language
**So that I** get intelligent troubleshooting assistance

**Acceptance Criteria:**
- NLP understanding of problem descriptions
- Context-aware diagnostic suggestions
- Step-by-step guided resolution
- Learning from resolution patterns

## Solution Design

### Core Architecture

#### 1. Reflector Interface
```bash
# Standard reflector syntax
ginko reflect --domain doctor "getting error with handoff command"

# Shortcut syntax
ginko doctor "handoff failing with git error"

# Options
ginko doctor --auto-fix         # Automatically apply fixes
ginko doctor --verbose          # Detailed diagnostic output
ginko doctor --check-all        # Run all diagnostics
ginko doctor --report           # Generate health report
```

#### 2. Diagnostic Engine
```typescript
interface DiagnosticCheck {
  name: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  check: () => Promise<DiagnosticResult>;
  fix?: () => Promise<FixResult>;
}

class DiagnosticEngine {
  private checks: Map<string, DiagnosticCheck> = new Map();

  async runDiagnostics(intent: string): Promise<DiagnosticReport> {
    // 1. Parse intent with NLP
    const context = await this.parseIntent(intent);

    // 2. Select relevant checks
    const relevantChecks = this.selectChecks(context);

    // 3. Run diagnostics in parallel
    const results = await Promise.all(
      relevantChecks.map(check => check.check())
    );

    // 4. Generate report with fixes
    return this.generateReport(results);
  }
}
```

### Diagnostic Categories

#### 1. Configuration Diagnostics
```typescript
class ConfigDiagnostics {
  checks = [
    {
      name: 'config-validity',
      description: 'Validate ginko.json structure',
      check: async () => {
        // Validate JSON schema
        // Check required fields
        // Verify path references
      }
    },
    {
      name: 'config-version',
      description: 'Check config version compatibility',
      check: async () => {
        // Compare config version with CLI version
        // Check for deprecated fields
        // Suggest migrations
      }
    }
  ];
}
```

#### 2. Filesystem Diagnostics
```typescript
class FilesystemDiagnostics {
  checks = [
    {
      name: 'ginko-directory',
      description: 'Verify .ginko/ directory structure',
      check: async () => {
        // Check directory exists
        // Verify permissions
        // Validate structure
      }
    },
    {
      name: 'orphaned-files',
      description: 'Find misplaced ginko files',
      check: async () => {
        // Search parent directories
        // Identify duplicate .ginko/ folders
        // Find stray context files
      }
    }
  ];
}
```

#### 3. Environment Diagnostics
```typescript
class EnvironmentDiagnostics {
  checks = [
    {
      name: 'node-version',
      description: 'Check Node.js version compatibility',
      check: async () => {
        // Verify Node.js version >= 18
        // Check npm version
        // Validate global packages
      }
    },
    {
      name: 'path-variables',
      description: 'Verify PATH configuration',
      check: async () => {
        // Check ginko in PATH
        // Verify git availability
        // Test command execution
      }
    },
    {
      name: 'network-connectivity',
      description: 'Test network access if needed',
      check: async () => {
        // Ping ginko update server
        // Check proxy settings
        // Test API endpoints
      }
    }
  ];
}
```

#### 4. Git Integration Diagnostics
```typescript
class GitDiagnostics {
  checks = [
    {
      name: 'git-repository',
      description: 'Verify git repository status',
      check: async () => {
        // Check if in git repo
        // Verify .git directory
        // Test git command availability
      }
    },
    {
      name: 'git-conflicts',
      description: 'Check for merge conflicts',
      check: async () => {
        // Search for conflict markers
        // Check .ginko/ for conflicts
        // Verify clean working tree
      }
    }
  ];
}
```

### AI-Powered Features

#### 1. Natural Language Processing
```typescript
class IntentParser {
  async parse(userInput: string): Promise<DiagnosticContext> {
    // Extract error keywords
    const keywords = this.extractKeywords(userInput);

    // Identify command mentioned
    const command = this.identifyCommand(userInput);

    // Determine error type
    const errorType = this.classifyError(userInput);

    return {
      keywords,
      command,
      errorType,
      originalInput: userInput,
      confidence: this.calculateConfidence()
    };
  }
}
```

#### 2. Intelligent Fix Suggestions
```typescript
class FixSuggestionEngine {
  async suggestFixes(diagnostic: DiagnosticResult): Promise<Fix[]> {
    const fixes = [];

    // Standard fixes from knowledge base
    fixes.push(...this.getStandardFixes(diagnostic));

    // AI-generated contextual fixes
    fixes.push(...await this.generateContextualFixes(diagnostic));

    // Rank by likelihood of success
    return this.rankFixes(fixes);
  }
}
```

### Example Interactions

#### Example 1: Handoff Error
```bash
$ ginko doctor "handoff command failing with git error"

🔍 Analyzing: "handoff command failing with git error"

Running diagnostics...
✓ Configuration valid
✓ Filesystem structure intact
✗ Git repository check failed
  └ Not in a git repository

🔧 Recommended Fix:
Initialize git repository:
  git init
  git add .
  git commit -m "Initial commit"

Apply fix automatically? (y/n): y

✓ Git repository initialized
✓ Initial commit created
✅ Issue resolved! Try running 'ginko handoff' again.
```

#### Example 2: Configuration Issue
```bash
$ ginko doctor "commands not working after update"

🔍 Analyzing: "commands not working after update"

Running diagnostics...
✗ Configuration version mismatch
  └ Config version: 0.9.0
  └ CLI version: 1.0.0
✓ Filesystem structure intact
✓ Environment configured correctly

🔧 Recommended Fixes:
1. Migrate configuration to v1.0.0 format
2. Backup and regenerate configuration

Apply migration? (y/n): y

✓ Configuration backed up to .ginko/config.backup.json
✓ Configuration migrated to v1.0.0
✅ Configuration updated successfully!
```

#### Example 3: Comprehensive Health Check
```bash
$ ginko doctor --check-all --report

🏥 Ginko Health Check Report
============================

Configuration       [✓] Healthy
├ Schema valid      [✓] Pass
├ Paths exist       [✓] Pass
└ Version current   [✓] Pass

Filesystem          [⚠] Warning
├ .ginko/ exists    [✓] Pass
├ Permissions OK    [✓] Pass
└ Orphaned files    [⚠] 2 found in parent directory

Environment         [✓] Healthy
├ Node.js v20.5.0   [✓] Pass
├ Git installed     [✓] Pass
└ Network OK        [✓] Pass

Git Integration     [✓] Healthy
├ Repository valid  [✓] Pass
├ No conflicts      [✓] Pass
└ Clean tree        [✓] Pass

Overall Status: GOOD (1 warning)

📋 Recommendations:
1. Remove orphaned .ginko/ in parent directory
   Run: rm -rf ../.ginko

Report saved to: .ginko/health-report-2025-09-18.json
```

### Auto-Repair Capabilities

#### 1. Safe Auto-Fixes
These can be applied without user confirmation:
- Creating missing directories
- Setting correct permissions
- Updating PATH variables
- Clearing cache files
- Fixing JSON formatting

#### 2. Confirmed Auto-Fixes
Require user approval:
- Migrating configurations
- Deleting orphaned files
- Modifying git repository
- Installing dependencies
- Changing system settings

#### 3. Manual Fixes
Provide instructions only:
- System-level changes
- Security-sensitive operations
- Data deletion
- Network configuration
- Third-party tool installation

## Implementation Plan

### Phase 1: Core Diagnostics (Week 1-2)
- [ ] Implement diagnostic engine framework
- [ ] Create configuration checkers
- [ ] Add filesystem validators
- [ ] Build environment diagnostics
- [ ] Develop git integration checks

### Phase 2: AI Integration (Week 3)
- [ ] Implement intent parser
- [ ] Create fix suggestion engine
- [ ] Add natural language interface
- [ ] Build context analyzer
- [ ] Train error classification model

### Phase 3: Auto-Repair System (Week 4)
- [ ] Implement safe auto-fixes
- [ ] Add confirmation workflow
- [ ] Create rollback mechanism
- [ ] Build fix verification system
- [ ] Add manual fix instructions

### Phase 4: Reporting & Analytics (Week 5)
- [ ] Create health report generator
- [ ] Add diagnostic history tracking
- [ ] Implement error pattern analysis
- [ ] Build performance monitoring
- [ ] Create export functionality

## Testing Strategy

### Unit Tests
- Individual diagnostic checks
- Fix application logic
- Intent parsing accuracy
- Configuration validation

### Integration Tests
- Full diagnostic pipeline
- Auto-repair workflows
- Rollback mechanisms
- Report generation

### User Acceptance Testing
- Natural language understanding
- Fix effectiveness
- Performance impact
- Error recovery success rate

## Risk Analysis

### High Risk
- **Destructive auto-fixes**: Mitigate with confirmation and rollback
- **Misdiagnosis leading to wrong fixes**: Mitigate with confidence scoring
- **Performance degradation**: Mitigate with async operations and caching

### Medium Risk
- **False positives**: Mitigate with threshold tuning
- **Incomplete coverage**: Mitigate with continuous learning
- **User trust in auto-fixes**: Mitigate with transparency and logging

### Low Risk
- **Network dependency**: Mitigate with offline fallbacks
- **Version compatibility**: Mitigate with graceful degradation

## Success Metrics Review

### Launch + 1 Week
- Diagnostic accuracy rate
- Auto-fix success rate
- User engagement metrics

### Launch + 1 Month
- MTTR improvement
- Support ticket reduction
- User satisfaction scores

### Launch + 3 Months
- Error pattern insights
- Proactive fix deployment
- Community contribution of diagnostic checks

## Future Enhancements

### Phase 5: Predictive Diagnostics
- Predict issues before they occur
- Suggest preventive maintenance
- Trend analysis and alerting

### Phase 6: Community Diagnostics
- User-contributed diagnostic checks
- Shared fix patterns
- Collaborative troubleshooting

### Phase 7: Enterprise Features
- Fleet health monitoring
- Centralized diagnostic reporting
- Custom diagnostic policies

---

**Document Version**: 1.0.0
**Last Updated**: 2025-09-18
**Author**: Product Team
**Status**: Draft