---
id: FEATURE-015
type: feature
title: Slash Command Handoff System
parent: null
status: PROPOSED
priority: CRITICAL
created: 2025-08-26
updated: 2025-09-10
effort: 3
children: []
tags: [handoff, slash-commands, ux, session-management]
---

# Slash Command Handoff System

## Problem Statement
Current handoff process requires multiple MCP tool calls and manual template filling. Users from WatchHill project report the slash command workflow (`/handoff` and `/start`) provided superior UX with seamless session continuity.

## Solution
Implement slash commands for frictionless session management:

### `/handoff` Command
- **Syntax**: `/handoff [comment] [mode]`
- **Modes**: Architecture | Planning | Building | Debugging | Testing | Shipping
- Auto-detect mode based on activity patterns
- Capture session state and context
- Clean up temp files and caches
- Create git commit if uncommitted changes
- Generate handoff in `.ginko/sessions/[user]/YYYY-MM-DD-HHMMSS-handoff.md`
- Store in git automatically

### `/start` Command  
- **Syntax**: `/start [sessionId]`
- Load most recent handoff (or specific session)
- Pull project overview and best practices
- Generate personalized greeting (time/progress-aware)
- Present comprehensive recap
- Offer continuation choices

## Success Criteria
- [ ] Single command session capture
- [ ] Zero-friction session resume
- [ ] Mode detection accuracy >80%
- [ ] Session continuity feels seamless
- [ ] Git integration automatic

## Technical Notes
- Integrates with MCP server
- Uses Claude Code extension API
- Git operations automated
- Template-based handoff generation
- Context-aware mode detection

## Dependencies
- MCP server infrastructure
- Git integration layer
- Claude Code extension API
- Template system