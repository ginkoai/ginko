---
id: TASK-008
type: task
title: Integrate interactive mode for first-time ginko init setup
parent:
  - SPRINT-2025-08-28-enhanced-ginko-init
status: todo
priority: medium
created: '2025-10-20T21:00:00.000Z'
updated: '2025-10-20T21:00:00.000Z'
effort: 3-4 hours
tags: [init, ux, onboarding, interactive]
sprint: null
size: M
author: chris@watchhill.ai
---

# Integrate interactive mode for first-time ginko init setup

## Description
Interactive configuration code exists but is archived and not integrated into the init command. The interactive mode would guide first-time users through setup with prompts for preferences, improving the onboarding experience.

**Current state**:
- Code exists: `packages/cli/src/_archive/config-backup/interactive-config.ts`
- Not imported or used in `packages/cli/src/commands/init.ts`
- No `--interactive` flag defined in CLI interface

**Expected behavior**:
- `ginko init --interactive` prompts user for:
  - AI model preference (Claude, GPT, Cursor, etc.)
  - Privacy settings (analytics, telemetry)
  - Hint verbosity level (minimal/normal/verbose)
  - Project analysis depth (quick/standard/deep)

## Checklist
- [ ] Review archived `interactive-config.ts` for usability
- [ ] Unarchive and move to `packages/cli/src/core/config/`
- [ ] Add `--interactive` flag to `packages/cli/src/index.ts`
- [ ] Integrate `InteractiveConfigSetup` into init command
- [ ] Add first-time user detection (no existing .ginko directory)
- [ ] Create prompts using inquirer or similar library
- [ ] Test interactive flow end-to-end
- [ ] Update documentation with --interactive flag usage
- [ ] Add unit tests for interactive config logic

## Technical Implementation

**Files to modify**:
1. `packages/cli/src/index.ts` - Add `--interactive` flag
2. `packages/cli/src/commands/init.ts` - Call interactive config when flag present
3. Move `_archive/config-backup/interactive-config.ts` to active location

**Example flow**:
```typescript
if (options.interactive || isFirstTime) {
  const config = await InteractiveConfigSetup.prompt();
  await saveConfig(config);
} else {
  // Use defaults
}
```

**Prompt questions**:
1. "Which AI assistant will you primarily use?" (Claude/GPT/Cursor/Generic)
2. "Share anonymous usage analytics?" (Yes/No) - Privacy-first default: No
3. "How detailed should hints be?" (Minimal/Normal/Verbose)
4. "Analyze project structure now?" (Yes/No/Later)

## UX Considerations
- Make interactive mode opt-in, not forced
- Defaults should be sensible (privacy-first)
- Allow skipping questions (ESC or Enter for default)
- Show what's being configured as you go
- Provide --no-interactive to skip even on first run
- Consider auto-detecting first-time vs returning users

## Success Criteria
- [ ] `ginko init --interactive` prompts for all config options
- [ ] First-time users see helpful onboarding prompts
- [ ] Returning users get fast default init (no prompts)
- [ ] All prompts have sensible defaults
- [ ] Config saved correctly to .ginko/config.json
- [ ] UX feels polished (clear, non-intrusive)

## Notes
- Related to Sprint Phase 3 Task: "Add interactive mode for first-time setup"
- Sprint estimated 2 hours, but integration + testing = 3-4 hours realistic
- Consider deferring this in favor of testing (TASK-007) if prioritizing production readiness
- Interactive mode is "nice to have" not "must have" for v1.0
- Could be part of future "ginko config" command instead of init
