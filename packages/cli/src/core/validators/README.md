# Ginko Validation Layer

This directory contains the validation layer implementation for the ginko CLI, designed to provide comprehensive first-use experience validation as specified in [ADR-028](../../../../../docs/adr/ADR-028-first-use-experience-architecture.md).

## Architecture Overview

The validation layer implements a modular architecture with individual validators coordinated by an orchestrator:

```
┌─────────────────────────────────────────┐
│           ValidationOrchestrator         │
│     (Coordinates all validators)         │
└─────────────┬───────────────────────────┘
              │
    ┌─────────▼─────────┐
    │   Core Validators │
    └─────────┬─────────┘
              │
┌─────────────▼─────────────────────────────┐
│ GitValidator │ ConfigValidator │ EnvValidator │
│   (Git repo) │  (ginko.json)   │ (Node.js)    │
└──────────────┴─────────────────┴──────────────┘
```

## Core Components

### 1. GitValidator (`git-validator.ts`)
Validates git repository requirements:
- ✅ Git command availability
- ✅ Current directory is in a git repository
- ✅ Repository is properly initialized
- ⚠️ Working directory cleanliness (warning only)

**Key Features:**
- Comprehensive git health checks
- Actionable error messages and suggestions
- Graceful handling of edge cases (no commits, corrupted repos)
- Static utility methods for quick checks

### 2. ConfigValidator (`config-validator.ts`)
Validates ginko.json configuration:
- ✅ File exists and is readable
- ✅ Valid JSON syntax
- ✅ Required schema fields present
- ✅ Path validation and accessibility
- ✅ Version format compliance

**Key Features:**
- Schema validation with detailed error reporting
- Default configuration merging
- Path existence checking with warnings
- Support for custom and platform-specific configurations

### 3. EnvironmentValidator (`environment-validator.ts`)
Validates system environment:
- ✅ Node.js version compatibility (18.0.0+ required, 20.0.0+ recommended)
- ✅ Platform detection and support
- ✅ Required commands availability (npm, git)
- ✅ Directory permissions
- ✅ PATH environment validation

**Key Features:**
- Cross-platform compatibility
- Command availability checking
- Permission validation
- Performance-optimized with timeouts

### 4. ValidationOrchestrator (`validation-orchestrator.ts`)
Coordinates all validators:
- 🎯 Runs validators in logical order
- 🎯 Provides comprehensive reporting
- 🎯 Handles timeouts and error recovery
- 🎯 Generates actionable summaries

**Key Features:**
- Critical vs optional validation modes
- Detailed reporting with severity levels
- Timeout handling and graceful degradation
- Comprehensive metadata collection

## Interface Design

All validators implement the standard `Validator` interface:

```typescript
interface Validator {
  validate(): Promise<ValidationResult>;
  getErrorMessage(): string;
  getSuggestions(): string[];
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  suggestions?: string[];
  metadata?: Record<string, any>;
}
```

## Usage Examples

### Quick Validation Functions

```typescript
import {
  validateBasicEnvironment,
  isValidGitRepository,
  validateGinkoConfig,
  canRunGinko
} from './validators';

// Check if ginko can run at all
const canRun = await canRunGinko('./project');

// Individual checks
const hasGit = await isValidGitRepository('./project');
const hasConfig = await validateGinkoConfig('./project');
const envOk = await validateBasicEnvironment();
```

### Comprehensive Validation

```typescript
import { validateGinkoSetup } from './validators';

// Full validation for 'ginko doctor' command
const summary = await validateGinkoSetup({
  projectRoot: './project',
  skipOptional: false,
  verbose: true
});

if (!summary.canProceed) {
  console.error('Cannot proceed with ginko:');
  summary.errors.forEach(error => {
    console.error(`❌ ${error.message}`);
    error.suggestions.forEach(suggestion => {
      console.log(`  → ${suggestion}`);
    });
  });
}
```

### Individual Validator Usage

```typescript
import { GitValidator, ConfigValidator, EnvironmentValidator } from './validators';

// Git validation
const gitValidator = new GitValidator('./project');
const gitResult = await gitValidator.validate();

if (!gitResult.valid) {
  console.error(gitValidator.getErrorMessage());
  gitValidator.getSuggestions().forEach(s => console.log(`  → ${s}`));
}

// Config validation with custom logic
const configValidator = new ConfigValidator('./project');
const configResult = await configValidator.validate();
const config = configValidator.getConfig();
```

