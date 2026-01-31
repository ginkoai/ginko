# Pull Skill (ADR-077)

## Purpose
Pull dashboard edits from the Ginko Cloud knowledge graph to local git repository.

## When to Use
- At the start of a session when team context may be stale
- When `ginko start` shows staleness warnings
- When user requests updates from dashboard
- After team members have made edits in the dashboard

## Command Reference

```bash
# Pull all changes from graph
ginko pull

# Pull specific entity types
ginko pull sprint              # Pull sprint changes (status updates)
ginko pull adr                 # Pull ADR edits
ginko pull epic                # Pull epic changes

# Options
ginko pull --dry-run           # Preview without pulling
ginko pull --force             # Overwrite local with graph versions
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--dry-run` | Preview what would be pulled | false |
| `--force` | Overwrite local files with graph versions | false |

## Error Handling

| Error | Action |
|-------|--------|
| `Not authenticated` | Prompt: Run `ginko login` |
| `Graph not initialized` | Prompt: Run `ginko graph init` |
| Conflict detected | Interactive resolution (use-graph, use-local, skip) |
| 5xx server error | Retry with exponential backoff |

## Behavioral Rules

1. **Pull at session start** - When `ginko start` shows staleness, auto-pull
2. **Content conflicts: local wins** - Per ADR-060, content in git is authoritative
3. **State conflicts: graph wins** - Status, assignments are graph-authoritative
4. **Never use deprecated alternatives** - Do not use `ginko sync` (deprecated)
5. **After pull, suggest push** - If local has unpushed changes, suggest `ginko push`

## Anti-Patterns (DO NOT)

- Do NOT use `ginko sync` (deprecated, use `ginko pull`)
- Do NOT use curl/fetch to hit graph API directly
- Do NOT skip pull when team context is stale
