# Reddit Engagement Playbook

## Overview

This playbook defines our strategy for authentic Reddit participation. The goal is to build genuine presence in developer communities while naturally introducing ginko to developers who would benefit from it.

**Philosophy:** Value first, product second. Build credibility through genuine participation before any product mentions.

**Timeline:** 2-4 weeks of pure participation before introducing ginko

---

## Target Subreddits

### Primary (High Priority)

| Subreddit | Size | Fit | Post Days | Best Content |
|-----------|------|-----|-----------|--------------|
| r/ExperiencedDevs | 200k+ | Excellent | Tues-Thurs | Career insights, tooling discussions, workflow optimization |
| r/programming | 5M+ | Good | Weekdays | Technical content, tools, interesting projects |
| r/ChatGPTCoding | 50k+ | Excellent | Any | AI workflow tips, productivity with AI tools |

### Secondary

| Subreddit | Size | Fit | Post Days | Best Content |
|-----------|------|-----|-----------|--------------|
| r/commandline | 200k+ | Good | Any | CLI tools, terminal workflows |
| r/git | 50k+ | Medium | Any | Git workflows, version control |
| r/ClaudeAI | 100k+ | Excellent | Any | Claude-specific tips and tools |
| r/webdev | 1M+ | Medium | Weekdays | Developer tools, productivity |
| r/devtools | 20k+ | Good | Any | Tool announcements, discoveries |

### Niche (Lower Priority)

| Subreddit | Size | Fit | Post Days | Best Content |
|-----------|------|-----|-----------|--------------|
| r/productivity | 1M+ | Low-Medium | Any | Workflow optimization |
| r/startups | 1M+ | Medium | Any | AI-first team velocity |
| r/SideProject | 200k+ | Medium | Weekends | Project showcases |

---

## Engagement Rules

### DO

- Participate genuinely for 2-4 weeks before mentioning ginko
- Share insights from experience as authentic contributions
- Help solve problems first, mention tools naturally if relevant
- Be transparent about affiliation when asked
- Engage with replies thoughtfully
- Add value to existing discussions
- Ask genuine questions to learn from the community
- Upvote and engage with others' good content

### DON'T

- Post product announcements without community history
- Use marketing speak or superlatives
- Delete negative feedback
- Spam multiple subreddits simultaneously
- Create accounts just for promotion
- Reply to every AI/context thread with ginko mentions
- Be defensive about criticism
- Ignore subreddit rules

---

## Subreddit Rules Summary

### r/ExperiencedDevs
- No job postings, resume reviews, or career questions that belong in r/cscareerquestions
- Focus on experienced developer topics (5+ years)
- Self-promotion allowed if you're an active community member
- **Key insight:** This community values depth and experience. Shallow takes get called out.

### r/programming
- No memes, rage comics, or low-effort content
- Showoff Saturday for project showcases
- Must be directly programming-related
- **Key insight:** Technical depth appreciated. "Look what I built" needs substance.

### r/ChatGPTCoding
- AI coding discussion encouraged
- Tool shares welcome if framed as useful
- Less strict than r/programming
- **Key insight:** Community actively looking for productivity tips.

### r/commandline
- CLI tools and terminal discussion
- Showcase posts welcome
- Practical over philosophical
- **Key insight:** Appreciate elegant, Unix-philosophy tools.

---

## Engagement Phases

### Phase 1: Pure Participation (Weeks 1-2)

**Goal:** Build karma and credibility through genuine engagement

**Activities:**
- Comment on 10+ threads about git, AI coding, developer tools
- Share insights WITHOUT mentioning ginko
- Ask genuine questions about workflows
- Upvote good content
- Build comment karma (aim for 100+ in target subreddits)

**Topics to engage with:**
- "How do you handle context switching?"
- "Best AI coding assistant workflows"
- "Managing knowledge in development teams"
- "Git workflow optimization"
- "CLI tool recommendations"

**Example comments:**

```
Thread: "How do you stay in flow when context switching frequently?"

Comment: "I've started logging decisions and gotchas as I work -
one line captures like 'Used X because Y didn't work for Z reason.'

Sounds like overhead but it's actually faster than trying to remember
why I did something when I come back to it.

The key is making capture frictionless - if it takes more than 5
seconds, you won't do it."
```

```
Thread: "AI assistants forgetting previous sessions is killing my productivity"

Comment: "This is the 'context rot' problem. Every new session starts
from zero and you spend 20 minutes getting the AI back up to speed.

I've been experimenting with logging context to git as I work -
decisions, gotchas, patterns. Next session, I load that context
automatically instead of re-explaining everything.

It's not perfect but it's way better than copy-pasting walls of
text every time."
```

### Phase 2: Soft Introduction (Weeks 3-4)

