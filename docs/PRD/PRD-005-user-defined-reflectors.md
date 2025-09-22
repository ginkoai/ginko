# PRD-005: User-Defined Reflectors SDK

## Executive Summary

The User-Defined Reflectors SDK enables teams and 3rd-party developers to create custom domain reflectors that leverage the Ginko Universal Reflection Pattern. This meta-reflection system allows users to create new reflectors through natural language collaboration with AI, without writing code, while maintaining safety and quality standards through automated scoring and validation.

The solution extends the `ginko reflect --domain mydomain` syntax to support unlimited custom domains, provides an SDK for commercial reflector development, and ensures consistent output quality across all reflectors through a standardized framework. All reflectors use AI-enhancement by default, with a `--noai` flag fallback to procedural output for environments where AI is unavailable or unwanted.

## Problem Statement

### Current State
The Ginko Universal Reflection Pattern currently supports 11 built-in domains (start, handoff, prd, backlog, documentation, testing, architecture, debugging, review, refactor, pattern, sprint, overview, git, ai-collaboration). While comprehensive, teams often need specialized reflectors for domain-specific workflows that aren't covered by the core set.

### User Pain Points

1. **Limited Domain Coverage**
   - Impact: Teams can't create reflectors for specialized domains (user acceptance testing, security audits, deployment planning, etc.)
   - Frequency: 3-5 custom domain requests per team per quarter
   - Severity: High

2. **No Extensibility Framework**
   - Impact: No standardized way to add new reflectors without modifying core codebase
   - Frequency: Every custom domain request
   - Severity: Critical

3. **3rd-Party Developer Barrier**
   - Impact: External developers can't create and distribute domain-specific reflectors
   - Frequency: Ongoing market opportunity loss
   - Severity: Medium

4. **Code-Required Customization**
   - Impact: Teams must write TypeScript to create reflectors
   - Frequency: Every custom reflector need
   - Severity: High

5. **Quality Inconsistency**
   - Impact: Custom reflectors lack standardized templates and scoring
   - Frequency: Every custom implementation
   - Severity: Medium

6. **AI Dependency Concerns**
   - Impact: Teams worry about AI availability and want fallback options
   - Frequency: Enterprise deployment discussions
   - Severity: Medium

### Root Cause Analysis
The absence of a plugin architecture and SDK forces teams to either modify core code or create ad-hoc solutions, preventing scalable customization and commercial ecosystem development.

## Desired Outcomes

### User Outcomes
- Teams can create custom reflectors in under 10 minutes using natural language
- 3rd-party developers can build and distribute commercial reflectors
- All reflectors maintain 70%+ quality scores through standardized frameworks
- Zero TypeScript knowledge required for reflector creation
- Reflectors work with or without AI enhancement based on user preference

### Business Outcomes
- Enable ecosystem of 3rd-party reflectors for market expansion
- Reduce custom development requests by 80%
- Increase user retention through unlimited customization
- Create revenue opportunities through marketplace platform
- Address enterprise concerns about AI dependency

## Solution Overview

### Core Architecture

#### 1. Meta-Reflection Pattern
A specialized reflector (`meta-reflector`) that creates new reflectors:

```bash
ginko reflect --domain meta "Create a reflector for user acceptance testing"
```

This triggers:
1. **Intent Analysis**: Parse the domain requirements
2. **Template Generation**: Create domain-specific templates
3. **Code Generation**: Generate TypeScript reflector class
4. **Quality Validation**: Ensure 70%+ quality score
5. **Registration**: Add to available domains

#### 2. Dual-Mode Operation
All reflectors support both AI-enhanced and procedural modes:

```bash
# AI-enhanced mode (default)
ginko reflect --domain uat "Create acceptance tests for login feature"

# Procedural mode (template-based)
ginko reflect --domain uat --noai "Create acceptance tests for login feature"
```

**AI-Enhanced Mode:**
- Leverages AI for content generation and refinement
- Provides contextual suggestions and improvements
- Adapts templates based on project context
- Performs quality scoring and iterative improvement

**Procedural Mode:**
- Uses static templates with placeholder substitution
- Prompts user for required information
- Generates consistent, predictable output
- No external AI dependencies

#### 3. Plugin Architecture
Monorepo structure outside `@ginkoai/cli`:

```
packages/
├── cli/                     # Core Ginko CLI (existing)
├── reflectors-sdk/          # SDK for creating reflectors
├── reflectors-core/         # Built-in reflectors
├── reflectors-testing/      # Testing domain reflectors
├── reflectors-security/     # Security domain reflectors
└── reflectors-marketplace/  # 3rd-party reflector registry
```

#### 4. SDK Components

