# Ginko Marketing Playbook

*Your cheat sheet for talking about ginko. Copy, paste, ship.*

**Last updated:** 2026-02-08

---

## Quick Reference

### The One-Liner (5 seconds)

> **"Ginko gives your AI a memory."**

Use when: Tweets, bios, casual introductions

---

### The Elevator Pitch (30 seconds)

> AI coding assistants are incredible—until they forget everything. Every session starts from scratch. You waste 20 minutes re-explaining context, and hard-won insights vanish when the chat closes.
>
> Ginko fixes that. Three commands: `init`, `start`, `handoff`. Your context lives in git, works with any AI tool, and compounds over time.
>
> Back in flow in 30 seconds.

Use when: Conversations, LinkedIn posts, intro emails

---

### The Full Story (2 minutes)

> Every developer using AI has felt this frustration: you spend an hour building something complex with Claude or Cursor, you learn the quirks of your codebase, you make decisions, you discover gotchas—and then the session ends. Tomorrow? Your AI has amnesia.
>
> This isn't a bug. It's how these tools work. They're stateless by design. But that means YOUR context—the most valuable part of working with AI—evaporates every single time.
>
> Ginko solves this with a dead-simple approach: structured markdown in your git repo. When you run `ginko handoff`, it captures what you did, what you learned, and what's next. When you run `ginko start`, your AI reads that context automatically.
>
> No cloud. No vendor lock-in. Works with Claude, Cursor, Copilot—any AI that can read files. Your context is version-controlled, searchable, and shareable with your team.
>
> It's not magic. It's just quicker.

Use when: Blog posts, podcast appearances, demo intros

---

## Key Messages by Audience

### For Individual Developers

**Pain:** "I'm tired of re-explaining everything to my AI every session"

**Promise:** Back in flow in 30 seconds

**Proof point:** `ginko start` loads your context automatically

**CTA:** `npm install -g @ginkoai/cli`

---

### For Tech Leads / Managers

**Pain:** "I have no visibility into what my team is building with AI"

**Promise:** See what your team is shipping, not just what they're committing

**Proof point:** Dashboard shows active work across the team

**CTA:** Start a Pro trial at app.ginkoai.com

---

### For Teams

**Pain:** "Knowledge is trapped in individual AI sessions—when someone leaves, it's gone"

**Promise:** Context that stays with the codebase, not the person

**Proof point:** Git-native means knowledge syncs automatically

**CTA:** Contact sales for team setup

---

## Objection Responses

| They say... | You say... |
|-------------|------------|
| "I already use Cursor rules" | "Rules tell AI how to think. Ginko tells it what happened. They're complementary—use both." |
| "Sounds like more process" | "Three commands total. Most people get value in 5 minutes." |
| "Is my code sent to the cloud?" | "No. Everything stays local in `.ginko/`. We never see your code." |
| "Why not just write better READMEs?" | "You should! Ginko structures them for AI consumption and captures them automatically during work." |
| "I'll just paste context into the chat" | "That works until you forget something. Ginko captures it systematically so you don't have to think about it." |
| "Another dev tool subscription?" | "Free tier is fully functional. Pro is $9/mo if you want the dashboard." |

---

## Social Post Templates

### Twitter/X

**Announcement style:**
```
Your AI assistant has amnesia.

Every session starts from scratch:
- Re-explain your codebase
- Re-describe decisions you made
- Re-discover gotchas you already found

ginko fixes this.

npm install -g @ginkoai/cli

Back in flow in 30 seconds.
```

**Problem/solution style:**
```
The hardest part of AI-assisted coding isn't the AI.

It's the 20 minutes you spend every session re-establishing context.

"Remember, we're using TypeScript, the auth is in /lib/auth, and don't touch the legacy payment code..."

What if your AI just... remembered?

→ ginkoai.com
```

**Quick hit:**
```
Started using ginko for session handoffs.

Yesterday's context loads automatically today.

This is how AI coding should work.
```

---

### LinkedIn

**Story format:**
```
I used to spend 20 minutes every morning explaining my codebase to Claude.

"Here's the tech stack. Here are the patterns we use. Here's that weird bug we found last week. Don't touch the payment code."

Every. Single. Session.

Then I tried something different: structured session handoffs.

When I finish working, I run: ginko handoff "completed auth refactor, next: test coverage"

Next morning: ginko start

My AI reads the context file and picks up exactly where we left off.

No re-explaining. No lost insights. No context rot.

Just flow.

If you're doing AI-assisted development and feel like you're repeating yourself constantly, check out ginko. It's free, it's git-native, and it actually works.

#DeveloperProductivity #AIAssistant #CodingTools
```

