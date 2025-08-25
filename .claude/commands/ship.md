---
description: Create and push a PR-ready branch with all changes
---

Ship the current work by creating a pull request.

**Consider these user comments**: $ARGUMENTS
Seek clarification if necessary (e.g., PR title, target branch, urgency).

**Safety check**: If tests are failing, code is incomplete, or there are obvious issues, call `/vibecheck` to assess whether shipping is appropriate right now.

1. **Pre-flight checks**:
   - Run linting: `npm run lint` (if available)
   - Run type checking: `npm run typecheck` (if available)
   - Run tests: `npm test`
   - Ensure all checks pass

2. **Clean up and commit**:
   - Review all changes with git diff
   - Stage all appropriate files
   - Create atomic, well-described commits
   - Co-author: Chris Norton <chris@ginko.ai>

3. **Prepare the branch**:
   - Ensure branch name follows pattern: feat/*, fix/*, chore/*
   - Push to remote with -u flag
   - Set up tracking if needed

4. **Create pull request**:
   - Use gh pr create
   - Generate comprehensive PR description from commits
   - Include test plan
   - Link any related issues
   - Add appropriate labels

5. **Post-PR actions**:
   - Share PR URL with user
   - Run /mcp handoff to document session
   - Note any deployment considerations

Remember:
- Never push directly to main/master
- Always include test plans in PRs
- Document breaking changes clearly