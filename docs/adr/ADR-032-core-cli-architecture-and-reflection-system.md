# ADR-032: Core CLI Architecture and Reflection System

## Status
**PROPOSED** - 2025-09-22

## Context

PRD-006 defines the Phase 1 implementation of Ginko developer tools requiring a robust CLI architecture that supports git-native workflows, persistent context management, and extensible reflection domains. The architecture must enable seamless developer experience while building the foundation for team collaboration and future marketplace features.

Current requirements:
- Essential reflection domains (handoff, start, context, documentation, init, doctor)
- Git-native context storage and team sharing
- Quality template system with consistent outputs
- CLI-first interface with minimal friction
- Cross-platform compatibility (Windows, macOS, Linux)
- Foundation for future Pro and Enterprise features

The architecture must balance simplicity for Phase 1 delivery with extensibility for planned marketplace and enterprise features.

## Decision

We will implement a **Modular CLI Architecture** with a **Universal Reflection Pattern** that provides git-native persistence, quality templates, and extensible domain support.

### Core Architecture Components

#### 1. CLI Command Router
```typescript
// Central command routing system
export class GinkoCLI {
  private reflectionEngine: ReflectionEngine;
  private gitStorage: GitStorageManager;
  private qualitySystem: QualityTemplateSystem;

  async executeCommand(command: string, args: string[], options: CLIOptions): Promise<void> {
    switch (command) {
      case 'handoff':
        return this.reflectionEngine.execute('handoff', args, options);
      case 'start':
        return this.reflectionEngine.execute('start', args, options);
      case 'context':
        return this.contextManager.execute(args, options);
      case 'reflect':
        return this.reflectionEngine.executeReflection(args, options);
      default:
        return this.showHelp();
    }
  }
}
```

#### 2. Universal Reflection Engine
```typescript
// Core reflection pattern implementation
export class ReflectionEngine {
  async execute(domain: ReflectionDomain, intent: string, options: ReflectionOptions): Promise<void> {
    // 1. Load domain-specific template
    const template = await this.templateSystem.loadTemplate(domain);

    // 2. Gather context for reflection
    const context = await this.contextGatherer.gather(domain, intent);

    // 3. Generate AI-enhanced content
    const reflection = await this.aiProvider.reflect(intent, template, context);

    // 4. Apply quality validation
    const qualityScore = await this.qualitySystem.evaluate(reflection, template);

    // 5. Save to git-native storage
    await this.gitStorage.save(reflection, domain, qualityScore);
  }
}

// Base class for all reflection domains
export abstract class ReflectionCommand {
  protected domain: string;
  protected template: QualityTemplate;

  abstract execute(intent: string, options?: any): Promise<ReflectionResult>;
  abstract gatherContext(intent: string): Promise<ContextData>;
  abstract generateOutput(reflection: AIReflection): Promise<string>;
}
```

#### 3. Git-Native Storage System
```typescript
// Git-integrated storage for persistent context
export class GitStorageManager {
  private ginkoDir: string = '.ginko';

  async saveSession(sessionData: SessionData): Promise<void> {
    const userSlug = this.getUserSlug();
    const sessionPath = path.join(this.ginkoDir, 'sessions', userSlug, 'current.md');

    await fs.writeFile(sessionPath, sessionData.content);
    await this.updateContextIndex(sessionData.insights);
  }

  async loadContext(contextId: string): Promise<ContextModule> {
    const modulePath = path.join(this.ginkoDir, 'context', 'modules', `${contextId}.md`);
    return this.parseContextModule(await fs.readFile(modulePath));
  }

  async archiveSession(sessionId: string): Promise<void> {
    // Move current.md to archive with timestamp
    const userSlug = this.getUserSlug();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const archivePath = path.join(this.ginkoDir, 'sessions', userSlug, 'archive', `${timestamp}.md`);

    await fs.move(
      path.join(this.ginkoDir, 'sessions', userSlug, 'current.md'),
      archivePath
    );
  }
}
```

