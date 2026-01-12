# YouTube Content Plan

## Overview

This document defines our YouTube strategy for tutorial videos, technical deep-dives, and shorts. YouTube serves as the visual demonstration layer of our content strategy, turning blog posts into engaging video content.

**Channel Name:** Ginko
**Tagline:** Git-native context for AI-assisted development
**Goal:** Educate developers on AI context management while demonstrating ginko workflows

---

## Channel Setup

### Branding

| Element | Specification |
|---------|---------------|
| Channel name | Ginko |
| Handle | @ginkoai |
| Banner | 2560x1440, brand colors, tagline |
| Profile picture | Ginko logo (800x800) |
| Watermark | Ginko logo, bottom right |

### Channel Description

```
Ginko helps developers and teams work smarter with AI coding assistants.

We solve the "AI amnesia" problem—where every new session starts from scratch.
Ginko captures context to git as you work, then loads it automatically at session start.

On this channel:
→ Tutorials for getting started with ginko
→ Deep-dives into AI-assisted development workflows
→ Tips for team collaboration with AI tools
→ Shorts with quick productivity wins

Install: npm install -g @ginkoai/cli
Docs: docs.ginkoai.com
GitHub: github.com/ginkoai/ginko

Subscribe for weekly tips on AI-powered development!
```

### Channel Links

- Website: ginkoai.com
- GitHub: github.com/ginkoai/ginko
- Docs: docs.ginkoai.com
- X.com: @ginkoai
- Discord: discord.gg/ginko

---

## Content Types

### 1. Tutorial Videos (5-10 min)

**Purpose:** Step-by-step guides for using ginko
**Frequency:** 1-2 per month
**Production:** Screen recording + voiceover

**Topics:**
| Video | Duration | Priority |
|-------|----------|----------|
| Getting Started with Ginko CLI | 8 min | HIGH |
| Session Logging Best Practices | 6 min | HIGH |
| Team Collaboration with Ginko | 10 min | MEDIUM |
| Advanced Context Management | 8 min | MEDIUM |
| Integrating Ginko with Your Workflow | 7 min | MEDIUM |

### 2. Technical Deep-Dives (8-15 min)

**Purpose:** Explain concepts and architecture
**Frequency:** 1 per month
**Production:** Screen recording + diagrams + voiceover

**Topics:**
| Video | Duration | Priority |
|-------|----------|----------|
| How Ginko Achieves Sub-2s Session Starts | 12 min | HIGH |
| Event-Based Context Loading Explained | 10 min | MEDIUM |
| The Architecture of Git-Native Context | 15 min | LOW |

### 3. Shorts (60-90 sec)

**Purpose:** Quick tips, hooks to longer content
**Frequency:** 2-4 per week
**Production:** Vertical (9:16), fast cuts, text overlays

**Topics:**
| Short | Duration | Source |
|-------|----------|--------|
| "Your AI has amnesia. Here's the fix." | 60s | Post 1 |
| "30 seconds to flow state" | 45s | Post 2 |
| "6 weeks → 3 days. Here's how." | 90s | Post 6 |
| "Stop re-explaining your codebase" | 60s | General |
| "The one command that changed everything" | 45s | ginko start |
| "AI productivity tip in 60 seconds" | 60s | Tips |

---

## Video Scripts

### Video 1: Getting Started with Ginko CLI (8 min)

**Target:** New users who want to try ginko
**Goal:** Install → Init → First session → First log

#### Script Outline

