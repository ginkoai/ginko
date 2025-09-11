---
id: STORY-002
type: story
title: AI Integration Layer for Natural Language
parent: FEATURE-021
status: PROPOSED
priority: CRITICAL
created: 2025-09-10
updated: 2025-09-10
effort: 5
children: [TASK-005, TASK-006, TASK-007, TASK-008]
tags: [ai, natural-language, templates, context]
sprint: 2025-09-week-3
---

# AI Integration Layer for Natural Language

## User Story
As a developer
I want to use natural language to manage my backlog
So that I don't need to remember command syntax

## Acceptance Criteria
- [ ] `ginko "create feature for oauth"` understands intent
- [ ] `ginko "what am I working on?"` shows current work
- [ ] `ginko "ship it"` creates PR with proper links
- [ ] Templates guide AI to consistent output
- [ ] Context from git and filesystem enriches responses

## Tasks
- [ ] TASK-005: Create template system for AI guidance
- [ ] TASK-006: Implement intent detection and routing
- [ ] TASK-007: Add context gathering (git, files, history)
- [ ] TASK-008: Integrate AI API (OpenAI/Anthropic)

## Technical Notes
- Templates in templates/backlog/*.md
- Intent detection via pattern matching + AI
- Context includes: git status, recent commits, current branch
- Graceful fallback if AI unavailable
- Response caching for common queries

## AI Templates Structure
```yaml
template: feature-create
inputs: {description, context}
prompts: Extract problem, generate criteria
outputs: Valid frontmatter + content
validation: Required fields present
```

## Definition of Done
- [ ] Natural language creates valid items
- [ ] AI responses consistent via templates
- [ ] Context improves AI accuracy
- [ ] Fallback to structured commands works
- [ ] API keys configurable