#### 4. Quality Template System
```typescript
// Template-driven quality assurance
export class QualityTemplateSystem {
  async loadTemplate(domain: ReflectionDomain): Promise<QualityTemplate> {
    const templatePath = this.getTemplatePath(domain);
    const template = await this.parseTemplate(templatePath);

    return {
      domain,
      requiredSections: template.sections,
      contextGatherers: template.context,
      rulesAndConstraints: template.rules,
      qualityThreshold: template.threshold || 70,
      outputFormat: template.format || 'markdown'
    };
  }

  async evaluateQuality(content: string, template: QualityTemplate): Promise<QualityScore> {
    const scores = await Promise.all([
      this.evaluateCompleteness(content, template),
      this.evaluateClarity(content),
      this.evaluateStructure(content, template),
      this.evaluateActionability(content)
    ]);

    return {
      overall: this.calculateOverallScore(scores),
      breakdown: {
        completeness: scores[0],
        clarity: scores[1],
        structure: scores[2],
        actionability: scores[3]
      },
      passesThreshold: this.calculateOverallScore(scores) >= template.qualityThreshold
    };
  }
}
```

### Essential Reflection Domains

#### Domain Implementations
```typescript
// Session preservation
export class HandoffReflection extends ReflectionCommand {
  async execute(intent: string): Promise<ReflectionResult> {
    const context = await this.gatherSessionContext();
    const insights = await this.extractInsights(context);
    const handoff = await this.generateHandoffDocument(insights);

    await this.gitStorage.archiveSession(context.sessionId);
    return { content: handoff, quality: await this.evaluateQuality(handoff) };
  }
}

// Context restoration
export class StartReflection extends ReflectionCommand {
  async execute(): Promise<ReflectionResult> {
    const lastSession = await this.gitStorage.getLastSession();
    const contextModules = await this.loadRelevantContext(lastSession);
    const workMode = await this.determineWorkMode(lastSession);

    return {
      content: this.generateStartupSummary(lastSession, contextModules, workMode),
      quality: { overall: 100, passesThreshold: true } // Always passes for start
    };
  }
}

// Knowledge management
export class ContextReflection extends ReflectionCommand {
  async execute(intent: string): Promise<ReflectionResult> {
    const action = this.parseContextAction(intent); // list, load, create, share

    switch (action.type) {
      case 'list':
        return this.listAvailableModules();
      case 'load':
        return this.loadContextModule(action.moduleId);
      case 'create':
        return this.createContextModule(intent);
      case 'share':
        return this.shareWithTeam(action.moduleId);
    }
  }
}
```

### File System Structure

#### Git-Native Organization
```
.ginko/
├── config.json                 # Local configuration
├── context/
│   ├── index.json              # Context module registry
│   └── modules/                # Team knowledge modules
│       ├── oauth-patterns.md   # Security patterns
│       ├── testing-strategy.md # Test approaches
│       └── architecture-decisions.md
├── sessions/
│   └── [user-slug]/
│       ├── current.md          # Active session
│       └── archive/            # Historical sessions
│           ├── 2025-09-22T10-30-00.md
│           └── 2025-09-21T15-45-00.md
└── templates/                  # Quality templates
    ├── handoff.md
    ├── documentation.md
    └── architecture.md
```

### Cross-Platform Compatibility

#### Platform Abstraction Layer
```typescript
// Handle OS differences
export class PlatformAdapter {
  static async ensureDirectoryStructure(): Promise<void> {
    const ginkoDir = await this.getGinkoDirectory();
    const directories = [
      'context/modules',
      'sessions',
      'templates'
    ];

    for (const dir of directories) {
      await fs.ensureDir(path.join(ginkoDir, dir));
    }
  }

  static async getGinkoDirectory(): Promise<string> {
    // Check for git root
    const gitRoot = await this.findGitRoot();
    if (gitRoot) {
      return path.join(gitRoot, '.ginko');
    }

    // Fallback to current directory
    return path.join(process.cwd(), '.ginko');
  }
}
```

## Consequences

### Positive
- **Git-Native Integration**: Seamless with existing developer workflows
- **Quality Consistency**: Template-driven outputs ensure uniform quality
- **Team Collaboration**: Shared context modules enable knowledge transfer
- **Extensible Architecture**: Modular design supports future features
- **Developer Experience**: CLI-first design minimizes friction

### Negative
- **Complexity**: Multi-layered architecture requires careful coordination
- **Git Dependency**: Requires git repository for full functionality
- **Storage Overhead**: Context accumulation may increase repository size
- **Cross-Platform Testing**: Requires extensive testing across environments

### Neutral
- **Learning Curve**: Developers need to understand new workflow patterns
- **Template Maintenance**: Quality templates require ongoing refinement
- **Performance Considerations**: File system operations may impact speed

## Implementation Details