## Error Handling Philosophy

The validation layer follows these principles:

1. **Fail Fast, Fail Clear**: Provide immediate, actionable feedback
2. **Progressive Enhancement**: Distinguish between critical and optional features
3. **Graceful Degradation**: Continue validation even when individual checks fail
4. **Actionable Guidance**: Every error includes specific suggestions for resolution

## Integration Points

### CLI Commands

The validation layer integrates with several CLI commands:

- **`ginko init`**: Pre-flight validation before initialization
- **`ginko doctor`**: Comprehensive health check and diagnostics
- **`ginko start`**: Quick validation before session start
- **Error handlers**: Contextual validation on command failures

### Example Integration

```typescript
// In ginko init command
import { validateGinkoSetup, GitValidator } from '../core/validators';

export async function initCommand(options) {
  // Quick git check first
  if (!await GitValidator.isGitRepository()) {
    console.error('❌ Not in a git repository');
    console.log('   Initialize git: git init');
    process.exit(1);
  }

  // Full validation
  const summary = await validateGinkoSetup({
    projectRoot: process.cwd(),
    skipOptional: true
  });

  if (!summary.canProceed) {
    // Show errors and exit
    handleValidationErrors(summary);
    process.exit(1);
  }

  // Proceed with initialization...
}
```

## Testing

Comprehensive test coverage includes:

- **Unit tests**: Each validator tested in isolation
- **Integration tests**: Orchestrator and workflow testing
- **End-to-end tests**: Complete setup scenarios
- **Error simulation**: Permission errors, missing files, corrupted data
- **Platform testing**: Cross-platform compatibility validation

### Running Tests

```bash
# Run all validation tests
npm test -- test/core/validators/

# Run specific validator tests
npm test -- test/core/validators/git-validator.test.ts
npm test -- test/core/validators/config-validator.test.ts
npm test -- test/core/validators/environment-validator.test.ts

# Integration tests
npm test -- test/core/validators/index.test.ts
```

## Performance Characteristics

- **Fast execution**: Critical validations complete in <2 seconds
- **Timeout protection**: Individual validators timeout at 10 seconds
- **Parallel execution**: Independent checks run concurrently
- **Minimal resource usage**: Memory-efficient with cleanup
- **Caching**: Results cached within validation session

## Future Extensions

The validation architecture supports easy extension:

1. **New Validators**: Implement `Validator` interface and add to orchestrator
2. **Custom Checks**: Project-specific validation rules
3. **Platform Adapters**: OS-specific validation logic
4. **Integration Validators**: IDE, CI/CD, tool-specific checks
5. **Performance Validators**: Benchmark and optimization checks

### Example Extension

```typescript
class DatabaseValidator implements Validator {
  async validate(): Promise<ValidationResult> {
    // Check database connectivity
    // Validate schema
    // Test permissions
  }
}

// Add to orchestrator
orchestrator.addValidator('Database', new DatabaseValidator(), ValidationSeverity.WARNING);
```

## Best Practices

When working with the validation layer:

1. **Use appropriate severity levels**: ERROR for blockers, WARNING for issues, INFO for guidance
2. **Provide actionable suggestions**: Every error should include specific resolution steps
3. **Handle edge cases gracefully**: Assume corrupt files, missing permissions, etc.
4. **Write comprehensive tests**: Cover both success and failure scenarios
5. **Keep messages user-friendly**: Avoid technical jargon in error messages
6. **Consider performance**: Use timeouts and avoid blocking operations

## Dependencies

- **simple-git**: Git repository operations
- **fs-extra**: Enhanced file system operations
- **Built-in modules**: os, path, child_process
- **No external validation libraries**: Keeps bundle size minimal

## Compatibility

- **Node.js**: 18.0.0+ (20.0.0+ recommended)
- **Platforms**: Windows, macOS, Linux
- **Git**: Any modern version (2.0+)
- **Package managers**: npm, yarn, pnpm

---

This validation layer provides the foundation for ginko's first-use experience enhancement, ensuring users have clear guidance and quick resolution paths for common setup issues.