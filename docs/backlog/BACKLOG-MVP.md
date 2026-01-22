---
type: project
status: current
updated: 2025-08-01
tags: [mvp, backlog, supabase, vercel, sessions, analytics, testing, production]
related: [ADR-001-infrastructure-stack-selection.md, ADR-062-oauth-authentication-architecture.md, UX-001-user-journey-friction-analysis.md, SPRINT-001-dependencies-analysis.md]
priority: critical
audience: [developer, ai-agent, team]
estimated-read: 12-min
dependencies: [ADR-001, ADR-003, UX-001]
---

# ContextMCP MVP Backlog

## Overview
This backlog defines the high-level items needed to deliver the MVP based on:
- **ADR-001**: Vercel + Supabase infrastructure
- **UX-001**: User journey friction analysis
- **Goal**: Launch in 4 weeks with magical session handoff experience

## Backlog Items

### 🏗️ Infrastructure Setup

#### INFRA-001: Supabase Project Setup ✅
**Points**: 2  
**Status**: COMPLETE (2025-08-14)
**Description**: Create and configure Supabase project with proper schema, RLS policies, and auth configuration.
- ✅ Create Supabase project
- ✅ Design and implement database schema (users, sessions, teams)
- ✅ Configure Row Level Security (RLS) policies
- ✅ Enable GitHub OAuth provider
- ✅ Setup database backups

#### INFRA-002: Vercel Project Configuration ✅
**Points**: 2  
**Status**: COMPLETE (2025-08-14)
**Description**: Setup Vercel project with proper environment variables, domains, and deployment configuration.
- ✅ Create Vercel project linked to GitHub repo
- ✅ Configure environment variables (Supabase URL, keys)
- ✅ Setup custom domain (app.ginko.ai)
- ✅ Configure preview deployments
- ✅ Setup production/staging environments

#### INFRA-003: Next.js Application Scaffold ✅
**Points**: 3  
**Status**: COMPLETE (2025-08-14)
**Description**: Initialize Next.js 14 application with TypeScript, Tailwind CSS, and core dependencies.
- ✅ Create Next.js app with App Router
- ✅ Configure TypeScript with strict mode
- ✅ Setup Tailwind CSS with custom theme
- ✅ Install and configure Supabase client SDK
- ✅ Setup ESLint and Prettier

#### INFRA-004: API Key Security Implementation ✅
**Points**: 5
**Status**: COMPLETE (2025-08-14)
**Description**: Implement secure API key generation and management system
- ✅ Bcrypt hash storage for API keys
- ✅ One-time display after generation
- ✅ Secure prefix-only display for existing keys
- ✅ Proper authentication flow with MCP server
- ✅ User ID integration with OAuth system

#### INFRA-004: CI/CD Pipeline
**Points**: 2  
**Description**: Configure GitHub Actions for automated testing, building, and deployment to Vercel.
- Setup GitHub Actions workflow
- Configure automated tests on PR
- Setup type checking and linting
- Configure Vercel deployments
- Add build status badges

---

### 🔐 Authentication & User Management

#### AUTH-001: GitHub OAuth Integration
**Points**: 3  
**Description**: Implement frictionless GitHub OAuth login using Supabase Auth. No passwords, no email verification - just one-click GitHub authentication.
- Configure Supabase GitHub provider
- Create auth callback handlers
- Implement JWT session management
- Add logout functionality

#### AUTH-002: User Profile & Settings
**Points**: 2  
**Description**: Basic user profile setup after first login with API key management for MCP client authentication.
- Auto-create user record on first login
- Generate unique API keys
- Basic profile page (GitHub info display)

---

### 🚀 Onboarding & Setup

#### SETUP-001: One-Line Installer Script
**Points**: 5  
**Description**: Create `npx contextmcp-setup` command that automatically configures everything in under 60 seconds.
- Detect Claude Code installation
- Browser-based auth flow
- Auto-generate .mcp.json config
- Test connection validation
- Success confirmation with next steps

#### SETUP-002: First-Run Experience
**Points**: 3  
**Description**: Intelligent first-run detection with guided walkthrough to ensure users understand the value immediately.
- Detect fresh installation
- Show inline help prompts
- Trigger first capture suggestion
- Celebrate successful setup

---

### 💾 Core Session Management

#### SESSION-001: Capture Session Implementation
**Points**: 5  
**Description**: Core functionality to capture current Claude Code context into Supabase with compression and metadata.
- Capture open files, git status, recent commands
- Compress context efficiently (< 1MB target)
- Store in Supabase with metadata
- Return session ID and quality score
- Handle offline gracefully

