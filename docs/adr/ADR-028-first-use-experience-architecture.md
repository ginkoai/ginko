# ADR-028: First-Use Experience Enhancement Architecture

## Status
Proposed

## Context
The ginko CLI currently has significant friction points in the first-use experience that lead to user abandonment and configuration errors. Based on comprehensive UX testing (see PRD-2025-09-18), we need to implement a robust architecture that addresses:

- Git repository validation failures with cryptic errors
- Context isolation failures leading to cross-project pollution
- Directory navigation confusion with multiple `.ginko/` directories
- Missing initialization guidance
- Path conflicts with existing project structures
- Inconsistent document naming standards
- Cross-platform compatibility issues (especially Windows/macOS migration)

The current codebase uses a pipeline-based architecture with the SimplePipelineBase pattern (ADR-013) and has established patterns for commands, adapters, and services that we should leverage.

## Decision
We will implement a **layered architecture** with five core subsystems that provide validation, configuration, document management, platform compatibility, and diagnostic capabilities. Each subsystem will be independent but composable, following the existing pipeline pattern.

### Architecture Overview
```
┌─────────────────────────────────────────────────────────┐
│                    CLI Commands Layer                    │
│  (init, reflect, doctor, start, handoff)                │
└─────────────┬───────────────────────────────┬───────────┘
              │                               │
┌─────────────▼───────────┐     ┌────────────▼────────────┐
│   Diagnostic System      │     │   Pipeline Processing   │
│   (doctor command)       │     │   (SimplePipelineBase)  │
└─────────────┬───────────┘     └────────────┬────────────┘
              │                               │
┌─────────────▼───────────────────────────────▼───────────┐
│                    Core Services Layer                   │
├──────────────┬──────────────┬──────────────┬───────────┤
│ Validation   │Configuration │  Document    │ Platform  │
│   Layer      │   System     │ Management   │ Adapter   │
└──────────────┴──────────────┴──────────────┴───────────┘
```

### Component Design

#### 1. Validation Layer (`src/core/validators/`)
```typescript
interface Validator {
  validate(): Promise<ValidationResult>;
  getErrorMessage(): string;
  getSuggestions(): string[];
}

class GitValidator implements Validator {
  async validate(): Promise<ValidationResult> {
    // Check if in git repository
    // Verify .git directory exists
    // Test git command availability
  }
}

class ConfigValidator implements Validator {
  async validate(): Promise<ValidationResult> {
    // Validate ginko.json schema
    // Check path references
    // Verify required fields
  }
}

class EnvironmentValidator implements Validator {
  async validate(): Promise<ValidationResult> {
    // Check Node.js version
    // Verify platform compatibility
    // Test required commands
  }
}
```

#### 2. Configuration System (`src/core/config/`)
```typescript
interface GinkoConfig {
  version: string;
  paths: {
    docs: Record<string, string>;
    ginko: Record<string, string>;
  };
  features: Record<string, boolean>;
  platform?: PlatformConfig;
}

class ConfigLoader {
  private static instance: ConfigLoader;
  private config: GinkoConfig;

  async load(): Promise<GinkoConfig> {
    // Load ginko.json with defaults
    // Resolve variable substitutions
    // Validate against schema
  }
}
```

#### 3. Document Management (`src/core/documents/`)
```typescript
class DocumentNamer {
  async generateName(type: DocType, description: string): Promise<string> {
    const number = await this.sequenceManager.getNext(type);
    return `${type}-${number.toString().padStart(3, '0')}-${sanitize(description)}.md`;
  }
}

class DocumentMigrator {
  async migrateToStandard(directory: string): Promise<MigrationResult> {
    // Find non-standard documents
    // Generate new names
    // Update references
    // Apply changes
  }
}
```

#### 4. Platform Adapter (`src/core/platform/`)
```typescript
class PlatformAdapter {
  detectPlatform(): Platform {
    return process.platform === 'win32' ? 'windows' :
           process.platform === 'darwin' ? 'macos' : 'linux';
  }

  adaptHookPath(hook: string): string {
    const ext = this.platform === 'windows' ? '.bat' : '.sh';
    return path.join(os.homedir(), '.claude', 'hooks', `${hook}${ext}`);
  }

  async convertScript(script: string, from: Platform, to: Platform): Promise<string> {
    // Convert between shell and batch scripts
  }
}
```

#### 5. Doctor System (`src/commands/doctor/`)
```typescript
class DiagnosticEngine {
  private checks: Map<string, DiagnosticCheck> = new Map();

  async runDiagnostics(intent?: string): Promise<DiagnosticReport> {
    const relevantChecks = this.selectChecks(intent);
    const results = await Promise.all(relevantChecks.map(c => c.check()));
    return this.generateReport(results);
  }

  async autoFix(report: DiagnosticReport): Promise<FixResult> {
    const safeFixes = report.fixes.filter(f => f.safety === 'safe');
    return await this.repairEngine.apply(safeFixes);
  }
}
```

