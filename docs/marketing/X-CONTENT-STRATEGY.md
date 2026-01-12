# X.com Content Strategy

## Overview

This document defines our X.com (Twitter) strategy using a two-account approach: founder accounts for authentic developer engagement and the company account for product content.

**Philosophy:** Helpful over promotional. Build in public. Engage genuinely with the AI developer community.

---

## Account Strategy

### Founder Accounts (Personal Brands)

**Voice:** Authentic, developer-to-developer, vulnerable, building in public

**Purpose:**
- Engage with developers expressing pain points ginko solves
- Share lessons learned from building with AI
- Build personal credibility in the space
- Human face for the product

**Content Mix:**
| Type | Frequency | Examples |
|------|-----------|----------|
| Building in public | 2-3/week | Lessons, challenges, wins |
| Technical insights | 1-2/week | Observations about AI development |
| Engagement replies | Daily | Reply to pain points in feed |
| Retweets with context | 2-3/week | Amplify relevant discussions |

**Posting Cadence:** 3-5 posts/week per founder

### @ginkoai Company Account

**Voice:** Helpful, educational, product-focused but not salesy

**Purpose:**
- Share blog content as threads
- Tips and tricks for AI development
- Feature announcements
- User showcases and testimonials
- Video demos

**Content Mix:**
| Type | Frequency | Examples |
|------|-----------|----------|
| Blog post threads | 1-2/week | Turn posts into 5-tweet threads |
| Tips and tricks | 2-3/week | Quick productivity insights |
| Feature spotlights | 1/week | Highlight specific capabilities |
| User showcases | 1/week | RT and comment on user wins |
| Video demos | 1/week | Short clips of workflows |

**Posting Cadence:** 5-7 posts/week

---

## Content Calendar Template

### Weekly Schedule

| Day | @ginkoai | Founders |
|-----|----------|----------|
| Monday | Tip/Trick | Building update |
| Tuesday | Blog thread | Engagement |
| Wednesday | Feature spotlight | Technical insight |
| Thursday | Video demo | Engagement |
| Friday | User showcase | Week reflection |
| Weekend | Light engagement | Personal (optional) |

---

## Thread Templates

### Template 1: Blog Post Thread (5 tweets)

**Structure:** Hook → Problem → Insight → How It Works → CTA

```
1/ [Hook - surprising statement or relatable problem]

[One sentence that makes them want to read more]

2/ [Problem deep-dive]

[2-3 sentences explaining why this matters]
[Specific numbers or examples if available]

3/ [Insight]

[The "aha" moment from the blog post]
[What most people get wrong / what's different]

4/ [How it works]

[Concrete example or brief explanation]
[Code snippet or visual if relevant]

5/ [CTA]

[Full breakdown with practical steps: link]

[Optional: question to encourage replies]
```

**Example (Post 6: 6-Week Estimate):**
```
1/ We estimated 6-7 weeks for a major feature.

We shipped it in 3 days.

This isn't hustle culture. It's what happens when you eliminate
coordination overhead. 🧵

2/ Where does development time actually go?

Traditional scrum team:
• Actual coding: 40-50%
• Meetings: 20-30%
• Code review: 10-15%
• Context switching: 10-15%

Only half the week is writing code.

3/ Human+AI collaboration changes the equation:

• Communication overhead → approaches 0
• Context switching → eliminated (AI remembers)
• Decision latency → seconds, not days
• Quality checks → inline, not gated

4/ This isn't doing scrum faster.

It's a different mode of work entirely.

When you eliminate 30-50% overhead and compress decision latency
from days to seconds, 15x becomes math, not magic.

5/ Full breakdown with estimation framework:
[link with UTM]

What velocity are you seeing with AI tools?
```

### Template 2: Tip/Trick (2-3 tweets)

**Structure:** Problem → Quick Solution → Benefit

```
1/ [Problem in one sentence]

[Quick tip that solves it]

2/ [Brief explanation or example]

[Why this works]

3/ (Optional) [Link to more detail or related content]
```

**Example:**
```
1/ Tired of re-explaining your codebase every AI session?

Log decisions as you work, not after.

One command: `ginko log "chose X because Y"`

2/ Takes 5 seconds. But tomorrow, your AI already knows
the decisions from today.

Context compounds. The key is making capture frictionless.

3/ Full workflow breakdown: [link]
```