```
[0:00-0:30] HOOK
"Tired of re-explaining your codebase every time you start an AI session?
In the next 8 minutes, I'll show you how to fix that permanently.
Let's get started."

[0:30-1:30] THE PROBLEM
"Here's what happens to most developers using AI coding assistants.
[Show: Typical workflow of pasting context, explaining project]
You start a session, paste a bunch of context, explain your architecture,
get productive... then close the session.

Tomorrow? Start from scratch. All that context is gone.

This is context rot, and it's costing developers hours every week."

[1:30-2:30] THE SOLUTION
"Ginko solves this by capturing context to git as you work.
Decisions, patterns, gotchas—stored in your repo.
Next session, context loads automatically.

Let me show you how it works."

[2:30-4:00] INSTALLATION
"First, let's install ginko.
[Terminal]
npm install -g @ginkoai/cli

Now initialize in your project:
[Terminal]
cd your-project
ginko init

This creates a .ginko folder that stores your session context.
It's git-native—everything lives in your repo."

[4:00-5:30] FIRST SESSION
"Now let's start a session:
[Terminal]
ginko start

[Show output]
You see:
- Flow state indicator
- Last session summary (empty for now)
- Sprint context (if you have one)
- Git branch status

This is your session dashboard. Under 30 seconds to load."

[5:30-7:00] LOGGING CONTEXT
"Now here's where the magic happens.

As you work, you capture context:
[Terminal]
ginko log 'Chose JWT for auth because we need stateless sessions for mobile clients'

[Show output]
That's it. One command. 5 seconds.

Tomorrow when you run ginko start, your AI will already know this decision.

Let's do another:
[Terminal]
ginko log 'Timer callbacks need .unref() or Node process hangs - gotcha from debugging session'

Now you've captured a gotcha. Next time you work in this area,
you'll be warned before you hit the same issue."

[7:00-7:45] NEXT STEPS
"There's a lot more ginko can do:
- Team context sharing
- Sprint integration
- Pattern documentation
- Session handoffs

Check the docs at docs.ginkoai.com for the full guide."

[7:45-8:00] CTA
"If you found this helpful, subscribe for more AI productivity tips.
Link to install is in the description.

Happy coding!"
```

### Video 2: Session Logging Best Practices (6 min)

#### Script Outline

```
[0:00-0:20] HOOK
"The difference between good and great AI sessions?
The quality of your context logging.
Here are 5 practices that will transform your workflow."

[0:20-1:00] PRACTICE 1: LOG AT THE MOMENT
"Log decisions as you make them, not after.
Why? Because context is freshest right now.

Bad: Spend 30 minutes at end of day trying to remember what you did.
Good: 5-second log right after each decision."

[1:00-2:00] PRACTICE 2: INCLUDE THE WHY
"Don't just log what—log why.

Bad: 'Used JWT for auth'
Good: 'Chose JWT over sessions for stateless auth—mobile clients need to work offline'

The why is what saves future you (and your AI) time."

[2:00-3:00] PRACTICE 3: CAPTURE GOTCHAS IMMEDIATELY
"When you hit a bug that takes an hour to debug?
Log it immediately.

[Terminal]
ginko log 'Timer without .unref() keeps Node alive. Spent 2 hours debugging. Solution: timer.unref()'

Future sessions will warn you before you hit this again."

[3:00-4:00] PRACTICE 4: LOG BEFORE COMMITS
"Every commit should have a corresponding log.

The commit message says what changed.
The log captures why and what you learned.

This becomes invaluable for code archaeology later."

[4:00-5:00] PRACTICE 5: WRITE FOR A FRESH AI
"Imagine an AI with zero context reading your log.

Would they understand?

Include:
- What you did
- Why you did it
- What you considered
- What worked or didn't"

[5:00-5:45] PUTTING IT TOGETHER
"Let me show you a real session with good logging.
[Demo: 3-4 quality log entries in context]

See how each entry gives the next session a head start?"

[5:45-6:00] CTA
"Master these 5 practices and your AI sessions will be dramatically more productive.

Subscribe for more tips. See you next time."
```

---

## Shorts Scripts

### Short 1: "Your AI Has Amnesia" (60s)

