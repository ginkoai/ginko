---
type: best-practice
category: debugging
priority: high
updated: 2025-08-03
tags: [debugging, problem-solving, systematic-approach, deployment]
related: [UX-001-user-journey-friction-analysis.md]
audience: [developer, team]
---

# Hypothesis-Driven Debugging Approach

## Overview
When facing complex technical issues with multiple potential causes, use a systematic hypothesis-driven approach rather than random trial-and-error.

## Why This Matters
**Proven Impact**: During OAuth deployment debugging (Aug 3, 2025), this approach:
- Solved a 4-hour deployment blocker systematically
- Prevented infinite debugging loops
- Created clear documentation of what was tried and why
- Led to the root cause discovery (.vercelignore exclusion issue)

## The Process

### 1. **HYPOTHESIS Formation**
```
HYPOTHESIS N: [Problem statement]
ROOT CAUSE: [Specific technical reason you suspect]
SOLUTION: [Targeted fix to test the hypothesis]
EXPECTED RESULT: [What should happen if hypothesis is correct]
```

### 2. **Implementation**
- Make the MINIMAL change needed to test the hypothesis
- One change at a time, no shotgun approaches
- Document what you're changing and why

### 3. **Validation**
- Test the exact expected result
- Either ✅ HYPOTHESIS CONFIRMED or ❌ HYPOTHESIS FAILED
- If failed, move to next hypothesis with lessons learned

### 4. **Documentation**
- Commit messages should reference the hypothesis
- Include what was learned even from failed attempts
- Update team knowledge base with root cause

## Example Application

### **Scenario**: Vercel deployment showing 404 errors for auth pages

**HYPOTHESIS 1**: Complex vercel.json configuration causing conflicts
- **Solution**: Remove conflicting properties (builds + functions)
- **Result**: ❌ Still 404, but build succeeded
- **Learning**: Configuration was issue, but not the root cause

**HYPOTHESIS 2**: Wildcard patterns in .vercelignore interfering  
- **Solution**: Remove all wildcards, use only folder exclusions
- **Result**: ❌ Still excluding auth files
- **Learning**: Not a pattern complexity issue

**HYPOTHESIS 3**: .vercelignore itself is fundamentally broken
- **Solution**: Remove .vercelignore entirely
- **Result**: ✅ SUCCESS - All routes built, OAuth working
- **Learning**: Sometimes deletion > fixing

## Best Practices

### **Do:**
- ✅ State hypothesis clearly before making changes
- ✅ Make one change at a time
- ✅ Have specific success criteria
- ✅ Document failed attempts (they prevent repeat work)
- ✅ Follow THINK, PLAN, VALIDATE, ACT, TEST methodology
- ✅ Commit with hypothesis reference for traceability

### **Don't:**
- ❌ Make multiple changes simultaneously
- ❌ Skip documenting failed hypotheses  
- ❌ Continue without clear success criteria
- ❌ Abandon systematic approach when frustrated
- ❌ Assume the first hypothesis is correct

## When to Use This Approach

**Ideal for:**
- Deployment/configuration issues with multiple potential causes
- Integration problems between systems
- Performance issues with unclear bottlenecks
- Authentication/security problems
- Complex build failures

**Less needed for:**
- Simple syntax errors (obvious from error messages)
- Well-documented issues with known solutions
- Single-component failures with clear stack traces

## Success Metrics

A good hypothesis-driven debugging session should:
- **Converge** on root cause within 3-5 hypotheses
- **Document** learnings for future team members
- **Prevent** similar issues through captured knowledge
- **Build** team confidence in systematic problem-solving

## Integration with Development Workflow

- **Planning**: Include hypothesis formation in debugging time estimates
- **Code Reviews**: Require hypothesis documentation for complex fixes
- **Retrospectives**: Analyze which hypotheses were most effective
- **Knowledge Base**: Update team practices with successful patterns

---

**Status**: Active practice, proven effective  
**Next Review**: After next major debugging session