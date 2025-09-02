import { BaseAiAdapter } from './ai-adapter.js';

export class CopilotAdapter extends BaseAiAdapter {
  name = 'GitHub Copilot';
  fileExtension = '.github/copilot-instructions.md';
  
  getModelSpecificSections(): string {
    return `
## GitHub Copilot Integration

This project uses Ginko for AI-enhanced development with GitHub Copilot. The integration provides:
- Repository-wide custom instructions via .github/copilot-instructions.md
- Project-specific conventions and patterns
- Team best practices and standards
- Seamless context management across sessions

### Copilot-Specific Features

#### Using Ginko Context
- Session files: .ginko/sessions/*/current.md contains latest work context
- Handoffs: .ginko/sessions/*/handoff.md for seamless continuation
- Context modules: .ginko/context/modules/*.md for specific domains
- Best practices: Automatically loaded from team standards

#### GitHub Copilot Chat
- Reference ginko context files in chat with @workspace
- Ask about session state and project conventions
- Get suggestions that follow team patterns
- Code completions respect project standards

### Workflow Integration

1. **Starting work**: Run \`ginko start\` to load session context
2. **During development**: Copilot reads .github/copilot-instructions.md automatically
3. **Saving progress**: Run \`ginko handoff\` to save session state
4. **Team alignment**: Instructions ensure consistent code generation

### Copilot Best Practices
- Instructions are automatically applied to all Copilot interactions
- Works across VS Code, Visual Studio, JetBrains IDEs, and GitHub.com
- Custom instructions stack with workspace and global settings
- Keep instructions concise and focused on project specifics`;
  }
  
  getQuickReferenceCommands(): string {
    return `
### Quick Commands
- **Load context**: Reference .ginko/sessions/*/current.md
- **Check handoff**: Read .ginko/sessions/*/handoff.md
- **Team standards**: See .ginko/context/modules/best-practices.md
- **Save state**: Run \`ginko handoff\` in terminal
- **Copilot Chat**: Use @workspace to reference project files`;
  }

  async generateWorkspaceSettings(context: any): Promise<any> {
    const settings: any = {
      // Enable Copilot features
      "github.copilot.enable": {
        "*": true,
        "plaintext": true,
        "markdown": true,
        "scminput": false
      },
      
      // Copilot editor settings
      "github.copilot.editor.enableAutoCompletions": true,
      "github.copilot.editor.enableCodeActions": true,
      
      // Chat settings
      "github.copilot.chat.welcomeMessage": "startup",
      "github.copilot.chat.localeOverride": "auto",
      
      // Advanced settings based on project
      "github.copilot.advanced": {}
    };

    // Add language-specific settings
    if (context.language === 'typescript' || context.language === 'javascript') {
      settings["github.copilot.enable"]["javascript"] = true;
      settings["github.copilot.enable"]["typescript"] = true;
      settings["github.copilot.enable"]["javascriptreact"] = true;
      settings["github.copilot.enable"]["typescriptreact"] = true;
    }

    if (context.language === 'python') {
      settings["github.copilot.enable"]["python"] = true;
    }

    // Add framework-specific settings
    if (context.framework === 'nextjs' || context.framework === 'react') {
      settings["github.copilot.enable"]["jsx"] = true;
      settings["github.copilot.enable"]["tsx"] = true;
    }

    // Disable for certain file types
    settings["github.copilot.enable"]["env"] = false;
    settings["github.copilot.enable"]["dotenv"] = false;
    settings["github.copilot.enable"][".env.local"] = false;

    return settings;
  }

  // Override the base generateInstructions to create custom content
  generateInstructions(template: string): string {
    // For Copilot, we generate custom markdown instructions
    // rather than using the template replacement approach
    return this.generateCustomInstructions(template);
  }

