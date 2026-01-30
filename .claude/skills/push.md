# Push Skill (ADR-077)

## Purpose
Push local content changes to the Ginko Cloud knowledge graph using git-integrated change detection.

## When to Use
- After creating or modifying content files (epics, sprints, ADRs, charters, patterns, gotchas)
- After `ginko handoff` to ensure all work is synced
- After `ginko task complete` / `ginko sprint complete` to persist state
- When the orchestrator detects unpushed content changes
- When user requests sync to graph

## Command Reference

```bash
# Push all changes since last push
ginko push

# Push specific entity types
ginko push epic                   # All changed epics
ginko push epic EPIC-001          # Specific epic
ginko push sprint e001_s01        # Specific sprint
ginko push charter                # Project charter
ginko push adr                    # All changed ADRs

# Options
ginko push --dry-run              # Preview without pushing
ginko push --force                # Overwrite graph content
ginko push --all                  # Push all (not just changes)
ginko push --no-events            # Skip event files
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--dry-run` | Preview what would be pushed | false |
| `--force` | Overwrite graph even if conflicts | false |
| `--all` | Push all content files, ignoring change detection | false |
| `--no-events` | Skip pushing event JSONL files | false |

## Error Handling

| Error | Action |
|-------|--------|
| `Not authenticated` | Prompt: Run `ginko login` |
| `Graph not initialized` | Prompt: Run `ginko graph init` |
| 5xx server error | Retry with exponential backoff (handled by API client) |
| 4xx client error | Report to user, do not retry |
| Network error | Retry up to 3 times |

## Behavioral Rules

1. **Always push after entity creation** - When an epic, sprint, charter, or ADR is created, push immediately
2. **Push is non-blocking for auto-push** - When dispatched as a subagent, run in background
3. **Prefer targeted push** - Use `ginko push epic` instead of `ginko push` when you know the entity type
4. **Never use deprecated alternatives** - Do not use `ginko graph load` or `--sync` flags
5. **Report results concisely** - Show file count, task count, and event count

## Anti-Patterns (DO NOT)

- Do NOT use `ginko graph load` (deprecated, use `ginko push --all`)
- Do NOT use `ginko epic --sync` (deprecated, use `ginko push epic`)
- Do NOT use `ginko charter --sync` (deprecated, use `ginko push charter`)
- Do NOT use curl/fetch to hit graph API directly
- Do NOT skip push after creating content

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Push completed successfully |
| 1 | Push failed (auth, config, or API error) |