**Goal:** Naturally mention ginko in relevant contexts

**Activities:**
- Share blog post insights as authentic contributions (link to blog, not product)
- Respond to pain points with "We've been working on a tool for this..."
- Link to blog posts, not landing page
- No hard sell, just helpful sharing

**Approach:**
- Wait for relevant threads (don't force it)
- Lead with the insight, trail with the tool
- Use "I've been working on..." not "Check out our product"
- Be ready to discuss honestly, including limitations

**Example comments:**

```
Thread: "My AI keeps forgetting everything between sessions"

Comment: "This is exactly why I've been obsessing over context
management for the past year.

The root issue is that AI sessions are stateless - no persistence
layer between conversations. You can try copy-pasting context, but
that doesn't scale and you have to manually curate what's relevant.

I've been building a tool called ginko that captures context to git
as you work, then loads it automatically at session start. It's
still early but it's solving this for me.

Here's a blog post explaining the approach: [link]

Happy to chat about it if you're interested in trying something
similar."
```

```
Thread: "How do engineering managers track AI-assisted work?"

Comment: "This is a real problem - AI work is largely invisible to
traditional tracking.

We've been thinking about this as a 'work observability' problem.
The key insight: if developers log decisions and context as they
work (not after), you get visibility without extra overhead.

Wrote up our approach here: [blog link]

Short version: capture happens inline, not as a separate step.
That's the only way it actually gets done."
```

### Phase 3: Strategic Posts (Weeks 4+)

**Goal:** Share ginko directly in appropriate contexts

**Activities:**
- r/programming Saturday Showcase (if quality threshold met)
- r/ChatGPTCoding tool share
- r/commandline CLI showcase
- AMA if community shows interest

**Requirements before strategic posts:**
- 200+ karma in target subreddits
- 30+ genuine comments over 4+ weeks
- At least 5 helpful contributions that got upvoted
- No negative community feedback

---

## Post Templates

### Type 1: Pain Point Discussion

**Use in:** r/ExperiencedDevs, r/programming, r/ChatGPTCoding

```
Title: How do you handle AI context loss between sessions?

Body:
I've been using AI coding assistants heavily for the past year
and the biggest friction point is context loss. Every new session
starts from scratch - I spend 15-20 minutes just getting the AI
back up to speed on the codebase.

Things I've tried:
- Copy-pasting context (tedious, doesn't scale)
- Custom instructions (static, can't capture evolving decisions)
- Long-running conversations (hit context limits)

What's working for you? Anyone solved this in a sustainable way?
```

**Strategy:** Genuine question, validates the problem, invites discussion. Can follow up with ginko mention if someone asks what we're doing about it.

### Type 2: Insight Share (Blog-sourced)

**Use in:** r/ExperiencedDevs, r/programming

```
Title: Why our 6-week estimate took 3 days (Human+AI velocity)

Body:
We just shipped a major feature - full team collaboration with
invites, permissions, billing. Traditional scrum estimate: 6-7 weeks.

Actual: 3 days.

This isn't hustle culture or cutting corners. It's what happens
when you eliminate coordination overhead.

Traditional team week:
- Actual coding: 40-50%
- Meetings: 20-30%
- Code review: 10-15%
- Context switching: 10-15%

Human+AI collaboration:
- Active development: 75-100%
- Planning: 6-12%
- Testing: 6-12%

The overhead largely disappears because:
1. AI has instant codebase access (no sync needed)
2. Decisions happen inline (no scheduling)
3. Context persists (no ramp-up)
4. Quality is inline (no review cycles)

Full breakdown: [blog link]

Curious if others are seeing similar velocity with AI? What
acceleration factors are you observing?
```

**Strategy:** Lead with interesting data, genuine discussion prompt, blog link for depth.

### Type 3: Saturday Showcase (r/programming)

**Use in:** r/programming on Saturday

```
Title: [Show r/programming] Ginko - Git-native context for AI coding

Body:
Hey r/programming,

I've been working on a CLI tool called ginko that solves the
"AI amnesia" problem - where every new AI coding session starts
from scratch.

**The problem:** You spend 15-20 minutes per session re-explaining
your codebase, architecture, and previous decisions to your AI
assistant.

**The approach:** Capture context to git as you work. Log decisions,
patterns, and gotchas inline. Load context automatically at session
start.

**What it looks like:**
```bash
# Start session - context loads in <30 seconds
$ ginko start

Ready | Hot (10/10) | Think & Build mode
Last session: Completed auth refactor
Next up: TASK-4 - Add rate limiting (continue)
Sprint: API Hardening 65%
```

It's git-native (works offline, no cloud required), and the context
lives in your repo alongside your code.

GitHub: [link]
Docs: [link]
Blog (technical details): [link]

Happy to answer questions. Would love feedback from the community.
```

**Strategy:** Clear value prop, technical depth, open to feedback.

### Type 4: AMA Style

**Use in:** r/ChatGPTCoding, r/ClaudeAI (if community receptive)

```
Title: We built a git-native context manager for AI coding - AMA

Body:
Hey everyone,

I'm Chris, building ginko - a CLI for persistent context in AI
coding sessions.

The problem we're solving: AI assistants forget everything between
sessions. You spend 20 minutes per session re-explaining your
codebase.

Our approach: Capture decisions and patterns to git as you work.
Load context automatically. Sub-30-second session starts.

I'm happy to talk about:
- The technical approach (event-based context loading)
- What's working and what's not
- Our estimation framework for Human+AI velocity
- Lessons from building with AI daily

AMA!
```

**Strategy:** Personal, transparent, inviting genuine conversation.

---

## Comment Templates

### Responding to Context Loss Complaints

```
"This is exactly the problem I've been obsessing over. The issue is
that AI sessions are stateless - there's no persistence layer.

I've been experimenting with logging context to git as I work.
Decisions, patterns, gotchas. Next session, I load that automatically
instead of re-explaining.

Not a complete solution but dramatically reduces the 'context tax'
at session start."
```

### Responding to AI Productivity Questions

```
"The key I've found is reducing context-switching overhead. AI is
great at the coding part, but the time spent explaining context
every session adds up.

I started logging decisions inline - 5 seconds to capture 'chose X
because Y' - and it compounds fast. Week two, my AI already knows
the decisions from week one."
```

### Responding to Team Coordination Questions

```
"This is the hidden cost of AI productivity - individual devs are
faster but team coordination gets harder.

We've been experimenting with shared context - decisions and patterns
that persist across sessions AND across team members. When I log a
gotcha, my teammate's next session knows about it.

Early days but it's helping with the knowledge silo problem."
```

### Responding to Tool Recommendations

```
"If you're looking for something git-native (no cloud required),
I've been using ginko - captures context as you work, loads it at
session start.

Full disclosure: I'm one of the builders, so take with appropriate
salt. But it's open source and free to try. [link]"
```

---

## Tracking & Metrics

### Activity Log

Track all posts/comments in `docs/marketing/reddit-activity-log.csv`:

```csv
date,subreddit,type,url,upvotes,comments,sentiment,notes
2026-01-15,r/ExperiencedDevs,comment,https://...,12,3,positive,Context loss thread
2026-01-16,r/ChatGPTCoding,comment,https://...,8,1,neutral,AI productivity question
```

### Weekly Metrics

- Total comments posted
- Net karma change
- Thread engagement (replies to our comments)
- Click-throughs (via UTM-tagged links)
- Sentiment (positive/neutral/negative)

### Success Criteria

| Metric | Target |
|--------|--------|
| Active on subreddits | 2+ |
| Authentic comments | 20+ |
| Negative backlash | 0 |
| Successful post (>100 upvotes or >10 comments) | 1+ |
| Traffic from Reddit in GA4 | Visible |

---

## Risk Mitigation

### If Accused of Shilling

**Response:**
```
"Fair point - I should be more transparent. I'm one of the builders
of ginko, so I'm obviously biased. I try to only mention it when
genuinely relevant, but I can see how it might come across as promotion.

Happy to answer questions about the problem space even if ginko
isn't the right solution for you. What workflow are you currently using?"
```

### If Post Gets Downvoted

- Don't delete (looks worse)
- Don't argue with criticism
- Acknowledge feedback gracefully
- Learn from what didn't land
- Wait longer before next similar post

### If Asked About Limitations

Be honest:
```
"Definitely has limitations. It works best for Claude Code workflows
right now - other AI tools are on the roadmap but not there yet.
Also requires some discipline to actually log context as you work.

Not trying to oversell it - works well for some workflows,
not for others."
```

---

## UTM Tracking

Every Reddit link must include UTM parameters:

```
?utm_source=reddit&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=r-{subreddit}-{post-type}
```

**Examples:**
- `?utm_source=reddit&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=r-experienceddevs-context-loss`
- `?utm_source=reddit&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=r-programming-showcase`

---

## Quick Reference Card

**Before posting, check:**
- [ ] 2+ weeks of genuine participation first?
- [ ] 100+ karma in target subreddit?
- [ ] Post adds genuine value (not just promotion)?
- [ ] UTM tracking on all links?
- [ ] Following subreddit rules?
- [ ] Prepared to engage with replies?

**Red flags to avoid:**
- Multiple subreddits same day
- Same message copy-pasted
- Defensive responses to criticism
- Deleting downvoted content
- Ignoring community feedback

---

*Last updated: 2026-01-12*
*Sprint: EPIC-010 Sprint 3*