## Rationale
This architecture provides several key benefits:

1. **Separation of Concerns**: Each subsystem handles a specific aspect of the first-use experience
2. **Composability**: Components can be used independently or together
3. **Extensibility**: New validators, diagnostics, or platforms can be added easily
4. **Consistency**: Builds on existing SimplePipelineBase pattern
5. **Testability**: Each component can be unit tested in isolation
6. **Progressive Enhancement**: Features degrade gracefully when unavailable

The layered approach allows us to implement features incrementally while maintaining backward compatibility.

## Alternatives Considered

### Alternative 1: Monolithic Init Command
**Description**: Put all logic in a single enhanced init command
**Pros**: Simple implementation, single entry point
**Cons**: Poor separation of concerns, hard to test, not reusable
**Rejected because**: Would create a maintenance nightmare and prevent reuse in other commands

### Alternative 2: External Configuration Tool
**Description**: Separate CLI tool for configuration and setup
**Pros**: Clean separation, could be language-agnostic
**Cons**: Additional installation step, synchronization issues
**Rejected because**: Adds friction to the first-use experience we're trying to improve

### Alternative 3: Web-Based Configuration
**Description**: Web UI for initial setup and configuration
**Pros**: Rich UI possibilities, easier for non-technical users
**Cons**: Requires server, breaks offline-first principle
**Rejected because**: Contradicts ginko's philosophy of local-first development

## Consequences

### Positive
- ✅ Clear error messages with actionable solutions
- ✅ Automatic detection and fixing of common issues
- ✅ Cross-platform compatibility out of the box
- ✅ Consistent document naming across projects
- ✅ Safe context isolation preventing cross-project pollution
- ✅ Reduced support burden through self-healing

### Negative
- ❌ Increased codebase complexity
- ❌ More components to maintain
- ❌ Potential performance overhead from validation checks
- ❌ Migration required for existing installations

### Neutral
- ⚪ Changes to existing command behaviors
- ⚪ New dependencies for schema validation
- ⚪ Additional configuration options to document

## Implementation

### Phase 1: Validation Layer (Week 1)
```typescript
// packages/cli/src/core/validators/git-validator.ts
export class GitValidator implements Validator {
  async validate(): Promise<ValidationResult> {
    try {
      execSync('git rev-parse --git-dir', { stdio: 'pipe' });
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'Not in a git repository',
        suggestions: [
          'Initialize git: git init',
          'Navigate to a git repository: cd /path/to/repo',
          'Clone a repository: git clone <url>'
        ]
      };
    }
  }
}
```

### Phase 2: Configuration System (Week 2)
```typescript
// packages/cli/src/core/config/config-loader.ts
export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: GinkoConfig;

  static getInstance(): ConfigLoader {
    if (!this.instance) {
      this.instance = new ConfigLoader();
    }
    return this.instance;
  }

  async load(): Promise<GinkoConfig> {
    const configPath = path.join(process.cwd(), 'ginko.json');

    if (await fs.pathExists(configPath)) {
      const userConfig = await fs.readJson(configPath);
      return this.mergeWithDefaults(userConfig);
    }

    return this.getDefaults();
  }
}
```

### Phase 3: Integration with Commands
```typescript
// packages/cli/src/commands/init.ts
import { GitValidator } from '../core/validators/git-validator.js';
import { ConfigLoader } from '../core/config/config-loader.js';

export async function initCommand(options: InitOptions) {
  // Validate git repository first
  const gitValidator = new GitValidator();
  const gitResult = await gitValidator.validate();

  if (!gitResult.valid) {
    console.error(chalk.red(gitResult.error));
    gitResult.suggestions.forEach(s =>
      console.log(chalk.yellow(`  → ${s}`))
    );
    process.exit(1);
  }

  // Load or create configuration
  const configLoader = ConfigLoader.getInstance();
  const config = await configLoader.load();

  // Continue with initialization...
}
```

## Validation
- **Unit tests**: 100% coverage for each validator and core component
- **Integration tests**: End-to-end testing of init flow
- **User testing**: Beta test with 10 users on Windows/Mac/Linux
- **Performance**: Validation overhead < 500ms
- **Success metrics**:
  - Time to first success < 5 minutes
  - Installation success rate > 95%
  - Zero cross-project contamination incidents

## References
- Related ADRs: [ADR-013 (Pipeline Pattern)](./ADR-072-simple-builder-pattern.md)
- PRD: [PRD-2025-09-18-first-use-experience](../PRD/PRD-2025-09-18-first-use-experience-enhancement.md)
- PRD: [PRD-003-ginko-doctor-reflector](../PRD/PRD-003-ginko-doctor-reflector.md)
- Documentation: [Windows Fresh Install UX Testing](../UX/windows-fresh-install.md)
- Discussion: GitHub Issue #142 (hypothetical)