  private generateCustomInstructions(context: any): string {
    const { 
      framework = 'unknown',
      language = 'typescript',
      testFramework,
      dependencies = [],
      bestPractices = [],
      teamPatterns = [],
      projectName
    } = context;

    // Build comprehensive Copilot instructions
    let instructions = `# GitHub Copilot Instructions for ${projectName || 'Project'}

## Project Context
This is a ${framework} project using ${language}.

## Development Standards

### Code Style
${this.generateCodeStyleSection(context)}

### Testing Requirements
${this.generateTestingSection(context)}

### Architecture Patterns
${this.generateArchitectureSection(context)}

## Team Conventions

`;

    // Add team-specific patterns
    if (teamPatterns.length > 0) {
      instructions += '### Established Patterns\n';
      teamPatterns.forEach((pattern: any) => {
        instructions += `- ${pattern.description}\n`;
      });
      instructions += '\n';
    }

    // Add best practices
    if (bestPractices.length > 0) {
      instructions += '### Best Practices\n';
      bestPractices.forEach((practice: any) => {
        instructions += `- **${practice.title}**: ${practice.description}\n`;
      });
      instructions += '\n';
    }

    // Add technology-specific instructions
    instructions += this.generateTechStackInstructions(context);

    // Add common guidelines
    instructions += `
## Important Guidelines

### Always Follow
- Use existing patterns found in the codebase
- Write tests for new functionality
- Handle errors gracefully with meaningful messages
- Use TypeScript types strictly - avoid 'any'
- Follow existing file naming conventions
- Maintain consistent import ordering

### Never Do
- Don't add console.log statements in production code
- Don't commit sensitive information or credentials
- Don't use deprecated APIs or patterns
- Don't ignore TypeScript errors
- Don't skip error handling

## Code Generation Preferences

### When creating new components
- Look at existing components for patterns
- Use the established state management approach
- Follow the existing file structure
- Include proper TypeScript types
- Add appropriate error boundaries

### When modifying existing code
- Preserve the existing code style
- Maintain backward compatibility
- Update related tests
- Keep changes focused and minimal
- Document breaking changes

## Git Commit Messages
- Use conventional commits format (feat:, fix:, docs:, etc.)
- Keep first line under 50 characters
- Add detailed description when needed
- Reference issue numbers when applicable

## Documentation
- Update README when adding new features
- Document complex logic with comments
- Keep API documentation current
- Include examples for new utilities
`;

    return instructions.trim();
  }

  private generateCodeStyleSection(context: any): string {
    const { language } = context;
    
    if (language === 'typescript' || language === 'javascript') {
      return `- Use 2 spaces for indentation
- Use single quotes for strings
- Always use semicolons
- Prefer const over let
- Use arrow functions for callbacks
- Destructure objects and arrays when possible
- Use template literals for string interpolation`;
    }
    
    if (language === 'python') {
      return `- Follow PEP 8 style guide
- Use 4 spaces for indentation
- Use snake_case for variables and functions
- Use CamelCase for classes
- Include type hints for function parameters
- Write docstrings for all public functions`;
    }
    
    return '- Follow language-specific best practices';
  }

  private generateTestingSection(context: any): string {
    const { testFramework } = context;
    
    if (testFramework === 'jest') {
      return `- Write tests using Jest
- Use describe blocks for grouping tests
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Aim for high code coverage
- Test edge cases and error scenarios`;
    }
    
    if (testFramework === 'pytest') {
      return `- Write tests using pytest
- Use fixtures for test setup
- Follow given-when-then pattern
- Use parametrize for multiple test cases
- Test both happy path and error cases`;
    }
    
    return '- Write comprehensive tests for new features';
  }

  private generateArchitectureSection(context: any): string {
    const { framework } = context;
    
    if (framework === 'nextjs') {
      return `- Use App Router for routing
- Implement Server Components where possible
- Use Client Components for interactivity
- Follow Next.js best practices for data fetching
- Optimize images with next/image
- Use middleware for auth and redirects`;
    }
    
    if (framework === 'express') {
      return `- Follow MVC architecture
- Use middleware for cross-cutting concerns
- Implement proper error handling middleware
- Use routers for organizing endpoints
- Validate input data
- Implement rate limiting`;
    }
    
    return '- Follow established architectural patterns';
  }

  private generateTechStackInstructions(context: any): string {
    let instructions = '\n## Technology-Specific Instructions\n\n';
    
    // Database instructions
    if (context.dependencies?.includes('supabase')) {
      instructions += `### Supabase
- Use Row Level Security (RLS) policies
- Handle auth with Supabase Auth
- Use realtime subscriptions sparingly
- Properly type database responses
- Handle connection errors gracefully\n\n`;
    }
    
    if (context.dependencies?.includes('prisma')) {
      instructions += `### Prisma
- Keep schema.prisma up to date
- Run migrations for schema changes
- Use Prisma Client types
- Handle database errors properly
- Use transactions for related operations\n\n`;
    }
    
    // UI framework instructions
    if (context.dependencies?.includes('tailwindcss')) {
      instructions += `### Tailwind CSS
- Use utility classes consistently
- Avoid arbitrary values when possible
- Use component classes for repeated patterns
- Follow mobile-first responsive design
- Use CSS variables for theming\n\n`;
    }
    
    if (context.dependencies?.includes('@shadcn/ui')) {
      instructions += `### Shadcn UI
- Use existing components from the library
- Follow the established component patterns
- Maintain consistent styling
- Properly handle component props
- Use the theming system\n\n`;
    }
    
    return instructions;
  }

  // Compatibility method for base adapter
  async generate(context: any): Promise<string> {
    return this.generateCustomInstructions(context);
  }
}