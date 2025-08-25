---
description: Diagnose and debug issues with contextual intelligence
---

Help debug the current situation.

**Consider these user comments**: $ARGUMENTS
Seek clarification if necessary about symptoms, error messages, or expected behavior.

Based on the context, perform appropriate debugging steps:

1. **If it's a build/test failure**:
   - Check recent changes that might have caused it
   - Review error logs and stack traces
   - Verify dependencies and environment
   - Run isolated tests to narrow down the issue

2. **If it's a runtime issue**:
   - Examine the relevant code paths
   - Check for common pitfalls (null checks, async issues, etc.)
   - Review recent commits for changes
   - Look for similar patterns that work correctly

3. **If it's a configuration problem**:
   - Check environment variables
   - Verify config files (.env, .json, etc.)
   - Compare with working examples
   - Test with minimal configuration

4. **If it's unclear what's wrong**:
   - Ask clarifying questions about:
     - When did it last work?
     - What changed recently?
     - What's the expected vs actual behavior?
   - Suggest diagnostic commands to run
   - Propose a systematic debugging approach

Remember:
- Start with the simplest explanation
- Verify assumptions before diving deep
- Document findings for future reference