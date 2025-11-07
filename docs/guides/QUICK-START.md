/**
 * @fileType: guide
 * @status: current
 * @updated: 2025-11-07
 * @tags: [documentation, quick-start, tutorial, onboarding]
 * @related: [USER-GUIDE.md, CLI-REFERENCE.md]
 * @priority: critical
 * @complexity: low
 */

# Quick Start Guide

Get started with Ginko in 5 minutes. This guide walks you through installation, authentication, and creating your first knowledge graph.

---

## What is Ginko?

Ginko is a **git-native CLI for intelligent context management** in AI-assisted development. It helps teams:

- **Capture knowledge** - Store ADRs, PRDs, patterns, and insights in a cloud knowledge graph
- **Search semantically** - Find relevant context using natural language queries
- **Collaborate better** - Share knowledge across your team automatically
- **Preserve context** - Never lose important decisions or patterns

---

## Installation

### Prerequisites

- Node.js 18+ installed
- GitHub account (for authentication)
- Git repository (optional, but recommended)

### Install the CLI

```bash
npm install -g @ginko/cli
```

Verify installation:

```bash
ginko --version
```

---

## Step 1: Authenticate with GitHub

```bash
ginko login
```

This will:
1. Open your browser to GitHub OAuth
2. Authenticate your account
3. Generate a long-lived API key (like git credentials)
4. Store credentials locally at `~/.ginko/auth.json`

**Verify authentication:**

```bash
ginko whoami
```

You should see your GitHub username and API key prefix.

---

## Step 2: Create Your First Project

Projects organize knowledge by repository or team. Create one for your current repo:

```bash
# In your git repository
ginko project create my-app --repo=github.com/yourname/my-app
```

**What this does:**
- Creates a project in the cloud knowledge graph
- Links it to your GitHub repository
- Sets up multi-tenant access control
- Makes this your active project

**Verify project creation:**

```bash
ginko project list
```

---

## Step 3: Add Your First ADR

Architecture Decision Records (ADRs) capture important technical decisions. Let's create one:

```bash
ginko knowledge create \
  --type ADR \
  --title "Use PostgreSQL for primary database" \
  --content "We chose PostgreSQL because it provides excellent JSON support, strong ACID guarantees, and proven scalability for our use case." \
  --tags database,architecture \
  --status accepted
```

**What this does:**
- Creates a knowledge node in your project's graph
- Generates vector embeddings for semantic search
- Indexes the content by tags and type
- Makes it searchable immediately

---

## Step 4: Search Your Knowledge

Now search for what you just created:

```bash
ginko knowledge search "database decision"
```

You should see your ADR with a similarity score. The search uses **semantic similarity**, so it works even if you don't use exact keywords.

**Try different searches:**

```bash
# Search with filters
ginko knowledge search "architecture" --type ADR --limit 5

# Search across all types
ginko knowledge search "postgres" --threshold 0.7

# Display as table
ginko knowledge search "database" --table
```

---

## Step 5: Visualize Relationships

Knowledge nodes can reference each other. Let's create a PRD that references the ADR:

```bash
ginko knowledge create \
  --type PRD \
  --title "User Authentication System" \
  --content "Implement user authentication using PostgreSQL for session storage." \
  --tags auth,users
```

Now visualize the relationship graph:

```bash
# Get the ADR ID from the previous search
ginko knowledge graph <adr-id>
```

This shows:
- The center node (your ADR)
- Connected nodes (PRDs, other ADRs)
- Relationship types (IMPLEMENTS, REFERENCES, TAGGED_WITH)

---

## Step 6: Explore the Public Catalog

Browse public knowledge from open-source projects:

```bash
# Visit the public catalog
open https://app.ginkoai.com/explore
```

You can:
- Search across all public knowledge graphs
- Filter by tags, types, and projects
- Discover patterns and decisions from other teams
- Fork interesting knowledge into your projects

---

## What's Next?

### Common Workflows

**Daily Development:**
```bash
# Start a session (loads team context)
ginko start

# Log important insights
ginko log "Discovered that async validation reduces form lag by 40%"

# Search for related knowledge
ginko knowledge search "form validation patterns"
```

**Team Collaboration:**
```bash
# Invite team members
ginko project add-member alice@example.com --role editor

# Create a team
ginko team create backend-team

# Add team to project
ginko team add-to-project backend-team my-app
```

**Migration from Local Files:**
```bash
# Sync existing ADRs to cloud
ginko knowledge sync docs/adr/ --type ADR --dry-run
ginko knowledge sync docs/adr/ --type ADR
```

### Learn More

- **[User Guide](./USER-GUIDE.md)** - Complete feature documentation
- **[CLI Reference](./CLI-REFERENCE.md)** - All commands and options
- **[API Reference](../api/API-REFERENCE.md)** - REST and GraphQL APIs
- **[Migration Guide](./MIGRATION-GUIDE.md)** - Move from local files to cloud

---

## Troubleshooting

### "Authentication failed"

**Solution:** Regenerate your API key:
```bash
ginko login --force
```

### "No active project"

**Solution:** Set an active project:
```bash
ginko project list
ginko project use <project-id>
```

### "Search returns no results"

**Possible causes:**
1. Similarity threshold too high (try `--threshold 0.6`)
2. Content not indexed yet (wait 30 seconds after creation)
3. No matching content (try broader search terms)

### "Command not found: ginko"

**Solution:** Add npm global bin to PATH:
```bash
npm config get prefix  # Shows npm global directory
export PATH="$(npm config get prefix)/bin:$PATH"
```

---

## Getting Help

- **Documentation:** https://docs.ginkoai.com
- **GitHub Issues:** https://github.com/chrispangg/ginko/issues
- **Discord:** https://discord.gg/ginko
- **Email:** chris@watchhill.ai

---

**Congratulations!** You've created your first knowledge graph, added knowledge, and performed semantic search. You're ready to use Ginko in your daily development workflow.

Next: Check out the [User Guide](./USER-GUIDE.md) for advanced features like team collaboration, relationship management, and context-aware queries.
