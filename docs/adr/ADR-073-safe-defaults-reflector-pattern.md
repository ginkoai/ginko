# ADR-073: Safe Defaults Pattern for Reflector Pipelines

**Status**: Proposed
**Date**: 2025-09-15
**Deciders**: Chris Norton, AI Assistant
**Category**: Architecture Pattern

## Context

As we implement reflector pipelines using the Simple Builder Pattern (ADR-013), we're discovering that certain checks and analyses provide value in most use cases. Sprint planning revealed several common failure modes:

1. **Dependency conflicts** - PRDs depending on incomplete work
2. **Capacity overload** - Requesting more work than velocity supports
3. **Missing traceability** - PRDs without ADRs or backlog decomposition
4. **Incomplete work breakdown** - High-level items without actionable tasks

Currently, users must explicitly request these checks via flags, leading to preventable failures when checks are forgotten.

## Decision

**Implement a Safe Defaults Pattern where reflector pipelines perform beneficial analyses by default, with explicit opt-out flags for bypassing when needed.**

### Core Principles

1. **Safety by Default**: Analyses that prevent common failures run automatically
2. **Explicit Opt-Out**: Skipping safety checks requires intentional flags (--no*)
3. **Graceful Degradation**: Missing data doesn't break the pipeline, just adds warnings
4. **Progressive Disclosure**: Simple cases stay simple, complex cases get help
5. **Single-Pass Maintained**: All checks happen during normal pipeline flow

### Implementation Pattern

```typescript
export interface ReflectorOptions {
  // Opt-in for enhanced features
  wbs?: boolean;       // Additional work breakdown
  trace?: boolean;     // Enhanced traceability checking
  dryrun?: boolean;    // Preview mode
  strict?: boolean;    // Fail on warnings

  // Opt-out for default safety checks
  nodep?: boolean;     // Skip dependency analysis (default: false)
  nowarn?: boolean;    // Skip warning generation (default: false)
  novalidate?: boolean; // Skip validation checks (default: false)
}

export abstract class SafeReflectorPipeline extends SimplePipelineBase {
  protected options: ReflectorOptions;

  constructor(intent: string, options: ReflectorOptions = {}) {
    super(intent);
    // Safe defaults
    this.options = {
      nodep: false,
      nowarn: false,
      novalidate: false,
      ...options
    };
  }

  async gatherContext(): Promise<this> {
    const context = await this.basicContext();

    // Default safety checks (unless opted out)
    if (!this.options.nodep) {
      context.dependencies = await this.analyzeDependencies();
    }

    if (!this.options.novalidate) {
      context.validation = await this.validateInputs();
    }

    // Opt-in enhancements
    if (this.options.trace) {
      context.traceability = await this.verifyTraceability();
    }

    return this;
  }
}
```

## Consequences

### Positive

1. **Fewer Sprint Failures**: Dependency conflicts caught before commitment
2. **Better UX**: Helpful by default without requiring expertise
3. **Intentional Overrides**: --nodep signals conscious decision
4. **Extensible Pattern**: Other reflectors can adopt same approach
5. **Backward Compatible**: Existing pipelines continue working

### Negative

1. **Slightly Slower**: Default checks add processing time (~1-2s)
2. **More Output**: Default warnings might be noise for experts
3. **Learning Curve**: Users need to learn opt-out flags

### Neutral

1. **Documentation Need**: Must clearly explain default behaviors
2. **Flag Proliferation**: More --no* flags to remember
3. **Consistency Requirement**: All reflectors should follow pattern

## Application to Other Reflectors

### Architecture Reflector
- **Default**: Check for conflicting ADRs, validate against existing architecture
- **Opt-out**: `--noconflict` to skip conflict detection

### PRD Reflector
- **Default**: Verify feasibility, check for similar existing PRDs
- **Opt-out**: `--nofeasibility` to skip analysis

### Backlog Reflector
- **Default**: Check for duplicates, validate story format
- **Opt-out**: `--nodup` to skip duplicate detection

### Testing Reflector
- **Default**: Analyze code coverage gaps, check test naming conventions
- **Opt-out**: `--nocoverage` to skip coverage analysis

## Examples

```bash
# Safe by default - all checks run
ginko reflect --domain sprint "PRD-A, PRD-B, PRD-C"
# ✅ Dependencies analyzed
# ✅ Capacity validated
# ✅ Warnings generated

# Explicit opt-out when you know better
ginko reflect --domain sprint "PRD-A" --nodep --nowarn
# ⚡ Faster, skips safety checks

# Strict CI/CD mode
ginko reflect --domain sprint "PRD-A" --strict
# 🛑 Fails if any warnings or dependency issues

# Enhancement flags still opt-in
ginko reflect --domain sprint "PRD-A" --wbs --trace
# ✅ Default checks (dependencies, validation)
# ✅ Enhanced WBS decomposition
# ✅ Enhanced traceability verification
```

## Migration Path

1. **Phase 1**: Implement in SprintPipeline as pilot
2. **Phase 2**: Add to Architecture and PRD pipelines
3. **Phase 3**: Standardize across all reflectors
4. **Phase 4**: Document pattern in team guidelines

## Alternatives Considered

1. **All Opt-In**: Rejected - too easy to miss important checks
2. **All Mandatory**: Rejected - sometimes you need to move fast
3. **Config File Defaults**: Rejected - adds complexity, hides behavior
4. **Interactive Prompts**: Rejected - breaks automation, violates single-pass

## References

- ADR-013: Simple Builder Pattern for Pipelines
- Sprint Planning Reflector Implementation
- Unix Philosophy: "Make easy things easy, hard things possible"
- Principle of Least Surprise

## Decision Outcome

Adopt the Safe Defaults Pattern starting with SprintPipeline. Monitor usage patterns and feedback before expanding to other reflectors. The pattern balances safety with flexibility while maintaining our complexity target of 2/10.