# Ginko Architecture Documentation

## Overview

Ginko is a monorepo-based intelligent context management platform for AI-assisted development. The architecture consists of multiple packages working together to provide seamless context sharing and management across development teams.

## Package Architecture

### 🏢 **Main Package (`ginko` v1.1.0)**
**Purpose**: Monorepo orchestrator and deployment container
- **Type**: Private workspace root
- **Function**: Build coordination, deployment, workspace management
- **Deployment**: Vercel platform
- **Scripts**: Cross-package build orchestration

### 🖥️ **CLI Package (`@ginkoai/cli` v1.0.0)**
**Purpose**: Primary user interface and local development tools
- **Publishable**: Yes (main npm package)
- **Binary**: `ginko` command
- **Installation**: `npm install -g @ginkoai/cli`

#### Core Systems
- **Git Repository Validation**: Ensures proper repository setup
- **Configuration Management**: Interactive `ginko.json` setup
- **Path Management**: Cross-platform path resolution
- **Document Management**: Standardized naming and organization
- **Health Management**: `ginko doctor` diagnostics and repair

#### Key Features
- First-use experience optimization (<5 minutes to productivity)
- Cross-platform compatibility (Windows/Mac/Linux)
- Context isolation and security
- Interactive command-line interface

### 🌐 **MCP Server (`@ginko/mcp-server` v1.1.0)**
**Purpose**: Model Context Protocol server for Claude Code integration
- **Deployment**: Vercel serverless functions
- **Protocol**: MCP (Model Context Protocol)
- **Database**: Supabase PostgreSQL
- **Authentication**: OAuth with GitHub

#### Capabilities
- Real-time context synchronization
- Team collaboration features
- Session management
- Best practices enforcement

### 📚 **Shared Package (`@ginko/shared` v1.1.0)**
**Purpose**: Common utilities and types
- **Function**: Cross-package shared code
- **Contains**: Types, interfaces, utilities
- **Dependencies**: Minimal (dotenv)

### 🧩 **Extension Packages**
- **`@ginkoai/claude-sdk`**: Claude Code integration
- **`create-ginko-project`**: Project scaffolding
- **`cursor-agent`**: Cursor IDE integration
- **`vscode-extension`**: VS Code extension

## Technical Stack

### Frontend
- **Dashboard**: Next.js with React
- **Authentication**: NextAuth.js with GitHub OAuth
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

### Backend
- **API**: Vercel serverless functions
- **Database**: Supabase PostgreSQL
- **MCP Protocol**: @modelcontextprotocol/sdk
- **Authentication**: JWT with Supabase Auth

### CLI
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **UI Framework**: Commander.js with Inquirer
- **Git Integration**: simple-git
- **Cross-Platform**: Native Node.js path handling

## Configuration System

### Path Management
```typescript
// Dynamic path resolution
const pathManager = new PathManager();
const config = pathManager.getConfig();

// Example paths
config.ginko.root      // .ginko/
config.docs.prd        // docs/PRD/
config.docs.adr        // docs/adr/
```

### Platform Adaptation
```typescript
// Cross-platform compatibility
const pathAdapter = new PathAdapter();
const configDir = pathAdapter.getConfigDir('ginko');

// Windows: C:\Users\user\AppData\Roaming\ginko
// macOS:   ~/Library/Application Support/ginko
// Linux:   ~/.config/ginko
```

### Configuration Schema
```json
{
  "version": "1.0.0",
  "paths": {
    "docs": {
      "root": "docs",
      "adr": "${docs.root}/adr",
      "prd": "${docs.root}/PRD"
    }
  },
  "features": {
    "autoCapture": true,
    "gitIntegration": true,
    "aiEnhancement": true
  }
}
```

## Development Workflow

### Local Development
```bash
# Clone and setup
git clone https://github.com/ginko-ai/ginko
cd ginko
npm install

# Build all packages
npm run build

# Test CLI locally
cd packages/cli
npm run build
npm link
ginko --version
```

### Testing
```bash
# Run all tests
npm test

# CLI package tests
cd packages/cli
npm test

# MCP server tests
cd packages/mcp-server
npm test
```

### Deployment
```bash
# Deploy to Vercel
npm run deploy

# CLI package publishing
cd packages/cli
npm publish
```

## Security Architecture

### Context Isolation
- Git repository validation before operations
- Project-specific `.ginko` directories
- No cross-project context leakage
- Validation of initialization locations

### Authentication
- GitHub OAuth for team features
- JWT tokens for API access
- Supabase Row Level Security (RLS)
- API key management for enterprise

### Privacy
- Local-first context storage
- Optional cloud synchronization
- Encrypted data transmission
- GDPR compliance

## Deployment Architecture

### Vercel Platform
```
ginko.com                 → Main website
app.ginko.com            → Dashboard application
mcp.ginko.com            → MCP API endpoints
```

### Database Schema
- **Users**: GitHub OAuth profiles
- **Projects**: Repository metadata
- **Sessions**: Development sessions
- **Context**: Shared context modules
- **Insights**: AI-generated insights

## Performance Considerations

### CLI Performance
- **Startup Time**: <2 seconds for common commands
- **Path Resolution**: Cached configuration loading
- **Git Operations**: Optimized repository detection
- **Context Loading**: Progressive loading strategy

### MCP Server Performance
- **Serverless**: Auto-scaling Vercel functions
- **Database**: Connection pooling with Supabase
- **Caching**: Redis for session data
- **CDN**: Static asset delivery

## Migration and Upgrade Path

### Version 1.0 → 1.1 Migration
- Automatic path configuration migration
- Document naming standardization
- Environment dependency updates
- Cross-platform compatibility fixes

### Future Considerations
- **v2.0**: Team collaboration features
- **v2.1**: Enterprise authentication
- **v2.2**: Advanced AI insights
- **v3.0**: IDE integrations expansion

## Monitoring and Observability

### Metrics
- CLI command usage analytics
- Error rate monitoring
- Performance tracking
- User adoption metrics

### Logging
- Structured logging with context
- Error tracking and reporting
- Usage pattern analysis
- Security event monitoring

## Development Guidelines

### Code Organization
- **Packages**: Feature-based organization
- **Types**: Shared in @ginko/shared
- **Tests**: Co-located with source
- **Documentation**: Frontmatter-based metadata

### Naming Conventions
- **Documents**: `TYPE-###-description.md`
- **Packages**: `@ginko/` or `@ginkoai/` scope
- **Commands**: Kebab-case CLI commands
- **Functions**: camelCase TypeScript

### Quality Assurance
- TypeScript strict mode
- ESLint with consistent rules
- Jest for unit testing
- Integration test coverage

---

**Document Version**: 1.0.0
**Last Updated**: 2025-09-21
**Status**: Current