```
[0:00-0:05] HOOK (text overlay)
"Your AI has amnesia."

[0:05-0:15] PROBLEM
"Every new session starts from scratch.
You spend 20 minutes re-explaining your codebase."

[0:15-0:25] INSIGHT
"What if your AI remembered yesterday's decisions?"

[0:25-0:45] SOLUTION
[Terminal demo]
"Ginko captures context as you work.
[Show: ginko log command]
Next session, it loads automatically.
[Show: ginko start output]"

[0:45-0:55] RESULT
"30 seconds to productive. No paste. No re-explain."

[0:55-0:60] CTA
"Link in bio."
[Text: ginkoai.com]
```

### Short 2: "30 Seconds to Flow" (45s)

```
[0:00-0:05] HOOK
"30 seconds to flow state."

[0:05-0:15] PROBLEM
"Traditional session start:
- Open chat
- Paste context
- Explain project
- Finally code
20+ minutes."

[0:15-0:35] SOLUTION
[Terminal demo]
"With ginko:
$ ginko start
[Show: instant output with context]
Done. You're in flow."

[0:35-0:45] CTA
"Try it. Link in bio."
```

### Short 3: "6 Weeks → 3 Days" (90s)

```
[0:00-0:10] HOOK
"We estimated 6 weeks.
We shipped in 3 days."

[0:10-0:25] CONTEXT
"Not by working overtime.
By eliminating coordination overhead."

[0:25-0:45] THE MATH
"Traditional team:
40-50% actual coding
Rest is meetings, reviews, context-switching.

Human+AI:
75-100% actual coding.
Overhead approaches zero."

[0:45-0:70] WHY
"AI has instant codebase access.
Decisions happen inline.
Context persists.
No sync meetings needed."

[0:70-0:85] TAKEAWAY
"15x isn't magic.
It's what happens when you stop treating coordination as a constant."

[0:85-0:90] CTA
"Full breakdown linked below."
```

---

## Production Workflow

### Equipment & Software

| Category | Tool | Notes |
|----------|------|-------|
| Screen recording | OBS Studio | Free, high quality |
| Editing | DaVinci Resolve | Free tier sufficient |
| Thumbnails | Canva | Templates + brand kit |
| Voiceover | Built-in mic or Blue Yeti | Clean audio essential |
| Music | Epidemic Sound or YouTube Audio Library | Subtle background |

### Recording Checklist

- [ ] Clean terminal (no personal info visible)
- [ ] Increase font size for readability
- [ ] Close unnecessary applications
- [ ] Test audio levels
- [ ] Script outline visible off-screen
- [ ] Record in 1080p minimum

### Editing Checklist

- [ ] Trim dead air and mistakes
- [ ] Add text overlays for key points
- [ ] Add timestamps for longer videos
- [ ] Background music (low volume, 10-15%)
- [ ] End screen with subscribe CTA
- [ ] Add captions (YouTube auto-generate + review)

### Upload Checklist

- [ ] Title with primary keyword
- [ ] Description with timestamps, links, keywords
- [ ] Tags (10-15 relevant tags)
- [ ] Custom thumbnail
- [ ] Cards linking to related videos
- [ ] End screen with subscribe + related video
- [ ] Playlist assignment
- [ ] UTM-tagged links in description

---

## SEO Strategy

### Target Keywords

| Keyword | Search Volume | Competition |
|---------|---------------|-------------|
| AI coding assistant | High | High |
| Claude Code tutorial | Medium | Medium |
| AI pair programming | Medium | Medium |
| developer productivity tools | Medium | High |
| context management CLI | Low | Low |
| git workflow tools | Medium | Medium |

### Title Formulas

- "How to [Benefit] with [Tool/Method]"
- "[Number] [Topic] Tips for [Audience]"
- "[Tool] Tutorial: [Specific Outcome]"
- "Why [Common Approach] Doesn't Work (And What to Do Instead)"

### Description Template