**@ginko/reflectors-sdk** provides:
- `ReflectorBuilder` class for meta-reflection
- `CustomReflectionCommand` base class with dual-mode support
- Quality scoring framework
- Template validation system
- Registration utilities
- Procedural template engine

### User Journey

#### Creating a Custom Reflector

1. **Natural Language Request**
   ```bash
   ginko reflect --domain meta "Create a reflector for writing user acceptance tests that includes Given-When-Then format, acceptance criteria validation, and stakeholder sign-off tracking"
   ```

2. **Meta-Reflection Process**
   - AI analyzes intent and domain requirements
   - Generates PRD for the new reflector
   - User reviews and refines requirements
   - AI creates implementation plan

3. **Dual-Mode Code Generation**
   - Generates TypeScript reflector class with dual-mode support
   - Creates AI-enhanced templates for dynamic content
   - Creates procedural templates for `--noai` mode
   - Implements quality scoring rules

4. **Testing and Validation**
   - Tests both AI-enhanced and procedural modes
   - Runs quality scoring on sample outputs
   - Validates template structure
   - Tests command integration

5. **Registration**
   - Adds to `ginko reflect --domain` options
   - Updates CLAUDE.md for AI awareness
   - Enables natural language usage in both modes

### Technical Implementation

#### Core SDK Structure

```typescript
// @ginko/reflectors-sdk/src/index.ts

export abstract class CustomReflectionCommand extends ReflectionCommand {
  protected qualityRules: QualityRule[];
  protected outputScorer: OutputScorer;
  protected proceduralTemplate: ProceduralTemplate;

  abstract getQualityThreshold(): number; // Default 70%
  abstract getProceduralTemplate(): ProceduralTemplate;

  async execute(intent: string, options?: any): Promise<void> {
    if (options.noai) {
      return this.executeProceduralMode(intent, options);
    } else {
      return this.executeAiEnhancedMode(intent, options);
    }
  }

  private async executeAiEnhancedMode(intent: string, options: any): Promise<void> {
    const output = await super.execute(intent, options);
    const score = await this.outputScorer.evaluate(output);

    if (score < this.getQualityThreshold()) {
      await this.iterateForQuality(intent, output, score);
    }
  }

  private async executeProceduralMode(intent: string, options: any): Promise<void> {
    const template = this.getProceduralTemplate();
    const context = await this.gatherContext(intent);
    const output = template.render(context, intent);

    await this.saveOutput(output);
  }
}

export class ReflectorBuilder {
  static async createFromIntent(intent: string): Promise<CustomReflector> {
    // Meta-reflection implementation for dual-mode reflectors
  }
}

export interface ProceduralTemplate {
  sections: TemplateSection[];
  prompts: UserPrompt[];
  render(context: any, intent: string): string;
}

export interface TemplateSection {
  name: string;
  required: boolean;
  placeholder: string;
  defaultValue?: string;
}
```

#### Dual-Mode Template System

```typescript
// Example: UAT Reflector with dual-mode support

export class UATReflectionCommand extends CustomReflectionCommand {
  getProceduralTemplate(): ProceduralTemplate {
    return {
      sections: [
        {
          name: "feature_description",
          required: true,
          placeholder: "{{FEATURE_DESCRIPTION}}",
          defaultValue: "Enter the feature being tested"
        },
        {
          name: "acceptance_criteria",
          required: true,
          placeholder: "{{ACCEPTANCE_CRITERIA}}",
          defaultValue: "List acceptance criteria"
        },
        {
          name: "test_scenarios",
          required: true,
          placeholder: "{{TEST_SCENARIOS}}",
          defaultValue: "Given-When-Then scenarios"
        }
      ],
      prompts: [
        {
          question: "What feature are you creating acceptance tests for?",
          variable: "FEATURE_DESCRIPTION",
          validation: (input) => input.length > 10
        },
        {
          question: "What are the key acceptance criteria?",
          variable: "ACCEPTANCE_CRITERIA",
          validation: (input) => input.includes("should")
        }
      ],
      render: (context, intent) => {
        return `# User Acceptance Tests: ${context.FEATURE_DESCRIPTION}

## Feature Description
${context.FEATURE_DESCRIPTION}

## Acceptance Criteria
${context.ACCEPTANCE_CRITERIA}

## Test Scenarios
${context.TEST_SCENARIOS}

## Stakeholder Sign-off
- [ ] Product Owner
- [ ] QA Lead
- [ ] End User Representative
`;
      }
    };
  }
}
```

---

**Document Status**: Draft
**Created**: 2025-09-22
**Author**: AI + Human Collaboration
**Next Review**: Upon approval for implementation