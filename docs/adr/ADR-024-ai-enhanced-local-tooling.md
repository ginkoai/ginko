# ADR-024: AI-Enhanced Local Tooling Pattern

## Status
Accepted

## Date
2025-08-27

## Context

Traditional CLI tools follow a simple execution model: receive input, process it deterministically, return output. This model, while reliable, cannot leverage contextual intelligence or provide rich, situation-aware enhancements.

Meanwhile, AI assistants like Claude can provide intelligent analysis and content generation but require manual, verbose interactions that break developer flow. Users must explicitly ask for file creation, provide templates, specify formats, and guide the AI through multi-step processes.

There's an opportunity to combine the speed of CLI tools with the intelligence of AI assistants, all while maintaining complete data privacy by keeping everything local.

## Decision

Implement an **AI-Enhanced Local Tooling Pattern** where CLI commands orchestrate a local AI assistant to enrich and complete operations intelligently.

## Core Principle

### "Nothing Special, Just Quicker"

Ginko doesn't introduce new concepts or foreign workflows. It simply makes natural developer tasks faster through intelligent automation. Every Ginko command is something developers already do - we just remove the friction.

## The Pattern

### CLI → AI → CLI Loop

```
User Input → CLI (Phase 1) → Template + AI Prompt → AI Processing → CLI (Phase 2) → Storage
```

All execution happens locally on the user's machine. No data leaves the workstation.

### Two-Phase Execution Model

**Phase 1: Template Generation**
```bash
$ ginko capture "Bcrypt rounds must be 10+ for production"
# CLI generates template with AI instructions
# Returns template + prompt for AI enhancement
# Exit code 42 signals AI processing needed
```

**Phase 2: Enhanced Content Storage**
```bash
$ ginko capture --store --id=capture-1234 --content="[AI-enriched content]"
# CLI stores the AI-enhanced content
# Returns minimal feedback: "done"
```

## Implementation Details

### Template Structure with AI Placeholders

Templates include explicit instructions for AI enhancement:

```markdown
---
type: [detected-type]
tags: [extracted-tags]
created: [date]
---

# [User's description]

## Context
[AI: Analyze why this was discovered and what problem it solves based on current work]

## Technical Details  
[AI: Provide specific technical explanation with concrete details from the codebase]

## Code Examples
[AI: Include before/after code examples from actual files being worked on]

## Impact
[AI: Describe implications, trade-offs, and downstream effects]

## References
[AI: Add links to documentation, tickets, or related files in the project]
```

### AI Enhancement Instructions

The CLI provides specific prompts to the AI:

```
Please complete this context module about bcrypt security requirements:
1. Analyze the current codebase for bcrypt usage
2. Include specific examples from files in /src/auth/
3. Reference any existing security configurations
4. Explain the security implications
5. When complete, call: ginko capture --store --id=capture-1234 --content="[your enriched content]"
```

### Exit Codes for Flow Control

- `0`: Success, operation complete
- `42`: AI enhancement required (special signal)
- `1`: Error occurred
- `130`: User interrupted (Ctrl+C)

## Applications Across Commands

### Capture (Primary Use Case)
```bash
$ ginko capture "React hooks need cleanup"
# → Template with AI placeholders
# → AI enriches with examples, patterns, implications
# → Stored as rich context module
```

### Handoff
```bash
$ ginko handoff "Refactored authentication"
# → AI analyzes session work
# → Extracts key decisions and changes
# → Creates comprehensive handoff
```

### Ship
```bash
$ ginko ship "Fix security vulnerability"  
# → AI writes detailed commit message
# → Generates PR description
# → Documents changes made
```

### Vibecheck
```bash
$ ginko vibecheck "Feel like I'm over-engineering"
# → AI analyzes recent work patterns
# → Suggests simplifications
# → Provides realignment guidance
```

## Privacy and Trust Model

### Data Flow
1. **User Input**: Provided locally via CLI
2. **CLI Processing**: Generates templates locally
3. **AI Enhancement**: Happens on local machine
4. **Storage**: Saved to local filesystem
5. **Version Control**: User controls what gets committed

### Trust Boundaries
- **User trusts AI**: To enhance templates accurately
- **AI trusts CLI**: To provide good template structure
- **CLI trusts AI**: To follow enhancement instructions
- **System trusts**: All data remains local

### Privacy Guarantees
- ✅ No network calls for core functionality
- ✅ All processing on user's machine
- ✅ User controls what enters version control
- ✅ Optional features clearly marked
- ✅ No telemetry without explicit opt-in

## Natural Workflow Preservation

### Without Ginko (Natural but Slow)
```
"Hey Claude, create a file in .ginko/context/modules/ with frontmatter 
including type gotcha, tags for security and production, document that 
bcrypt rounds must be 10+, include code examples, reference the auth 
files I'm working on, explain the security implications..."
```

### With Ginko (Same Thing, Just Quicker)
```bash
$ ginko capture "Bcrypt rounds must be 10+ for production"
done
```

### The Speed Advantage
- **Manual approach**: 2-5 minutes of typing and back-forth
- **Ginko approach**: 2 seconds of user time
- **Result**: Identical or better quality output

## Implementation Requirements

### CLI Requirements
1. Generate templates with AI placeholders
2. Parse AI-enhanced content from --store calls
3. Validate enhanced content before storage
4. Handle both phases of execution
5. Provide fallback for non-AI environments

### AI Integration Requirements
1. Recognize ginko command outputs
2. Follow enhancement instructions
3. Call back with --store flag
4. Preserve template structure
5. Add contextual intelligence

### Template Requirements
1. Clear AI instruction markers: `[AI: ...]`
2. Structured sections for enhancement
3. Frontmatter for metadata
4. Markdown for content
5. Extensible format

## Consequences

### Positive
- **10-100x faster** than manual AI interaction
- **Consistent quality** through templates
- **Rich context** from AI intelligence
- **Zero learning curve** - natural workflows
- **Complete privacy** - local execution
- **Git-native** - version controlled

### Negative
- Requires AI assistant availability
- Template rigidity might limit some use cases
- Two-phase execution adds complexity
- AI behavior may vary across models

### Mitigations
- Provide --no-ai flag for template-only mode
- Allow custom templates via configuration
- Support single-phase mode for simple captures
- Document AI model-specific behaviors

## Examples

### Simple Capture
```bash
$ ginko capture "Database connections need pooling"
done

# Behind the scenes:
# 1. CLI generated template with connection pooling context
# 2. AI analyzed codebase for database usage
# 3. AI added specific pool size recommendations
# 4. AI included examples from current db config
# 5. CLI stored enriched module
```

### Complex Capture with Review
```bash
$ ginko capture "Authentication flow needs rate limiting" --review
[Shows AI-enriched module with implementation details]
Save? [Y/n]: y
done
```

### Quick Capture without AI
```bash
$ ginko capture "Remember to update docs" --quick
done
# Creates basic template without AI enhancement
```

## Success Metrics

- **Speed**: Commands complete in <5 seconds user time
- **Quality**: AI-enriched content adds measurable value
- **Privacy**: Zero network calls for core functions
- **Adoption**: Natural workflow preservation drives usage

## The Pattern in One Line

**"CLI provides the structure, AI provides the intelligence, everything stays local."**

## References

- ADR-023: Flow State Design Philosophy
- Unix Philosophy: Do one thing well
- Privacy-first architecture principles
- Local-first software movement
- CLI/GUI hybrid interaction patterns