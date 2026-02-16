Start a ginko session using the ginko CLI:
- Run `ginko start --non-interactive` to begin or resume your session
- Load context from `.ginko/sessions/[user]/current.md`
- Check `.ginko/context/modules/` for relevant context modules
- Review any uncommitted handoffs in `.ginko/`

IMPORTANT: Always use `--non-interactive` flag when running ginko start from an AI session.
This prevents interactive prompts that would hang waiting for human input.

The ginko CLI automatically handles:
- Session continuity with handoff resumption
- Context module discovery based on current work
- Git-native tracking of all session data

This ensures you're synchronized with the team and continuing from where you left off.
