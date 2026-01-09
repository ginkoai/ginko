# Ginko Voice & Tone Guide

> How we talk to developers. Based on NN/G tone dimensions research.

## Voice Test

Before publishing any copy, ask: **"Would a senior dev say this to a colleague at 11 PM?"**

If it sounds like marketing, rewrite it.

---

## Tone Dimensions

Based on [NN/G's 4 Dimensions of Tone](https://www.nngroup.com/articles/tone-of-voice-dimensions/):

| Dimension | Our Position | What This Means |
|-----------|--------------|-----------------|
| **Funny ↔ Serious** | Serious with dry wit | "Context janitor" works. "Supercharge your workflow!" doesn't. |
| **Formal ↔ Casual** | Casual-professional | Peer explaining a solution, not corporate announcement. |
| **Respectful ↔ Irreverent** | Slightly irreverent | We can name problems bluntly (CONTEXT_ROT, SESSION_RESET). |
| **Enthusiastic ↔ Matter-of-fact** | Matter-of-fact | State what it does. Skip the hype. |

---

## Key Principles

### 1. Direct and Efficient
Respect developer time. Get to the point.

**Do:** "Resume any session in 30 seconds."
**Don't:** "Ginko is a revolutionary platform that enables developers to seamlessly resume their AI-assisted coding sessions with unprecedented speed and efficiency."

### 2. Slightly Technical
Use industry terms correctly. Don't oversimplify or over-jargon.

**Do:** "Graph-based context management"
**Don't:** "Smart memory system" (too vague) or "Neo4j-powered semantic triple store" (too much)

### 3. Problem-Focused
Lead with the pain, not the feature.

**Do:** "Stop re-explaining your codebase to AI."
**Don't:** "Robust context management system."

### 4. Peer-Level
Write like one developer explaining to another, not a company selling to users.

**Do:** "Your AI forgets everything between sessions. Ginko fixes that."
**Don't:** "We're excited to announce our innovative solution for context persistence!"

### 5. Authentic Over Polished
Founder-led, genuine communication beats corporate polish.

**Do:** Show the actual terminal output. Name real problems.
**Don't:** Stock photos. Vague promises. Buzzword bingo.

---

## Terminology

### Product Terms
| Use | Avoid |
|-----|-------|
| ginko (lowercase) | Ginko, GINKO |
| collaboration graph | knowledge base |
| graph-based context | git-native context (deprecated) |
| session | workspace, environment |
| context | memory, state |

### Technical Terms (Use Correctly)
- **Context rot** - AI effectiveness degrading as conversations grow
- **Session handoff** - Transferring context between sessions/collaborators
- **Collaboration graph** - The graph structure that stores project context

### Avoided Terms
| Avoid | Why |
|-------|-----|
| Revolutionary, game-changing | Hype words |
| Seamless, effortless | Overused, meaningless |
| Leverage, utilize | Corporate-speak |
| Best-in-class | Unsubstantiated claim |
| AI-powered (as primary descriptor) | Everything is AI-powered now |

---

## Tone by Context

### Marketing (Landing Page, Ads)
- Direct, benefit-focused
- Dry wit acceptable
- Problem-agitation works

### Documentation
- Strictly matter-of-fact
- No personality needed
- Accuracy > style

### Error Messages
- Direct and helpful
- No blame ("you did X wrong")
- Clear next step

### Outage/Incident Communication
- Drop all casualness
- Strictly professional
- Facts, timeline, resolution

---

## Examples

### Headlines

**Good:**
- "Stop re-explaining your codebase to AI."
- "Resume any AI session in 30 seconds."
- "AI forgets. Ginko doesn't."
- "Stop being your AI's context janitor."

**Bad:**
- "The Ultimate AI Collaboration Platform"
- "Supercharge Your Development Workflow"
- "Experience the Future of AI-Assisted Coding"

### CTAs

**Good:**
- "Install CLI"
- "Try it free"
- "View docs"

**Bad:**
- "Start Your Journey"
- "Unlock Your Potential"
- "Get Started Today!"

### Feature Descriptions

**Good:**
- "Context persists in the collaboration graph. Pick up any session where you left off."

**Bad:**
- "Our innovative context management system leverages cutting-edge technology to seamlessly preserve your workflow state."

---

## Show, Don't Tell

Developers trust demos over claims.

**Prioritize:**
1. Live terminal output
2. Code examples
3. Interactive sandboxes
4. Clear documentation

**Minimize:**
1. Abstract benefit claims
2. Testimonials without specifics
3. Comparison charts without data

---

## Quick Reference Card

```
VOICE CHECK:
[ ] Would a senior dev say this?
[ ] Is it direct? (Cut 50% of words)
[ ] Problem-focused, not feature-focused?
[ ] Technical terms used correctly?
[ ] No hype words?
[ ] Peer-level, not corporate?
```

---

*Last updated: 2026-01-09*
*Based on: NN/G Tone of Voice Dimensions*
