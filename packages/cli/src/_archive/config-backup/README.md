# Ginko Configuration System

This directory contains the implementation of the ginko.json configuration system as specified in PRD-2025-09-18-first-use-experience-enhancement.md.

## Overview

The configuration system provides:
- **Path Customization**: Configure documentation and ginko internal paths
- **Feature Toggles**: Enable/disable specific functionality
- **Existing Project Integration**: Non-destructive setup for existing projects
- **Variable Substitution**: Dynamic path resolution with `${variable}` syntax
- **Interactive Setup**: Guided configuration during initialization
- **Git Safety**: Repository validation and context isolation

## Core Components

### 1. Configuration Schema (`config.ts`)
- TypeScript interfaces for type-safe configuration
- Default configuration values
- Document naming and platform settings

### 2. Configuration Loader (`config-loader.ts`)
- Loads and merges ginko.json with defaults
- Resolves path variables (`${docs.root}/adr`)
- Handles caching and validation
- Platform-specific adaptations

### 3. Project Detector (`project-detector.ts`)
- Analyzes existing project structures
- Generates configuration recommendations
- Detects documentation patterns
- Validates project compatibility

### 4. Interactive Setup (`interactive-config.ts`)
- Guided configuration for existing projects
- Smart defaults based on project analysis
- Configuration validation and conflict detection
- Quick setup mode for simple projects

### 5. Git Validator (`git-validator.ts`)
- Ensures git repository requirements
- Validates initialization location
- Prevents context conflicts
- Safety checks for proper isolation

### 6. Configuration-Aware Reflection (`config-aware-reflection.ts`)
- Base class for reflectors using configurable paths
- Automatic document naming and organization
- Path resolution and directory creation
- Template-based document generation

## Configuration File Format

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
    "aiEnhancement": true,
    "documentNaming": true,
    "crossPlatform": true
  },
  "naming": {
    "format": "{TYPE}-{NUMBER:03d}-{description}",
    "types": {
      "ADR": { "prefix": "ADR", "path": "${docs.adr}" },
      "PRD": { "prefix": "PRD", "path": "${docs.prd}" },
      "SPRINT": { "prefix": "SPRINT", "path": "${docs.sprints}" }
    }
  }
}
```

## Path Variable System

Variables allow portable, relative path configurations:

```json
{
  "paths": {
    "docs": {
      "root": "documentation",
      "adr": "${docs.root}/architecture",
      "prd": "${docs.root}/requirements"
    }
  }
}
```

Resolves to:
- `docs.adr` → `documentation/architecture`
- `docs.prd` → `documentation/requirements`

## Usage Examples

### Load Configuration
```typescript
import { configLoader } from './config-loader.js';

const config = await configLoader.loadConfig();
console.log(config.paths.docs.root); // "docs"
```

### Get Resolved Paths
```typescript
const adrPath = await configLoader.getPath('docs.adr');
const contextPath = await configLoader.getPath('ginko.context');
```

### Create Directories
```typescript
await configLoader.ensurePaths();
```

### Project Analysis
```typescript
import { projectDetector } from './project-detector.js';

const analysis = await projectDetector.analyzeProject();
if (analysis.hasDocsFolder) {
  console.log('Existing docs detected');
}
```

### Interactive Setup
```typescript
import { interactiveConfig } from './interactive-config.js';

const config = await interactiveConfig.setupConfiguration();
await configLoader.saveConfig(config);
```

### Git Validation
```typescript
import { GitValidator } from './git-validator.js';

await GitValidator.validateOrExit('ginko init');
```

## Configuration-Aware Reflectors

Reflectors extend `ConfigAwareReflectionCommand` for automatic path handling:

```typescript
import { ConfigAwareReflectionCommand } from './config-aware-reflection.js';

class MyReflector extends ConfigAwareReflectionCommand {
  constructor() {
    super('my-domain');
  }

  async execute(intent: string, options: any) {
    // Configuration loaded automatically
    const content = this.generateContent(intent);

    // Saves to configured path with naming convention
    const savedPath = await this.saveArtifact(content);

    this.displayCreationSummary(savedPath, 'My Document');
  }
}
```

## Integration with Init Command

The enhanced init command (`init-enhanced.ts`) integrates all components:

1. **Git Validation**: Ensures proper repository setup
2. **Project Analysis**: Detects existing structures
3. **Interactive Config**: Guides path selection
4. **Directory Creation**: Creates configured paths
5. **Configuration Persistence**: Saves ginko.json

## Testing

Comprehensive test suite (`config-system.test.ts`) covers:
- Configuration loading and merging
- Path variable resolution
- Project detection and analysis
- Git validation scenarios
- Interactive setup workflows
- Integration testing

Run tests:
```bash
npm test -- config-system.test.ts
```

## Migration from Legacy

For existing ginko installations:

1. **Backup**: Existing config.json is preserved
2. **Migration**: Run `ginko init --migrate`
3. **Validation**: Use `ginko doctor` to verify setup
4. **Path Updates**: Reflectors automatically use new paths

## Error Handling

The system provides graceful fallbacks:
- **Missing Config**: Uses defaults
- **Invalid Paths**: Falls back to standard locations
- **Git Issues**: Clear error messages with solutions
- **Permission Problems**: Helpful guidance

## Future Enhancements

- **Team Configuration**: Shared configuration templates
- **Cloud Sync**: Configuration backup and sync
- **Advanced Variables**: Environment-based path resolution
- **Visual Setup**: GUI configuration interface

## Implementation Notes

### Phase 2 Requirements (Completed)

✅ **ginko.json Configuration**
- Schema definition and TypeScript interfaces
- Configuration loader with variable substitution
- Path resolution system

✅ **Interactive Configuration**
- Project analysis and smart defaults
- Existing project integration prompts
- Non-destructive setup approach

✅ **Git Repository Validation**
- Safety checks before all operations
- Context isolation enforcement
- Clear error messages and guidance

✅ **Enhanced Reflectors**
- Configuration-aware base class
- Automatic path resolution
- Document naming conventions

### Integration Points

- **CLI Commands**: All commands validate git repository
- **Reflectors**: Use configurable paths and naming
- **File Operations**: Respect configured directory structure
- **Documentation**: Generated files follow conventions

This configuration system provides the foundation for reliable, customizable ginko installations that integrate seamlessly with existing project structures.