### Template 3: Feature Spotlight (3-4 tweets)

**Structure:** What → Why → How → Try It

```
1/ [Feature name/what it does]

[One sentence value prop]

2/ [Why this matters]

[Problem it solves, who benefits]

3/ [How to use it]

[Quick example or command]

4/ [Try it]

[Link to docs/install]
```

### Template 4: User Showcase (Quote tweet or thread)

**Structure:** Celebrate → Context → Invitation

```
Quote tweet:
"Love seeing this workflow! [specific observation about what they did well]

This is exactly what we had in mind when building [relevant feature]."

Or thread:
1/ Awesome to see @username using ginko for [use case].

[What they accomplished]

2/ The key insight here: [why their approach works well]

3/ Want to try something similar? [link to getting started]
```

### Template 5: Building in Public (Founder accounts)

**Structure:** Honest Update → Lesson → Reflection

```
1/ Honest update from building ginko:

[What happened - good or bad]

2/ [What we learned / what we're changing]

[Vulnerable or insightful observation]

3/ (Optional) [Question to invite discussion]
```

**Example:**
```
1/ Honest update from building ginko:

Spent 3 hours debugging why our CLI hung after completing.

Root cause: setInterval without .unref() keeps the Node
event loop alive indefinitely.

2/ The fix was one line. But finding it took 3 hours of
console.logs and process inspection.

This is why we built the gotcha capture feature - so the
next person (or AI) doesn't repeat this.

3/ What's the dumbest bug that took you the longest to find?
```

---

## Engagement Strategy

### Searches to Monitor

Set up searches for:
- "AI context loss"
- "Claude Code"
- "AI pair programming"
- "AI coding assistant"
- "context window limit"
- "ChatGPT coding"
- "developer productivity AI"
- "AI forgetting"

### How to Engage

**On pain point tweets:**
```
Reply with empathy + insight, not product push:

"Felt this. The context tax on every new session adds up fast.

I've been experimenting with logging decisions to git as I work -
even 5-second captures compound. Next session knows what today learned."
```

**On relevant discussions:**
```
Add value, then offer resource:

"Great thread on this. One thing that helped us: separating
'stock' context (always relevant) from 'flow' context (current
task only).

Wrote up our approach here if useful: [link]"
```

**On competitor/adjacent tool posts:**
```
Be gracious, not competitive:

"Nice! Love seeing more tools in this space. Different approaches
work for different workflows.

We took a git-native approach with ginko - complementary rather
than competitive with [tool]."
```

### Relationship Building

Target accounts to engage with:
- Developer tool founders
- AI/ML practitioners
- DevRel folks at AI companies
- Developer productivity influencers
- Tech leads/engineering managers

**Approach:**
- Genuine engagement (not just likes)
- Reply with thoughtful comments
- Retweet with added context
- Build relationships before asking for anything

---

## Pre-Written Posts

### Tips & Tricks (Ready to Schedule)

**Tip 1: Context Logging**
```
Stop trying to remember what you decided yesterday.

Log it as you go: `ginko log "chose JWT over sessions for stateless auth"`

Takes 5 seconds. Saves 15 minutes tomorrow.
```

**Tip 2: Session Handoffs**
```
The secret to great session handoffs:

Write for a fresh AI with zero context.

Not: "Fixed the bug"
But: "Fixed auth redirect loop. Root cause: callback URL mismatch in OAuth config. Solution: validate redirect_uri against allowed origins."

Future you (and your AI) will thank you.
```

**Tip 3: Pattern Documentation**
```
Your AI keeps suggesting patterns that don't fit your codebase?

Make your patterns explicit and machine-readable.

Document: when to use, example code, confidence level.

Now your AI reinforces patterns instead of violating them.
```

**Tip 4: Flow State**
```
It takes 15-25 minutes to reach flow state after context switching.

Every new AI session = context switch.

What if session starts took 30 seconds instead of 20 minutes?

That's the difference between fighting your tools and flowing with them.
```

**Tip 5: Team Context**
```
Your teammate found a gotcha at 3pm.

You hit the same issue at 9am tomorrow.

Sound familiar?

Team context > individual context. Capture once, warn everyone.
```

### Building in Public (Founder posts)