#### SESSION-002: Resume Session Implementation
**Points**: 5  
**Description**: Seamless session resumption with context restoration and success confirmation.
- Retrieve session from Supabase
- Decompress and format for Claude
- Generate resumption prompt
- Track resume success metrics
- Show "magic moment" confirmation

#### SESSION-003: Session Quality Scoring
**Points**: 3  
**Description**: Intelligent scoring system to help users understand what makes good context.
- Analyze captured content completeness
- Score based on file relevance
- Provide improvement suggestions
- Display visual quality indicator

---

### 🎯 Auto-Resume Intelligence

#### AUTO-001: Claude Code Startup Hook
**Points**: 3  
**Description**: Detect Claude Code startup and automatically prompt for session resumption.
- Implement MCP startup detection
- Check for recent sessions
- Show non-intrusive resume prompt
- Remember user preferences

#### AUTO-002: Smart Capture Suggestions
**Points**: 5  
**Description**: Proactive prompts to capture sessions at optimal moments based on activity patterns.
- Monitor coding session duration
- Detect natural break points
- Show contextual capture prompts
- Learn from user behavior

---

### 🌐 Web Dashboard

#### WEB-001: Next.js Dashboard Setup
**Points**: 3  
**Description**: Create basic Next.js application with Vercel deployment and Supabase integration.
- Initialize Next.js with TypeScript
- Configure Supabase client
- Setup Vercel deployment
- Implement auth middleware

#### WEB-002: Session Browser UI
**Points**: 5  
**Description**: Visual interface for browsing, searching, and managing captured sessions.
- Session list with preview cards
- Search by description/date
- One-click resume buttons
- Delete/archive functionality
- Mobile responsive design

#### WEB-003: Dashboard Analytics
**Points**: 3  
**Description**: Basic usage analytics to show productivity gains and usage patterns.
- Sessions captured/resumed counts
- Time saved calculations
- Usage frequency charts
- Context quality trends

---

### 👥 Team Collaboration (Post-MVP)

#### TEAM-001: Team Workspaces
**Points**: 5  
**Description**: Allow users to create teams and invite members via email.
- Team creation flow
- Email invitations
- Member management
- Team switching UI

#### TEAM-002: Session Sharing
**Points**: 3  
**Description**: Enable sharing sessions with team members with privacy controls.
- Share toggle per session
- Team activity feed
- Privacy settings
- Shared session indicators

---

### 🔧 Developer Experience

#### DX-001: Error Handling & Recovery
**Points**: 3  
**Description**: Comprehensive error handling with helpful messages and recovery options.
- Graceful failure modes
- Clear error messages
- Retry mechanisms
- Fallback options

#### DX-002: Performance Optimization
**Points**: 3  
**Description**: Ensure fast response times and efficient resource usage.
- Implement caching strategies
- Optimize database queries
- Minimize bundle size
- Add loading states

#### DX-003: Documentation & Help
**Points**: 2  
**Description**: Create essential documentation for getting started and troubleshooting.
- Quick start guide
- FAQ section
- Troubleshooting guide
- Video walkthrough

#### DX-004: Advanced Frontmatter Tooling (ADR-002 Enhancement)
**Points**: 5  
**Priority**: MEDIUM  
**Description**: Build tooling to enhance the ADR-002 frontmatter system beyond manual implementation.
- **Automated frontmatter tooling**: Scripts to add/update frontmatter for existing files
- **Enhanced search capabilities**: Advanced discovery commands and file relationship analysis
- **IDE integration**: VSCode extension for frontmatter templates and validation
- **Development workflow integration**: Git hooks for frontmatter validation and automatic updates
- **Advanced metadata analysis**: Dependency graphs, complexity analysis, and usage patterns

**Context**: Current ADR-002 implementation provides 70% improvement in context discovery for 46% of files. Rather than manually adding frontmatter to remaining low-value files (10-15% additional gain), focus on tooling that amplifies the existing high-value coverage.

**Success Criteria**:
- Automated scripts can add frontmatter to files based on analysis
- Enhanced search finds files by dependency relationships and complexity
- IDE integration makes frontmatter addition seamless for new files
- Git hooks prevent commits without proper frontmatter
- Developer velocity improves by additional 20-30% through tooling

---

### 🚦 Production Readiness

