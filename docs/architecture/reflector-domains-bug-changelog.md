# Reflector Domain Specifications: Bug & Changelog

## Meta-Reflection Analysis

### Problem Statement
BUGS.md and CHANGELOG.md are manually maintained documents that suffer from:
- Inconsistent structure and detail levels
- Manual numbering and date management
- Missing context about root causes and impacts
- No automated workflow integration
- Difficult to query or analyze programmatically

### Solution: Domain-Specific Reflectors
Transform bug tracking and changelog management into reflector domains with AI-enhanced context analysis.

---

## Bug Reflector Domain

### Command Specification

```bash
ginko reflect --domain bug "Description of bug" [options]
```

**Options:**
- `--priority <level>` - Critical|High|Medium|Low (auto-detected if not specified)
- `--status <state>` - Open|InProgress|Testing|Resolved (default: Open)
- `--reporter <name>` - Reporter name (defaults to git config user.name)
- `--no-analysis` - Skip AI root cause analysis
- `--reproduce` - Include reproduction steps section
- `--save` - Automatically save to bug tracking system

### File Naming Pattern

```
BUG-###-short-description-slug.md
```

**Examples:**
- `BUG-005-database-connection-timeout.md`
- `BUG-006-auth-token-refresh-loop.md`
- `BUG-007-windows-path-escaping.md`

**Numbering Rules:**
- Sequential numbering within `.ginko/bugs/` directory
- Zero-padded to 3 digits (BUG-001, BUG-099, BUG-100)
- Auto-detects highest existing number and increments
- Slug generated from description (lowercase, hyphenated, max 5 words)

### Output Location

```
.ginko/bugs/BUG-###-description-slug.md
```

### Reflection Template

```yaml
requiredSections:
  - metadata (number, title, priority, status, reporter, date)
  - problem_description
  - evidence (logs, errors, screenshots)
  - root_cause_analysis
  - impact_assessment
  - reproduction_steps
  - proposed_solutions
  - workaround
  - next_steps

contextToConsider:
  - recent_errors_in_logs
  - related_code_changes (git history)
  - similar_past_bugs
  - affected_components
  - system_environment
  - user_reports

rulesAndConstraints:
  - Priority auto-detection based on keywords (crash/security=Critical, user-facing=High)
  - Include specific error messages and stack traces
  - Root cause analysis uses codebase context
  - Solutions ranked by feasibility and impact
  - Link to related files with line numbers
  - Auto-tag with affected components
```

### AI Reflection Prompts

**Analysis Phase:**
```
Given the bug description: "{intent}"

From the current codebase context:
1. Identify likely root cause by analyzing:
   - Recent code changes in affected areas
   - Similar patterns in existing bugs
   - Common failure modes for this component

2. Assess probable priority:
   - Does it crash the system? (Critical)
   - Does it block user workflows? (High)
   - Does it cause data corruption? (Critical)
   - Is it a visual inconsistency? (Low-Medium)

3. Suggest reproduction steps based on:
   - Component interaction patterns
   - Typical user workflows
   - Error occurrence context

4. Propose solutions considering:
   - Minimal code change required
   - Similar fixes in codebase history
   - Side effects and dependencies
```

**Structured Output:**
```markdown
# BUG-{number}: {Title}

**Reported**: {YYYY-MM-DD}
**Reporter**: {name}
**Priority**: {level}
**Status**: {state}
**Tags**: {auto-detected-components}

## Problem Description
{AI-enhanced description with context}

## Evidence
**Error Messages**:
```
{extracted from logs/context}
```

**Stack Trace**:
{relevant code locations with line numbers}

## Root Cause Analysis
{AI analysis of probable causes based on codebase}

**Affected Components**:
- {component1} ({file}:{line})
- {component2} ({file}:{line})

## Impact Assessment
- **User Impact**: {description}
- **System Impact**: {description}
- **Business Impact**: {description}
- **Affected Users**: {estimate}

## Reproduction Steps
1. {step based on context analysis}
2. {step}
3. **Expected**: {behavior}
4. **Actual**: {behavior}

## Proposed Solutions

### Option 1: {approach} (Recommended)
**Pros**: {benefits}
**Cons**: {drawbacks}
**Effort**: {estimate}
**Risk**: {assessment}

```{language}
// Example implementation
{AI-suggested code change}
```

### Option 2: {alternative approach}
{similar structure}

## Workaround
{if available from context or suggestions}

## Related Issues
- Related to: BUG-{number} - {title}
- Caused by: {commit hash} - {message}
- Blocks: {backlog item}

## Next Steps
- [ ] {actionable step}
- [ ] {step}
- [ ] {step}
```

---

## Changelog Reflector Domain

### Command Specification

```bash
ginko reflect --domain changelog "What changed and why" [options]
```

**Options:**
- `--type <category>` - Added|Changed|Fixed|Removed|Deprecated|Security
- `--version <semver>` - Version number (auto-incremented if not specified)
- `--breaking` - Mark as breaking change
- `--scope <area>` - Component/module affected
- `--ticket <id>` - Link to backlog item or bug
- `--save` - Automatically update CHANGELOG.md

### File Management

**Primary File**: `CHANGELOG.md` (Keep a Changelog format)
**Version Entries**: `.ginko/changelog/v{version}.md` (detailed entries)

### Reflection Template

