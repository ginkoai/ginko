---
type: architecture
tags: [cli, privacy, git-native, core]
area: /packages/cli/**
created: 2025-08-27
updated: 2025-08-27
relevance: critical
dependencies: []
---

# Ginko CLI Architecture

## Quick Summary
Privacy-first CLI tool for AI-assisted development. All data stays local in git.

## Core Principles
- **No code leaves machine** - Everything stored in .ginko/ directory
- **Git-native persistence** - Sessions tracked as markdown files
- **AI-agnostic** - Works with Claude, GPT-4, Gemini, Llama
- **Progressive enhancement** - Works 100% offline

## Key Commands
- `ginko init` - Set up project (creates .ginko/)
- `ginko start` - Begin/resume session
- `ginko handoff` - Save progress
- `ginko context` - Manage what AI knows

## Directory Structure
```
.ginko/
├── sessions/       # Handoff files
├── context/        # Context modules (this system)
├── patterns/       # Discovered patterns
└── config.json     # User preferences
```

## Important Context
Pivoted from MCP server to CLI (ADR-020) for universal adoption.
Privacy-first approach enables enterprise use without compliance issues.