**Post 1: Velocity Surprise**
```
Still processing this:

We estimated 6-7 weeks for team collaboration.
Shipped in 3 days.

Not by cutting corners. By eliminating coordination overhead.

Human+AI collaboration isn't doing scrum faster.
It's a different mode of working entirely.
```

**Post 2: Hard Lesson**
```
Learned this the hard way:

Individual AI productivity can mask team coordination losses.

A developer who's 30% faster but creates 50% more knowledge silos
might be net negative for the team.

Measure both sides.
```

**Post 3: Feature Discovery**
```
Shipping features nobody asked for but everyone needs:

Added automatic gotcha detection. When you hit an issue once,
it warns you (and your AI) before you hit it again.

Small feature. Massive time savings.
```

### Feature Spotlights

**Feature 1: Session Start**
```
30 seconds to flow state.

`ginko start` loads:
- Where you left off
- What's next
- Patterns to apply
- Gotchas to avoid

No context paste. No re-explaining. Just code.

ginkoai.com
```

**Feature 2: Event Logging**
```
Capture context as you work, not after.

`ginko log "description"` - 5 seconds
Benefits compound over days, weeks, months.

Your future AI sessions thank your past self.
```

**Feature 3: Team Context**
```
What if your AI knew what your teammate learned yesterday?

Team context makes it possible:
- Shared patterns
- Shared gotchas
- Shared decisions

One person's insight = everyone's advantage.
```

---

## Visual Content

### Video Types

| Type | Length | Content | Frequency |
|------|--------|---------|-----------|
| Demo clips | 30-60s | Single feature in action | 2/week |
| Tutorial snippets | 60-90s | Quick workflow tip | 1/week |
| Before/after | 45-60s | Pain point → solution | 1/week |

### Image Types

| Type | Use Case | Specs |
|------|----------|-------|
| Thread card | Blog post threads | 1200x675 |
| Tip graphic | Tip posts | 1080x1080 |
| Feature visual | Spotlight posts | 1200x675 |

---

## Metrics & Tracking

### Weekly Metrics

- Impressions per post
- Engagement rate (likes + replies + retweets / impressions)
- Click-through rate (link clicks / impressions)
- Follower growth
- Reply rate on engagement posts

### Goals

| Metric | Week 1-2 | Week 3-4 | Month 2+ |
|--------|----------|----------|----------|
| Posts published | 15+ | 20+ | 25+ |
| Avg engagement rate | >1% | >2% | >3% |
| Follower growth | +50 | +100 | +200/mo |
| Link clicks | 50+ | 100+ | 200+/mo |

### UTM Tracking

All links must include UTM parameters:

```
?utm_source=twitter&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content={content-type}-{topic}
```

**Examples:**
- Thread from blog post 6: `?utm_source=twitter&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=thread-6-week-estimate`
- Tip post: `?utm_source=twitter&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=tip-context-logging`

---

## Tools & Scheduling

### Recommended Tools

| Tool | Use Case | Notes |
|------|----------|-------|
| Typefully | Thread drafting + scheduling | Good for previewing threads |
| Buffer | Multi-platform scheduling | Free tier available |
| X.com native | Scheduling | Simple, no extra tools |
| TweetDeck | Monitoring + engagement | Good for searches |

### Workflow

1. Draft posts in batch (1 hour/week)
2. Schedule for optimal times
3. Monitor daily for engagement opportunities
4. Weekly review of performance

### Best Posting Times

| Day | Time (PT) | Reason |
|-----|-----------|--------|
| Tues-Thurs | 8-9am | Morning dev scroll |
| Tues-Thurs | 12-1pm | Lunch break |
| Tues-Thurs | 5-6pm | End of day |
| Weekend | 10am | Casual browsing |

---

## Quick Reference

### Before Posting Checklist

- [ ] Value-first content (not just promotion)?
- [ ] Clear hook in first line?
- [ ] UTM tracking on links?
- [ ] Appropriate hashtags (1-2 max)?
- [ ] Proofread?
- [ ] Ready to engage with replies?

### Hashtag Strategy

**Use sparingly (1-2 per post max):**
- #DevTools
- #AI
- #BuildInPublic
- #DeveloperProductivity

**Avoid:**
- Hashtag stuffing
- Trending hashtags that aren't relevant
- #startup #founder #hustle culture tags

---

*Last updated: 2026-01-12*
*Sprint: EPIC-010 Sprint 3*