#### PROD-001: Monitoring & Alerts
**Points**: 2  
**Description**: Basic monitoring setup to ensure service reliability.
- Vercel Analytics setup
- Error tracking (Sentry)
- Uptime monitoring
- Basic alerting

#### PROD-002: Rate Limiting & Security
**Points**: 3  
**Description**: Implement security measures and usage limits for sustainability.
- API rate limiting
- Request validation
- CORS configuration
- Basic DDoS protection

#### PROD-003: Production ContextMCP Server Testing 🚨
**Points**: 5  
**Priority**: Critical  
**Status**: New  
**Description**: Comprehensive end-to-end testing of production ContextMCP server integration with Claude Code.
- **User Journey Mapping**: Document complete signup → first use workflow
- **Test Case Creation**: Define test scenarios for authentication, session handoff, and context management  
- **Evaluation Framework**: Create automated evals to validate user experience
- **Results Analysis**: Measure success rates, identify friction points, performance metrics
- **Debug & Iterate**: Fix issues discovered through testing and re-evaluate
- **Acceptance Criteria**: 
  - 95% success rate for complete user journey
  - <30 seconds from signup to working ContextMCP integration
  - Clear error handling for common failure modes
  - Documented troubleshooting guide for users

**Dependencies**: OAuth authentication (✅ Complete), Dashboard deployment (✅ Complete), MCP server integration  
**Impact**: Critical for user adoption and production readiness  
**Estimated Timeline**: 1-2 weeks

---

## MVP Scope (4 Weeks)

### Week 0: Infrastructure (9 points)
- INFRA-001: Supabase Project Setup (2)
- INFRA-002: Vercel Project Configuration (2)
- INFRA-003: Next.js Application Scaffold (3)
- INFRA-004: CI/CD Pipeline (2)

### Week 1 Focus (21 points)
- AUTH-001: GitHub OAuth Integration (3)
- AUTH-002: User Profile & Settings (2)
- SESSION-001: Capture Session Implementation (5)
- SESSION-002: Resume Session Implementation (5)
- WEB-001: Next.js Dashboard Setup (3)
- DX-001: Error Handling & Recovery (3)

### Week 2 Focus (16 points)
- SETUP-001: One-Line Installer Script (5)
- SESSION-003: Session Quality Scoring (3)
- AUTO-001: Claude Code Startup Hook (3)
- WEB-002: Session Browser UI (5)

### Week 3 Focus (13 points)
- SETUP-002: First-Run Experience (3)
- AUTO-002: Smart Capture Suggestions (5)
- WEB-003: Dashboard Analytics (3)
- DX-003: Documentation & Help (2)

### Week 4 Focus (8 points)
- DX-002: Performance Optimization (3)
- PROD-001: Monitoring & Alerts (2)
- PROD-002: Rate Limiting & Security (3)

### Post-MVP (16 points)
- TEAM-001: Team Workspaces (5)
- TEAM-002: Session Sharing (3)

---

### 📈 Marketing & Content

#### CONTENT-001: AI-Readable Code Frontmatter Case Study
**Points**: 5  
**Description**: Transform ADR-002 case study into website content and downloadable mini-whitepaper to demonstrate ContextMCP's proven effectiveness.
- Create compelling landing page showcasing 70% productivity improvement
- Design downloadable PDF whitepaper with technical details and business case
- Add interactive demos showing before/after code navigation
- Include customer-ready ROI calculator
- Create social media content highlighting key metrics (91% faster implementation, 100% success rate)

#### CONTENT-002: "Dogfooding" Developer Story  
**Points**: 3
**Description**: Create authentic developer story about using ContextMCP to build ContextMCP itself.
- Blog post: "We Used Our Own AI Context Tool to Build Our AI Context Tool"
- Developer testimonial videos
- Technical deep-dive for engineering audiences
- GitHub repository showcase with real examples

---

## Success Criteria
- ✅ GitHub login working smoothly
- ✅ One-line setup completes in < 60 seconds
- ✅ Capture/resume cycle works flawlessly
- ✅ Auto-resume prompts appear on startup
- ✅ Dashboard shows sessions visually
- ✅ 95% setup success rate
- ✅ < 5 minute time to first value
- ✅ Zero critical bugs at launch

## Total MVP Points: 67 (including infrastructure)
## Marketing Content Points: 8 (post-MVP)
## Team Velocity: 20 points/day
## Timeline: ~3.5 days to complete MVP + 0.4 days for content