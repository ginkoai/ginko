# Charter Conversation Example: Hack & Ship Mode

> **IMPORTANT: Use Your Native Voice**
>
> This example shows natural conversation FLOW and PRINCIPLES, not exact words to copy.
> - These are illustrative patterns, not scripts
> - Adapt questions naturally using your own voice
> - Humans detect canned questions easily
> - Trust yourself to find natural phrasing
> - Focus on the PATTERNS shown: building on responses, when to probe, how to adapt depth

**Scenario**: Solo developer building a quick CLI tool for personal use
**Duration**: ~5 minutes
**Exchanges**: 7
**Work Mode**: Hack & Ship (detected from brief responses and speed signals)
**Final Confidence**: 62% - Workable, can refine as we build

---

## Conversation

### Exchange 1: Opening

**AI**: 💡 What would you like to build today?

**User**: Quick CLI tool for managing environment variables across my projects

**Analysis**:
- **Signal Detection**: "quick" → Hack & Ship signal
- **Aspect**: Purpose (initial context)
- **Confidence**: Purpose 20% (too brief)

---

### Exchange 2: Problem Exploration

**AI**: Nice! What's frustrating about current solutions?

**User**: They're way too complex. I just need something simple for local dev, not enterprise-grade secret management.

**Analysis**:
- **Signal Detection**: "simple", "just need" → Hack & Ship confirmation
- **Aspect**: Purpose (problem clarity)
- **Confidence**: Purpose 45% (problem clear, value implied)
- **User Voice**: "way too complex", "just need something simple" - preserve this

---

### Exchange 3: User Identification

**AI**: Got it - keep it simple. Who's this primarily for, just you or your team too?

**User**: Just me initially. Might share with my team if it works, but starting solo.

**Analysis**:
- **Signal Detection**: "just me", "if it works" → Experimental, MVP mindset
- **Aspect**: Users
- **Confidence**: Users 55% (clear primary user, conditional secondary)
- **Note**: Conditional team usage - mark as TBD in charter

---

### Exchange 4: Success Criteria

**AI**: Perfect. What would make this a success for you?

**User**: If I can manage envs across all my projects in under 30 seconds. That's the bar - faster than manually editing .env files.

**Analysis**:
- **Signal Detection**: Specific metric ("under 30 seconds") + comparison to current state
- **Aspect**: Success
- **Confidence**: Success 70% (concrete, measurable)
- **User Voice**: "under 30 seconds", "that's the bar" - strong quote

---

### Exchange 5: Scope Boundaries

**AI**: Love the specificity. What's explicitly out of scope?

**User**: No cloud sync, no GUI, no team features yet. Keep it terminal-only. Just the basics.

**Analysis**:
- **Signal Detection**: Multiple "no X" statements + "just the basics" → Clear boundaries
- **Aspect**: Scope (out-of-scope)
- **Confidence**: Scope 65% (out-of-scope very clear, in-scope needs detail)

---

### Exchange 6: MVP Features (Gentle Probe for In-Scope)

**AI**: Makes sense. What are the "basics" you're thinking for the first version?

**User**: Add variables, list them, delete them. That's literally it. Three commands.

**Analysis**:
- **Signal Detection**: "literally it", "three commands" → Ruthlessly minimal scope
- **Aspect**: Scope (in-scope)
- **Confidence**: Scope 75% (both in and out very clear)
- **User Voice**: "That's literally it. Three commands." - powerful quote

---

### Exchange 7: Quick Win Check

**AI**: Beautiful - love the focus. Any must-have technical requirements?

**User**: Should work offline obviously, and respect my privacy - everything local.

**Analysis**:
- **Signal Detection**: "obviously", "everything local" → Core values clear
- **Aspect**: Context/Constraints
- **Confidence**: Overall 62% (purpose, scope, success clear; users and constraints minimal)
- **Decision**: Good enough for Hack & Ship mode - synthesize charter

---

## Confidence Scores (Final)

```json
{
  "purpose": {
    "score": 65,
    "signals": ["Problem: Current tools too complex", "Value: Simple local dev", "Motivation: Personal productivity"],
    "missing": [],
    "needsProbing": false
  },
  "users": {
    "score": 55,
    "signals": ["Primary: Solo developer (self)", "Secondary: Team (conditional)"],
    "missing": ["User needs not deeply explored (acceptable for Hack & Ship)"],
    "needsProbing": false
  },
  "success": {
    "score": 70,
    "signals": ["Manage envs in < 30 seconds", "Faster than manual editing"],
    "missing": [],
    "needsProbing": false
  },
  "scope": {
    "score": 75,
    "signals": ["In-scope: Add, list, delete", "Out-of-scope: Cloud sync, GUI, team features", "Boundary: Terminal-only"],
    "missing": [],
    "needsProbing": false
  },
  "overall": 62,
  "workMode": "hack-ship",
  "qualityLevel": "workable"
}
```

