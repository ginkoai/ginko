# UX Reference Documentation

This directory contains comprehensive user experience documentation for Ginko's statusline intelligence feature.

## Documents

### [E2E-USER-JOURNEY.md](./E2E-USER-JOURNEY.md)
**Complete end-to-end user journey** from GitHub sign-in through active coaching usage.

- **Purpose**: Product team reference for complete user experience
- **Audience**: Product managers, engineers, support team
- **Coverage**: Authentication, onboarding, installation, first use
- **Metrics**: Success criteria, conversion funnels, drop-off points

### [INSTALLATION-FLOWS.md](./INSTALLATION-FLOWS.md) 
**Detailed installation interface specifications** for CLI and dashboard interactions.

- **Purpose**: Engineering implementation reference
- **Audience**: Frontend/backend engineers, QA team
- **Coverage**: Exact copy, UI layouts, decision trees, error handling
- **Implementation**: Ready-to-code specifications

## Quick Reference

### Key User Flows
1. **GitHub Auth** → Dashboard welcome → Setup instructions
2. **CLI Install** → Hook consent → Analytics consent → Installation  
3. **Claude Restart** → Hook activation → First coaching message

### Critical Success Metrics
- **Overall Conversion**: 52% (GitHub auth → First coaching)
- **Hook Consent Rate**: 70% target
- **Time to First Message**: <2 minutes
- **Installation Completion**: <5 minutes

### Drop-off Mitigation
- **Hook hesitancy**: Clear value demo, privacy guarantees
- **Technical complexity**: Step-by-step guidance, video tutorials
- **Restart friction**: Bold instructions, status checking

## Implementation Notes

### Development Priorities
1. **Hook consent flow** - Most critical conversion point
2. **Privacy messaging** - Build trust early
3. **Error recovery** - Graceful failure handling
4. **Success celebration** - Reinforce value delivered

### Testing Requirements
- Cross-platform compatibility (macOS, Linux, Windows/WSL)
- Various Claude Code versions
- Network failure scenarios
- Permission edge cases

---

*Last updated: 2025-08-19*  
*Maintained by: Ginko Product Team*