```yaml
requiredSections:
  - change_type (Added|Changed|Fixed|Removed|Deprecated|Security)
  - version_impact (patch|minor|major)
  - scope_affected
  - change_description
  - technical_details
  - breaking_changes (if applicable)
  - migration_guide (if breaking)
  - related_items

contextToConsider:
  - recent_commits_since_last_version
  - current_version_from_package_json
  - previous_changelog_entries
  - related_bugs_closed
  - related_backlog_completed
  - code_changes_scope

rulesAndConstraints:
  - Follow Keep a Changelog format
  - Group by change type (Added, Changed, Fixed, etc.)
  - Include ticket/PR references
  - Breaking changes must have migration guide
  - Version follows SemVer (major.minor.patch)
  - Link to commits/PRs/issues
```

### AI Reflection Prompts

**Analysis Phase:**
```
Given the change description: "{intent}"

From git history and codebase context:
1. Categorize change type:
   - New features/endpoints/commands? → Added
   - Modified behavior/API? → Changed
   - Bug fixes? → Fixed
   - Feature removal? → Removed/Deprecated

2. Determine version impact (SemVer):
   - Breaking changes? → Major (x.0.0)
   - New features? → Minor (0.x.0)
   - Bug fixes only? → Patch (0.0.x)

3. Identify scope:
   - Affected packages/modules
   - User-facing vs internal
   - API surface changes

4. Generate migration notes (if breaking):
   - What breaks
   - How to update
   - Code examples
```

**Structured Output:**
```markdown
# Changelog Entry

## Version: {auto-calculated}
**Date**: {YYYY-MM-DD}
**Type**: {change-type}
**Scope**: {affected-areas}
{**Breaking**: Yes (if applicable)}

## {Change Type}

### {Feature/Fix Title}
{AI-enhanced description based on commits and context}

**Technical Details**:
- Changed: {files/components}
- Impact: {user-facing description}
- Related: {BUG-xxx, BACKLOG-xxx, PR #xxx}

{If breaking:}
**Breaking Change**:
- **What breaks**: {specific incompatibility}
- **Migration path**: {step-by-step guide}
```diff
// Before
{old code pattern}

// After
{new code pattern}
```

**Linked Items**:
- Implements: BACKLOG-{number}
- Fixes: BUG-{number}
- PR: #{number}
- Commits: {hash range}

---

## Example Usage Workflows

### Report a Bug
```bash
$ ginko reflect --domain bug "Database connections timing out after 5 minutes of inactivity"

🔍 Analyzing bug with context...
   ✓ Scanned recent logs
   ✓ Analyzed related code changes
   ✓ Checked similar past issues

📋 Bug Analysis:
   Priority: HIGH (auto-detected from "timeout" + user impact)
   Affected: src/database/connection-pool.ts
   Probable cause: Missing connection keepalive

💾 Created: .ginko/bugs/BUG-005-database-connection-timeout.md

Next steps:
   1. Review proposed solutions
   2. Test reproduction steps
   3. Assign to developer
```

### Log a Change
```bash
$ ginko reflect --domain changelog "Added support for PostgreSQL connection pooling with automatic retry"

📊 Analyzing change impact...
   ✓ Detected type: Added (new feature)
   ✓ Version impact: Minor (0.x.0)
   ✓ Scope: database, connection-management
   ✓ No breaking changes detected

📝 Changelog Entry:
   Version: 1.2.0 → 1.3.0
   Category: Added

### Added
- PostgreSQL connection pooling with automatic retry logic
  - Configurable pool size (min: 2, max: 10)
  - Exponential backoff for failed connections
  - Health checks every 30 seconds
  - Related: BACKLOG-042, PR #127

💾 Updated: CHANGELOG.md
💾 Created: .ginko/changelog/v1.3.0.md
```

---

## Implementation Architecture

### Directory Structure
```
.ginko/
├── bugs/
│   ├── BUG-001-auth-token-expiry.md
│   ├── BUG-002-file-upload-limit.md
│   └── index.json (metadata for querying)
├── changelog/
│   ├── v1.0.0.md
│   ├── v1.1.0.md
│   └── index.json
└── config/
    └── reflector-domains.json
```

### Integration Points

**Bug Reflector Integration:**
- `ginko doctor` - Check for unresolved critical bugs
- `ginko backlog` - Link bugs to backlog items
- `ginko test` - Reference reproduction steps
- Git hooks - Auto-detect "fixes BUG-xxx" in commits

**Changelog Reflector Integration:**
- `ginko ship` - Auto-generate changelog from commits
- `ginko handoff` - Include recent changes in session context
- Package publishing - Auto-update version and changelog
- Release notes generation

### Query Interface

```bash
# List bugs by priority
ginko bugs list --priority critical

# Show bug details
ginko bugs show BUG-005

# Search bugs
ginko bugs search "database connection"

# Bug statistics
ginko bugs stats --since 2025-09-01

# Generate release notes
ginko changelog generate --since v1.0.0 --to v1.1.0

# View changes by type
ginko changelog show --type breaking
```

---

## Benefits

### For Bug Tracking
- **Context-Aware**: AI analyzes codebase for root causes
- **Consistent Structure**: Every bug follows same format
- **Automated Numbering**: No manual sequence management
- **Rich Metadata**: Auto-tagging, linking, categorization
- **Searchable**: JSON index for programmatic queries

### For Changelog Management
- **Automated Version Calculation**: SemVer based on change types
- **Git Integration**: Derives entries from commit history
- **Keep a Changelog Compliant**: Industry standard format
- **Migration Guides**: Auto-generated for breaking changes
- **Release Automation**: Ready for CI/CD integration

### Universal Benefits
- **AI-Enhanced**: Reflection provides context, suggestions, analysis
- **Workflow Integration**: Hooks into existing Ginko commands
- **Team Collaboration**: Structured format for communication
- **Historical Analysis**: Query patterns, trends, impacts over time