---

## Synthesized Charter

```markdown
# Project Charter: QuickEnv CLI

**Status**: Draft
**Work Mode**: Hack & Ship
**Created**: 2025-11-10
**Last Updated**: 2025-11-10
**Version**: 0.5
**Confidence**: 62% - Workable, can refine as we build

---

## Purpose & Value

Current environment variable management tools are "way too complex" for simple local development needs. This CLI provides a lightweight alternative focused on speed and simplicity.

**Problem Statement**: Existing tools have enterprise features that add friction for solo developers who just need basic env management.

**Business Value**: Faster than manually editing .env files (target: < 30 seconds for any operation).

---

## Users

**Primary User**: Solo developer (self)

**Secondary Users**: [Maybe Later: Team sharing if initial version succeeds]

---

## Success Criteria

How we'll know this is working:

- [ ] Manage environment variables across projects in under 30 seconds
- [ ] Faster than manual .env file editing (current process)
- [ ] Three core commands working: add, list, delete

**Timeframe**: [TBD - Quick iterations, ship when usable]

---

## Scope & Boundaries

### In Scope
- Add variables (create/update)
- List variables (view current env)
- Delete variables (remove)
- Terminal-only interface
- Local storage (no cloud)

### Out of Scope
- No cloud sync
- No GUI
- No team collaboration features (maybe later)
- No enterprise secret management
- No integrations (keep it simple)

### TBD
- [TBD - Data storage format/location]
- [TBD - Team sharing mechanism if needed later]

---

## Context & Constraints

**Technical Constraints**:
- Must work offline
- Privacy-respecting (everything local)
- Terminal/CLI interface only

**Timeline**: [TBD - Ship when useful, minimal viable first]

**Team**: Solo developer project

---

## Changelog

### v0.5 - 2025-11-10 - Initial Creation
- Created from brief conversation during ideation
- Confidence: 62%
- Participants: [User], Claude
- **Work Mode**: Hack & Ship - Minimal, fast-moving
- **Well-defined**: Core commands (add/list/delete), scope boundaries
- **TBD**: Storage format, timeline, team features if needed
- **Philosophy**: Ship fast, iterate based on usage

---

*This is a draft charter for a quick prototype. Refinement will happen through building and using it.*
```

---

## Key Observations

### What Worked Well

1. **Detected Work Mode Quickly**: "Quick", "simple", "just need" signals in first 2 exchanges
2. **Adapted Question Depth**: Didn't ask about risks, governance, or detailed planning
3. **Preserved User Voice**: "way too complex", "that's literally it", "that's the bar"
4. **Minimal Probing**: Only 1 gentle probe (Exchange 6) to clarify in-scope features
5. **Accepted Brevity**: Didn't force detail where user gave minimal answers
6. **Fast Conclusion**: 7 exchanges, ~5 minutes - appropriate for mode

### TBD Items Marked Appropriately

- Storage format (technical detail user didn't specify)
- Timeline (user focused on features, not dates)
- Team features (conditional/deferred)

### Charter Characteristics for Hack & Ship

- **Brief sections**: No deep context or constraints
- **Version 0.5**: Signals draft/experimental state
- **TBD acceptable**: Several gaps, explicitly marked
- **Action-focused**: Clear what to build, less why/how
- **Iteration-ready**: Can evolve as user learns

---

## Conversation Quality Score

| Aspect | Score | Notes |
|--------|-------|-------|
| **Felt Natural** | 9/10 | Quick, energetic pace matching user's style |
| **Active Listening** | 8/10 | Built on responses, referenced earlier points |
| **Depth Appropriate** | 10/10 | Perfectly matched Hack & Ship needs |
| **Gentle Nudging** | 9/10 | Only 1 probe, didn't over-ask |
| **User Agency** | 10/10 | User drove pace, AI followed |
| **Work Mode Detection** | 10/10 | Detected within 2 exchanges |
| **Voice Preservation** | 9/10 | Key phrases preserved verbatim |

**Overall**: Excellent example of Hack & Ship conversation - fast, focused, action-oriented.

---

*This example demonstrates minimal charter creation for rapid prototyping scenarios.*