### Phase 1 Development Approach

#### **Week 1-2: Core Infrastructure**
- Implement CLI command router and option parsing
- Build git storage manager with cross-platform support
- Create quality template system foundation
- Set up development and testing infrastructure

#### **Week 3-4: Reflection Engine**
- Implement universal reflection pattern
- Build base reflection command classes
- Create context gathering system
- Add quality evaluation framework

#### **Week 5-6: Essential Domains**
- Implement handoff and start reflections
- Build context management commands
- Create documentation reflection
- Add init and doctor utilities

#### **Week 7-8: Integration and Testing**
- Cross-platform compatibility testing
- Git workflow integration verification
- Quality template refinement
- Performance optimization

### Technical Implementation Strategy

#### **Modular Development**
```typescript
// Plugin-style architecture for domains
export interface ReflectionPlugin {
  domain: string;
  command: ReflectionCommand;
  template: QualityTemplate;
  contextGatherers: ContextGatherer[];
}

// Registry for domain plugins
export class DomainRegistry {
  private plugins = new Map<string, ReflectionPlugin>();

  register(plugin: ReflectionPlugin): void {
    this.plugins.set(plugin.domain, plugin);
  }

  getPlugin(domain: string): ReflectionPlugin | undefined {
    return this.plugins.get(domain);
  }
}
```

#### **Quality Template Format**
```yaml
# templates/handoff.yml
domain: handoff
name: "Session Handoff"
description: "Preserve session insights and enable context restoration"

sections:
  - name: "session_summary"
    required: true
    prompt: "Summarize key accomplishments and decisions"
  - name: "next_session_goals"
    required: true
    prompt: "Define clear objectives for next session"
  - name: "critical_context"
    required: true
    prompt: "Identify essential context for restoration"

quality_rules:
  - name: "actionability"
    weight: 0.3
    description: "Next steps are clear and specific"
  - name: "completeness"
    weight: 0.4
    description: "All required sections included"
  - name: "clarity"
    weight: 0.3
    description: "Content is clear and well-structured"

threshold: 70
```

### Security Considerations

#### **Git Integration Security**
- Validate git repository before operations
- Sanitize file paths to prevent directory traversal
- Use git-native operations for file management
- Respect .gitignore patterns for sensitive content

#### **Content Validation**
- Sanitize user inputs to prevent injection attacks
- Validate file operations within ginko directory
- Encrypt sensitive context modules (future enhancement)
- Audit trail for team operations

#### **Cross-Platform Security**
- Consistent file permissions across platforms
- Safe handling of symbolic links
- Protection against path injection attacks
- Secure temporary file handling

## Alternative Approaches Considered

### 1. Database-Backed Storage
**Rejected**: Would break git-native workflow and add complexity for developers who expect everything in version control.

### 2. Single-File Configuration
**Rejected**: Would not scale with team collaboration and context accumulation requirements.

### 3. Plugin System from Day 1
**Deferred**: Adds complexity to Phase 1; can be added in future phases as marketplace requirement.

### 4. AI Provider Abstraction
**Simplified**: Start with single provider (OpenAI/Anthropic), add abstraction when multiple providers needed.

## Metrics for Success

### Technical Metrics
- **Command Execution Time**: < 2 seconds for standard operations
- **Session Startup Time**: < 5 seconds with full context
- **Cross-Platform Compatibility**: 100% feature parity across Windows, macOS, Linux
- **Quality Score Achievement**: 75% average across all reflection outputs

### Developer Experience Metrics
- **Time to First Value**: < 5 minutes from install to first handoff
- **CLI Discoverability**: 90% of users find commands without documentation
- **Error Recovery**: < 1% of operations result in unrecoverable errors
- **Git Integration**: 0% interference with existing git workflows

### Architecture Quality Metrics
- **Code Coverage**: > 80% test coverage across core components
- **Module Coupling**: Low coupling between reflection domains
- **Extension Points**: Ready for Pro/Enterprise features without refactoring
- **Performance**: Linear scaling with context size

---

**Traceability**:
- **PRD**: [PRD-006 Phase 1 Developer Tools Implementation](../prd/PRD-006-phase-1-developer-tools-implementation.md)
- **Strategy**: [Competitive Positioning and GTM Strategy](../strategy/competitive-positioning-and-gtm-strategy.md)

**Author**: Architecture Team
**Reviewers**: [To be assigned]
**Implementation**: Pending approval