---

### Reddit (r/programming, r/ExperiencedDevs, r/cursor)

**Title:** "How I stopped re-explaining my codebase to AI every session"

**Body:**
```
Anyone else frustrated by this?

I use Claude Code daily. Love it. But every single session I have to re-explain:
- Our tech stack
- Code patterns we use
- Decisions we've made
- Gotchas we've discovered

It takes 15-20 minutes before we're actually productive.

I started using session handoffs—basically structured markdown that captures context at the end of each session. Next session, AI reads the file and picks up where we left off.

There's a tool called ginko that automates this. Free CLI, works with any AI tool (Claude, Cursor, Copilot), stores everything in git.

Not affiliated, just a user who's tired of context rot.

`npm install -g @ginkoai/cli`

Happy to answer questions if anyone's curious.
```

---

## Channel Strategy

| Channel | Best for | Frequency | Content type |
|---------|----------|-----------|--------------|
| **X/Twitter** | Awareness, developer community | Daily | Quick tips, observations, launches |
| **LinkedIn** | Tech leads, decision makers | 2-3x/week | Stories, insights, professional takes |
| **Reddit** | Authentic engagement | Weekly | Helpful answers, soft promotion |
| **Blog** | SEO, thought leadership | 1-2x/week | Deep dives, tutorials, perspectives |
| **YouTube** | Demos, tutorials | 2x/month | Screencasts, walkthroughs |
| **Product Hunt** | Launch spike | One-time | Launch campaign |

---

## Quick Wins (Do This Week)

1. **Get 2-3 quotes from Ed's beta users** → Add to landing page
2. **Post "context rot" thread on X** → Use template above
3. **Share on r/cursor** → Cursor users feel this pain acutely
4. **Update LinkedIn headline** → Include ginko mention

---

## Glossary (So You Can Talk The Talk)

| Term | What it means | How to use it |
|------|---------------|---------------|
| **Context rot** | When AI loses accumulated knowledge between sessions | "Ginko solves context rot" |
| **Session handoff** | Capturing state at end of session for next session | "Run a quick handoff before you stop" |
| **Flow state** | Developer's productive mental zone | "Back in flow in 30 seconds" |
| **Git-native** | Stored in git, version controlled | "It's git-native, so it syncs automatically" |
| **AI-agnostic** | Works with any AI tool | "Works with Claude, Cursor, Copilot—whatever you use" |

---

## Voice & Tone Reminders

**Do:**
- Be direct and practical
- Show, don't tell (code examples > descriptions)
- Acknowledge the pain is real
- Understate rather than hype

**Don't:**
- Say "revolutionary" or "game-changing"
- Promise magic
- Be preachy about AI
- Use "we" when you mean "I"

**Tagline to remember:** *"Nothing special, just quicker."*

---

## File Locations

| Document | Location | Purpose |
|----------|----------|---------|
| This playbook | `docs/marketing/PLAYBOOK.md` | Your cheat sheet |
| Product context | `.claude/product-marketing-context.md` | Foundation document |
| Blog calendar | `docs/marketing/BLOG-CONTENT-CALENDAR.md` | Content schedule |
| LinkedIn strategy | `docs/marketing/LINKEDIN-STRATEGY.md` | LinkedIn specifics |
| Reddit playbook | `docs/marketing/REDDIT-PLAYBOOK.md` | Reddit specifics |
| X strategy | `docs/marketing/X-CONTENT-STRATEGY.md` | Twitter specifics |
| YouTube plan | `docs/marketing/YOUTUBE-CONTENT-PLAN.md` | Video content |

---

## Questions for Ed's Beta Users

Use these to gather quotes and feedback:

1. **Before ginko:** "How did you handle context between AI sessions before?"
2. **The moment:** "Was there a specific moment when ginko clicked for you?"
3. **Time saved:** "Roughly how much time do you save per session?"
4. **Favorite feature:** "What's the one thing you'd miss most if ginko disappeared?"
5. **In their words:** "How would you describe ginko to a developer friend?"
6. **Improvement:** "What's one thing that would make ginko better for you?"

---

*When in doubt, ask Claude (me). I'm your marketing department.*
