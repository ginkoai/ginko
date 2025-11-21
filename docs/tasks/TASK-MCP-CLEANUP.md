# TASK: Remove MCP References

**Priority:** Medium
**Status:** Not Started
**Created:** 2025-11-21
**Context:** MCP was deprecated in favor of direct CLI calls

## Background

MCP (Model Context Protocol) server was previously used but has been deprecated. The CLI now makes direct calls instead. References to MCP remain in the codebase and should be cleaned up.

## Scope

**Search for and remove:**
- MCP-related code files
- MCP imports and dependencies
- MCP configuration
- MCP documentation references
- MCP-related npm scripts
- MCP package in monorepo (`packages/mcp-server/`)

**Preserve:**
- Any MCP protocol concepts that are still relevant to the architecture
- Historical documentation that provides context

## Acceptance Criteria

- [ ] All MCP code files removed or updated
- [ ] No MCP imports in active code
- [ ] MCP package removed from monorepo (if exists)
- [ ] Build scripts updated (remove `build:mcp` references)
- [ ] Documentation updated to reflect current architecture
- [ ] Tests updated/removed as needed
- [ ] No breaking changes to CLI functionality

## Estimated Effort

4-6 hours

## Files to Check

```bash
# Find MCP references
grep -r "mcp" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" .
```

## Related

- Architecture change from MCP server to direct CLI calls
- Simplification of deployment (fewer moving parts)

---

**Note:** This is a cleanup task - no new functionality, just removing deprecated code.