```
[First 2-3 sentences with primary keyword - visible before "show more"]

In this video, you'll learn:
→ [Benefit 1]
→ [Benefit 2]
→ [Benefit 3]

TIMESTAMPS:
0:00 Introduction
0:30 [Section 1]
2:00 [Section 2]
...

LINKS:
→ Install Ginko: npm install -g @ginkoai/cli
→ Website: https://ginkoai.com?utm_source=youtube&utm_medium=video&utm_campaign=sprint3-content&utm_content={video-id}
→ Docs: https://docs.ginkoai.com
→ GitHub: https://github.com/ginkoai/ginko

RELATED VIDEOS:
→ [Link to related video 1]
→ [Link to related video 2]

#DevTools #AI #Coding #DeveloperProductivity
```

---

## Thumbnail Guidelines

### Design Principles

- **High contrast:** Stand out in search results
- **Large text:** Readable at small sizes
- **Face or terminal:** Human element or recognizable dev context
- **Brand colors:** Consistent visual identity
- **3-4 words max:** Key benefit or hook

### Templates

| Video Type | Thumbnail Style |
|------------|-----------------|
| Tutorial | Terminal screenshot + large title |
| Deep-dive | Diagram + question |
| Short | Bold text + icon/emoji |
| Tips | Number + topic |

### Example Thumbnails

**Getting Started Tutorial:**
- Background: Terminal with ginko output
- Text: "GINKO" (large) + "Getting Started" (smaller)
- Corner badge: "8 MIN TUTORIAL"

**30 Seconds to Flow Short:**
- Background: Split screen (cluttered vs clean terminal)
- Text: "30 SEC" (large) + "→ FLOW"
- Style: Before/after

---

## Publishing Schedule

### Video Cadence

| Content Type | Frequency | Best Days |
|--------------|-----------|-----------|
| Tutorial (long-form) | 1-2/month | Wednesday or Thursday |
| Deep-dive | 1/month | Thursday |
| Shorts | 2-4/week | Any (consistent time) |

### First Month Calendar

| Week | Monday | Wednesday | Friday |
|------|--------|-----------|--------|
| 1 | Short: AI Amnesia | Tutorial: Getting Started | Short: 30 Seconds |
| 2 | Short: 6 Weeks | - | Short: Stop Re-explaining |
| 3 | Short: Tip | Tutorial: Logging Best Practices | Short: One Command |
| 4 | Short: Tip | - | Short: Productivity |

---

## Metrics & Goals

### Key Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Views | Total video views | Growing month-over-month |
| Watch time | Total minutes watched | Primary ranking factor |
| CTR | Thumbnail click rate | >4% |
| Avg view duration | % of video watched | >50% |
| Subscribers | Channel subscribers | +50/month initial |

### First 90 Days Goals

| Metric | Month 1 | Month 2 | Month 3 |
|--------|---------|---------|---------|
| Videos published | 3-4 | 4-6 | 5-8 |
| Shorts published | 8-12 | 12-16 | 16-20 |
| Total views | 500 | 1,500 | 4,000 |
| Subscribers | 30 | 80 | 150 |
| Avg CTR | 3% | 4% | 5% |

---

## UTM Tracking

All description links must include UTM parameters:

```
?utm_source=youtube&utm_medium=video&utm_campaign=sprint3-content&utm_content={video-type}-{topic}
```

**Examples:**
- Tutorial video: `?utm_source=youtube&utm_medium=video&utm_campaign=sprint3-content&utm_content=tutorial-getting-started`
- Short: `?utm_source=youtube&utm_medium=video&utm_campaign=sprint3-content&utm_content=short-ai-amnesia`

---

## Quick Reference

### Before Publishing Checklist

- [ ] Title includes primary keyword
- [ ] Thumbnail is high contrast and readable
- [ ] Description has timestamps
- [ ] All links include UTM tracking
- [ ] Tags are relevant (10-15)
- [ ] End screen configured
- [ ] Cards added for related content
- [ ] Playlist assigned
- [ ] Captions reviewed

### Video Priorities

1. **Getting Started Tutorial** (highest priority)
2. **Shorts batch (3-4)** (high volume, low effort)
3. **Logging Best Practices** (second tutorial)
4. **Technical deep-dive** (when ready)

---

*Last updated: 2026-01-12*
*Sprint: EPIC-010 Sprint 3*
