---
description: Complete session handoff with cleanup, docs, and commit
---

Prepare a complete session handoff.

**Consider these user comments**: $ARGUMENTS
Seek clarification if necessary.

**Safety check**: If the system appears to be in a broken state, incomplete work, or if the primary goal hasn't been achieved, call `/vibecheck` to assess whether a handoff is appropriate right now.

1. **Clean up temporary files**:
   - Remove any test files or temporary scripts
   - Clean up debug outputs
   - Check for and remove any .tmp, .log, or test-* files

2. **Update documentation**:
   - Update BACKLOG.md if features were completed
   - Check if CLAUDE.md needs updates for new patterns
   - Note any new architectural decisions

3. **Commit all changes**:
   - Review all modified files with git status
   - Stage appropriate changes
   - Create a descriptive commit message
   - Include co-author: Chris Norton <chris@ginko.ai>

4. **Generate session handoff**:
   - Run prepare_handoff to generate template with temp file preview
   - **PAUSE**: Show user the temp file path for review
   - Wait for user approval before proceeding  
   - Fill out template completely with actual session details
   - Use store_handoff to save the completed handoff
   - Clean up temp file after successful save
   - Include current branch state and next steps

5. **Score collaboration session**:
   - Use score_collaboration_session to analyze current session
   - Evaluate task completion, context efficiency, session momentum
   - Generate scoring data for dashboard analytics
   - Store comprehensive scorecard in database

6. **Generate coaching insights**:
   - Use generate_coaching_insights to analyze session patterns
   - Identify collaboration strengths and improvement areas  
   - Provide personalized workflow recommendations
   - Create actionable insights for next session preparation

Make sure to:
- Verify no secrets or API keys are being committed
- Ensure all tests pass before committing
- Leave the codebase in a working state
- Document any environment changes needed

This ensures a smooth transition for the next session.