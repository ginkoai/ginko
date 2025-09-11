---
id: TASK-002
type: task
title: Implement Create Command with Templates
parent: STORY-001
status: PROPOSED
priority: CRITICAL
created: 2025-09-10
updated: 2025-09-10
effort: 3
tags: [create, templates, file-generation]
sprint: 2025-09-week-2
---

# Implement Create Command with Templates

## Description
Build the create command that generates new backlog items from templates with proper frontmatter and file naming.

## Checklist
- [ ] Implement ID generation (scan existing files)
- [ ] Create slug generation from title
- [ ] Load appropriate template based on type
- [ ] Fill frontmatter with metadata
- [ ] Write file to backlog/items/
- [ ] Update index.md with new item

## Code Structure
```typescript
// packages/cli/src/commands/backlog/create.ts
async execute(type: ItemType, description: string) {
  const nextId = await this.getNextId(type);
  const slug = this.generateSlug(description);
  const filename = `${type}-${nextId}-${slug}.md`;
  
  const template = await this.loadTemplate(type);
  const content = this.fillTemplate(template, {
    id: `${type}-${nextId}`,
    title: description,
    created: new Date().toISOString().split('T')[0]
  });
  
  await fs.writeFile(`backlog/items/${filename}`, content);
  await this.updateIndex(type, nextId, description);
}
```

## Notes
- Validate type is valid (epic/feature/story/task)
- Handle file conflicts gracefully
- Ensure atomic operations (don't leave partial state)