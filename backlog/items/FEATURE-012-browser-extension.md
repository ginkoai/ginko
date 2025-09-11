---
id: FEATURE-012
type: feature
title: Ginko Browser Extension for Claude.ai
parent: null
status: IN_PROGRESS
priority: CRITICAL
created: 2025-01-17
updated: 2025-09-10
effort: 8
children: []
tags: [browser-extension, chrome, claude-ai, session-management]
adr: ADR-004
---

# Ginko Browser Extension for Claude.ai

## Problem Statement
95% of Claude users work through browser (claude.ai), not CLI tools. Context lost between sessions causes 25-45 minutes rebuild time. No mechanism for team knowledge sharing. 96% higher token costs due to context repetition.

## Solution
Build Chrome extension that bridges browser-based Claude.ai users with git-native session management through a sidebar companion model that is ToS compliant and progressively enhances from browser to CLI usage.

## Success Criteria
- [ ] Zero-friction context capture from browser
- [ ] 80% reduction in context rebuild time
- [ ] ToS compliant (no DOM manipulation)
- [ ] Progressive enhancement to CLI tools
- [ ] Team knowledge sharing enabled

## Architecture
- Sidebar companion model (no DOM manipulation)
- User-initiated actions only (ToS compliant)
- Progressive enhancement from browser to CLI
- GitHub integration optional
- Education-focused approach

## Implementation Phases

### Phase 1: Foundation & Discovery
- [ ] Create Chrome extension manifest v3
- [ ] Implement sidebar panel detecting Claude.ai
- [ ] Build session timer and tracking
- [ ] Test CSP compatibility

### Phase 2: Core Value
- [ ] Create browser-optimized templates
- [ ] Implement conversation analyzer
- [ ] Build time-waste calculator
- [ ] Generate handoffs from sessions

### Phase 3: GitHub Integration
- [ ] OAuth flow for GitHub
- [ ] Push handoffs to repo
- [ ] Pull context from repo
- [ ] Team sharing features

## Technical Notes
- Chrome Extension Manifest v3
- Sidebar architecture for ToS compliance
- Local storage for session data
- Optional GitHub integration
- Progressive web app principles

## Impact
Addresses 95% of users who work in browser, enabling them to benefit from git-native context management without leaving their preferred interface.