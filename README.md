# Ginko

A collaborative SaaS platform for intelligent context management in Claude Code sessions. Transforms individual development into team-wide context intelligence.

**🌐 Live Production**: https://app.ginko.ai

## 🎯 Mission

**Individual Problem**: Claude Code sessions become inefficient as projects grow, with stale context and redundant work.

**Team Solution**: A shared context intelligence platform where every team member's interactions improve the collective understanding of the codebase.

## 🌟 Current Status: Phase 2 Complete ✅

### ✅ **Phase 1**: Local MCP Server (Complete)
- Individual context management
- Basic project analysis tools
- Claude Code integration

### ✅ **Phase 2**: Remote SaaS Platform (Complete)
- Multi-client remote MCP server
- Team collaboration features  
- Real-time WebSocket communication
- HTTP API with enhanced logging
- Successfully tested and deployed on port 3031

### ✅ **Phase 3**: Production-Ready SaaS (Complete)
- Real-time context synchronization
- Git webhook integration
- Team activity tracking
- Database persistence
- **Identity & Authentication** (API key-based auth)
- **Billing & Subscriptions** (Stripe integration)
- **Usage-based Entitlements** (Free/Pro/Enterprise tiers)

## 🏗️ Architecture Overview

### **Remote SaaS Platform**
```
┌─────────────────────────────────────────┐
│          ContextMCP SaaS Server         │
├─────────────────────────────────────────┤
│  🌐 HTTP/WebSocket API (Port 3031)     │
│  👥 Team Collaboration Engine          │
│  🔄 Real-time Context Sync             │
│  📊 Context Intelligence & Analytics   │
│  🗄️  Persistent Context Storage        │
│  🔐 Multi-tenant Team Management       │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│        Team Development Workflow        │
├─────────────────────────────────────────┤
│  Developer A ──┐                       │
│  Developer B ──┼─► Shared Context ──────┤
│  Developer C ──┘     Intelligence      │
│                                         │
│  • Real-time context updates           │
│  • Collaborative insights              │
│  • Team activity tracking              │
│  • Cross-developer learning            │
└─────────────────────────────────────────┘
```

### **Key Components Delivered**

#### 1. **Serverless MCP API** (`api/mcp/tools/call.ts`)
- Vercel serverless functions with enhanced logging  
- Pure HTTP REST API for stateless operations
- 21 intelligent context tools with team enhancements
- Multi-tenant context management per team/project

#### 2. **MCP Client Proxy** (`src/simple-remote-client.ts`)
- Seamless Claude Code integration
- Automatic team context injection
- Error handling with graceful fallbacks
- Remote API communication layer

#### 3. **Team Collaboration Features**
- **Shared Context**: All team members access same intelligent analysis
- **Activity Broadcasting**: Real-time team activity via WebSockets
- **Context Enhancement**: Team insights added to every response
- **Usage Patterns**: Collective learning from team interactions

## 🚀 Getting Started

### **Local Development**
```bash
# Install dependencies
npm install

# Start the remote SaaS server
npm run dev:remote
# Server runs on http://localhost:3031

# In another terminal, configure Claude Code
cp .mcp-remote.json .mcp.json
claude
```

### **Available Tools**
1. **get_project_overview** - Collaborative project analysis with team insights
2. **find_relevant_code** - Semantic code search with team usage patterns  
3. **get_file_context** - File analysis with dependency tracking
4. **get_recent_changes** - Git history with team activity context
5. **get_team_activity** - Real-time team collaboration insights

### **Testing**
```bash
# Quick server test
./quick-test.sh

# Full integration test  
./test-remote-mcp.sh

# Health check
curl http://localhost:3031/health
```

## 🔮 Phase 3: Production SaaS Roadmap

### **Real-time Context Synchronization**
- **Git Webhooks**: Automatic context updates on code changes
- **File System Watching**: Live development environment sync
- **Smart Invalidation**: Efficient context cache management
- **Background Re-indexing**: Non-blocking context updates

### **Enhanced Team Intelligence**
- **Pattern Recognition**: Learn from team coding patterns
- **Cross-developer Insights**: Share knowledge across team members
- **Focus Area Detection**: Identify team collaboration hotspots
- **Historical Context**: Track project evolution over time

### **Production Features**
- **Database Persistence**: PostgreSQL for context storage
- **Authentication**: Team-based access control
- **Analytics Dashboard**: Team productivity insights
- **Multi-project Management**: Enterprise team support
- **Performance Optimization**: Edge caching and CDN integration

### **Deployment Options**
- **Cloud-Native**: AWS/GCP with auto-scaling
- **On-Premise**: Self-hosted for enterprise security
- **Hybrid**: Edge nodes with central synchronization

## 💳 Pricing & Plans

### **Free Plan** - $0/month
- 1 project
- 50 sessions/month
- Basic context management
- Local sessions only

### **Pro Plan** - $9/month or $90/year
- 10 projects
- 1,000 sessions/month
- Team collaboration
- Git integration
- Usage analytics
- Best practices management

### **Enterprise Plan** - $29/month or $290/year
- Unlimited projects & sessions
- SSO integration
- Custom integrations
- Priority support
- Advanced analytics
- White-label options

## 🔐 Authentication & Billing

Ginko uses API key authentication with Stripe for subscription management:

1. **API Keys**: Secure authentication with bcrypt hashing
2. **Entitlements**: Plan-based feature access control
3. **Usage Tracking**: Real-time usage monitoring and limits
4. **Billing**: Stripe integration for subscriptions

See [docs/BILLING-SETUP.md](docs/BILLING-SETUP.md) for detailed setup instructions.

## 📚 Documentation

### Architecture Decision Records (ADRs)
Important architectural decisions are documented in [docs/architecture/](docs/architecture/):

- **[ADR Index](docs/architecture/ADR-INDEX.md)** - Complete list of all architecture decisions
- **[ADR Template](docs/architecture/ADR-TEMPLATE.md)** - Template for new architecture decisions

#### Creating New ADRs
```bash
# Use the helper script to ensure unique numbering
./scripts/create-adr.sh "Your ADR Title"

# Or manually:
# 1. Check ADR-INDEX.md for next available number
# 2. Copy ADR-TEMPLATE.md to ADR-XXX-your-title.md  
# 3. Update ADR-INDEX.md with your new ADR
# 4. Commit both files together
```

### Product Requirements Documents (PRDs)
Product features are documented in [docs/product-requirements/](docs/product-requirements/).

### Development Guides
- [BACKLOG.md](BACKLOG.md) - Current development roadmap
- [docs/BILLING-SETUP.md](docs/BILLING-SETUP.md) - Billing integration setup

---

**🎯 Vision**: Transform Claude Code from individual tool to collaborative team intelligence platform, where every developer's interactions enhance the collective understanding of the codebase.