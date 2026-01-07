# SPRINT: EPIC-010 Sprint 3 - MVP Marketing Strategy - Content & Multi-Channel Funnel

## Sprint Overview

**Sprint Goal**: Create blog-first content strategies across all platforms, establishing authentic presence on Reddit, X.com, LinkedIn, and YouTube with the blog as the content engine

**Duration**: 2-3 weeks (2026-01-27 to 2026-02-17)
**Type**: Content & growth sprint
**Progress:** 0% (0/14 tasks complete)

**Success Criteria:**
- [ ] Blog content calendar published (4+ posts planned)
- [ ] 2+ blog posts published and cross-posted to all platforms
- [ ] Reddit engagement playbook documented and active on 2+ subreddits
- [ ] X.com accounts (founders + company) posting regularly (3+ posts/week)
- [ ] LinkedIn messaging established with 1+ post targeting SWE leaders
- [ ] YouTube channel setup with 1+ tutorial video live
- [ ] UTM tracking operational on all platform links
- [ ] Engagement >50 interactions/week across platforms

---

## Sprint Tasks

### TASK-1: Create blog content strategy and calendar (6h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Plan blog content that serves as foundation for all platform activity

**Implementation Notes:**
**Content Themes:**
1. **Technical Deep-Dives**
   - "How ginko achieves sub-2s session starts (Event-based context loading)"
   - "Building AI-native file discovery with frontmatter"
   - "Session logging: Defensive context capture at low pressure"

2. **Use Cases & Workflows**
   - "How to prevent AI context loss in long sessions"
   - "Team collaboration patterns with ginko"
   - "Integrating ginko with your existing git workflow"

3. **Team Leadership**
   - "Making AI collaboration observable for engineering leaders"
   - "Tracking team velocity in AI-assisted development"
   - "Reducing rework in AI pair programming"

4. **Best Practices**
   - "Context pressure mitigation strategies"
   - "Effective session handoffs between team members"
   - "Building cognitive scaffolding for AI partners"

**Content Calendar (Q1 2026):**
- Week 1: Technical deep-dive (event-based context)
- Week 2: Use case (preventing context loss)
- Week 3: Team leadership (observable collaboration)
- Week 4: Best practices (context pressure)

**Deliverable:**
- Content calendar in `docs/marketing/BLOG-CONTENT-CALENDAR.md`
- Blog post outlines for 4+ posts
- SEO keyword research per post
- Repurposing plan (blog → social → video)

**Files:**
- `docs/marketing/BLOG-CONTENT-CALENDAR.md`
- `docs/marketing/blog-outlines/*.md`

**Acceptance Criteria:**
- 4+ posts planned with outlines
- SEO keywords identified per post
- Cross-platform repurposing strategy documented
- Publishing schedule set

Apply: content-strategy-pattern

---

### TASK-2: Write and publish 2+ blog posts (16h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Create foundational blog content for MVP launch

**Implementation Notes:**
**Post 1: Technical Deep-Dive**
- Title: "Sub-2s Session Starts: How Ginko Achieves 47x Faster CLI Loading"
- Outline: Problem (slow startups) → Solution (event-based loading) → Implementation (ADR-043) → Results
- Length: 1500-2000 words
- Include: Code snippets, performance graphs, architecture diagrams
- SEO: "CLI performance", "fast session management", "git-native context"

**Post 2: Use Case**
- Title: "Never Lose AI Context Again: A Git-Native Approach to Session Management"
- Outline: Pain point (context loss) → Traditional solutions → Why ginko is different → How to use
- Length: 1200-1500 words
- Include: Screenshots, user testimonials, step-by-step guide
- SEO: "AI context management", "AI pair programming", "Claude Code context"

**Publishing Checklist:**
- [ ] SEO optimization (title, meta description, headings, alt text)
- [ ] Inline CTAs added
- [ ] End-of-post CTA included
- [ ] Social share images created (1200x630)
- [ ] Code examples tested
- [ ] Internal links to docs/GitHub
- [ ] UTM-tagged links for social promotion

**Files:**
- `blog/src/content/blog/post-001-fast-session-starts.md`
- `blog/src/content/blog/post-002-never-lose-context.md`
- `blog/public/images/blog/post-001/*` (images)

**Acceptance Criteria:**
- 2+ posts published and live
- SEO score >80 (Yoast/Rank Math)
- Read time 6-10 minutes
- All CTAs tracked in analytics

Follow: ADR-002 (cite technical details)
Apply: technical-writing-pattern

---

### TASK-3: Create Reddit engagement playbook (4h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Document strategy for authentic Reddit participation without marketing backlash

**Implementation Notes:**
**Playbook Sections:**
1. **Subreddit Mapping**
   - Primary: r/ExperiencedDevs, r/programming, r/ChatGPTCoding
   - Secondary: r/commandline, r/git, r/ClaudeAI, r/webdev
   - Niche: r/devtools, r/productivity

2. **Engagement Rules**
   - ✅ Participate genuinely for 2-4 weeks before mentioning ginko
   - ✅ Share insights from blog posts as authentic contributions
   - ✅ Help solve problems, mention "I've been working on a tool..." naturally
   - ❌ No pure product announcements
   - ❌ No marketing speak
   - ❌ Don't delete negative feedback

3. **Content Types**
   - Value-first posts: "How we reduced AI context switching by 65%"
   - Help threads: Answer questions about git/AI collaboration
   - AMAs: "We built a git-native CLI for AI context management - AMA"
   - Show HN style: "Show r/programming: Ginko - Git-native context for AI coding"

4. **Comment Templates**
   - Pain point response: "This is exactly the problem we were solving with [link]"
   - Technical answer: "You can achieve this with... (technical explanation). We automated this in ginko: [link]"
   - Genuine question: "What's your current workflow for...?" (lead to solution)

5. **UTM Tracking**
   - Every Reddit link: `?utm_source=reddit&utm_medium=organic-social&utm_campaign=mvp-launch&utm_content=r-[subreddit]-[post-id]`

**Deliverable:**
- Playbook document: `docs/marketing/REDDIT-PLAYBOOK.md`
- Subreddit calendar (which days to post where)
- Pre-approved post drafts (3+ variations)

**Acceptance Criteria:**
- Playbook covers all key scenarios
- 3+ post drafts ready
- Subreddit rules reviewed (no violations)
- Team aligned on approach

Apply: community-engagement-pattern
Avoid: 🚨 reddit-spam-gotcha (build genuine presence first)

---

### TASK-4: Execute Reddit engagement (8h over sprint)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Establish authentic presence on 2+ subreddits with value-first participation

**Implementation Notes:**
**Week 1-2: Genuine Participation**
- Comment on 10+ threads related to git, AI coding, developer tools
- Share insights without mentioning ginko
- Build credibility and comment karma

**Week 3: Soft Introduction**
- Share blog post 1 as technical insight (if valuable to community)
- Respond to relevant pain points with "We solved this with..." approach
- No hard sell, link to blog (not landing page)

**Week 4: Strategic Posts**
- Post in r/programming Saturday showcase (if quality threshold met)
- AMA thread in r/ChatGPTCoding (if community receptive)
- Technical deep-dive in r/commandline

**Tracking:**
- Log all posts/comments in spreadsheet
- Track upvotes, comments, click-throughs
- Monitor sentiment (positive/neutral/negative)

**Files:**
- `docs/marketing/reddit-activity-log.csv` (track engagement)

**Acceptance Criteria:**
- Active on 2+ subreddits
- 20+ authentic comments/posts
- No negative backlash
- 1+ successful post (>100 upvotes or >10 comments)
- Traffic from Reddit visible in GA4

Follow: Reddit playbook (TASK-3)

---

### TASK-5: Create X.com content strategy (4h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Define posting strategy for founder accounts and company account

**Implementation Notes:**
**Two-Account Strategy:**

**1. Founder Accounts (Personal Brands)**
- Voice: Authentic, developer-to-developer, vulnerable
- Content:
  - "Building in public" updates
  - Technical insights and learnings
  - Engage with devs expressing pain points ginko solves
  - Retweet/reply to relevant conversations
- Frequency: 3-5 posts/week per founder
- Example: "Spent 3 hours debugging why our AI kept losing context. Realized we needed git-native session state. Built ginko to solve it."

**2. @ginkoai Company Account**
- Voice: Helpful, educational, product-focused
- Content:
  - Blog post threads (turn posts into 3-5 tweet threads)
  - Tips and tricks
  - Feature announcements
  - User showcases (retweet user wins)
  - Video demos
- Frequency: 5-7 posts/week

**Content Themes:**
- Monday: Tip/trick
- Wednesday: Blog thread
- Friday: Feature spotlight or user showcase

**Thread Templates:**
- Blog post → 5-tweet thread (hook → problem → solution → how it works → CTA)
- Feature announcement → 3-tweet thread (what → why → how to try)
- Use case → 4-tweet thread (pain point → our approach → results → demo)

**Deliverable:**
- Content calendar: `docs/marketing/X-CONTENT-CALENDAR.md`
- Thread templates: `docs/marketing/x-thread-templates.md`
- 10+ pre-written posts ready to schedule

**Acceptance Criteria:**
- Strategy documented for both account types
- 10+ posts pre-written
- Thread templates created
- Posting schedule set

Apply: social-media-pattern

---

### TASK-6: Execute X.com posting and engagement (8h over sprint)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Build active presence on X.com with consistent posting and engagement

**Implementation Notes:**
**Posting:**
- Schedule posts using Buffer, Typefully, or native X.com scheduling
- Post blog post 1 as thread
- Post blog post 2 as thread
- Daily tips/insights from founders
- Engage with AI developer community (reply to pain points)

**Engagement:**
- Search for: "AI context loss", "Claude Code", "AI pair programming", "git workflow"
- Reply with helpful insights (not spammy links)
- Build relationships with other dev tool founders
- Retweet user wins and testimonials

**Metrics:**
- Impressions per post
- Engagement rate (likes + replies + retweets / impressions)
- Click-through rate to landing page
- Follower growth

**Files:**
- `docs/marketing/x-activity-log.csv`

**Acceptance Criteria:**
- 15+ posts published across accounts
- Both blog posts shared as threads
- Engagement rate >2%
- 50+ new followers (combined)
- Traffic from X.com visible in GA4

---

### TASK-7: Create LinkedIn strategy for SWE leaders (4h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Develop messaging that resonates with engineering managers and VPs

**Implementation Notes:**
**Target Audience:** Engineering managers, directors, VPs who need team visibility

**Pain Points:**
- "How do I know my team is being productive with AI tools?"
- "AI coding is a black box - I can't see what's happening"
- "Rework rates are killing our velocity"
- "Junior devs are over-relying on AI without understanding"

**LinkedIn Content Types:**
1. **Thought Leadership**
   - "The Hidden Cost of AI Pair Programming: Rework"
   - "Making AI Collaboration Observable for Engineering Leaders"
   - "How to Measure Team Velocity in the AI Era"

2. **Case Studies**
   - "How we reduced rework by 65% with session logging"
   - "Giving engineering managers visibility into AI work"

3. **Best Practices**
   - "3 Metrics Every Engineering Leader Should Track for AI Adoption"
   - "Session Handoffs: The Key to Async AI Collaboration"

**Posting Strategy:**
- Frequency: 2 posts/week
- Format: Long-form (1300 characters), storytelling
- Include: Personal anecdotes, data/metrics, clear takeaway
- CTA: "Learn how ginko makes AI work observable: [link]"

**Deliverable:**
- LinkedIn content calendar: `docs/marketing/LINKEDIN-CONTENT-CALENDAR.md`
- 4+ post drafts ready
- Connection strategy (who to connect with)

**Acceptance Criteria:**
- Strategy targets leadership pain points
- 4+ posts drafted
- Messaging distinct from developer-focused content
- Calendar scheduled

Apply: thought-leadership-pattern

---

### TASK-8: Execute LinkedIn posting (4h over sprint)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Publish 2+ LinkedIn posts targeting engineering leaders

**Implementation Notes:**
- Publish blog post 1 reframed for leadership (focus on team observability)
- Publish original thought leadership post
- Engage with comments (reply within 24h)
- Share in relevant LinkedIn groups (Engineering Leadership, CTOs, etc.)
- Connect with 20+ engineering leaders

**Metrics:**
- Post impressions
- Engagement (likes, comments, shares)
- Click-through to landing page
- Connection acceptance rate

**Acceptance Criteria:**
- 2+ posts published
- Engagement rate >3%
- 10+ new connections with target audience
- Traffic from LinkedIn visible in GA4

---

### TASK-9: Create YouTube content plan (4h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Plan tutorial videos and shorts based on blog content

**Implementation Notes:**
**Channel Setup:**
- Channel name: Ginko
- Banner: Brand colors, tagline
- Profile: Ginko logo
- About: "Git-native context management for AI-assisted development"

**Video Types:**
1. **Tutorial Videos (5-10 min)**
   - "Getting Started with Ginko CLI"
   - "Advanced Session Management Techniques"
   - "Team Collaboration with Ginko"

2. **Technical Deep-Dives (8-15 min)**
   - "How Ginko Achieves Sub-2s Session Starts"
   - "Event-Based Context Loading Explained"

3. **Shorts (60-90s)**
   - "Never lose AI context again #devtools"
   - "47x faster CLI startup with this trick"
   - "Make AI collaboration observable in 2 minutes"

**Video Production:**
- Screen recording: OBS Studio or Loom
- Editing: DaVinci Resolve (free) or Adobe Premiere
- Thumbnails: Canva templates
- Captions: YouTube auto-generate + manual review

**Content Repurposing:**
- Blog post 1 → Tutorial video + 2 shorts
- Blog post 2 → Deep-dive video + 2 shorts

**Deliverable:**
- Video content calendar: `docs/marketing/YOUTUBE-CONTENT-CALENDAR.md`
- Video scripts for 2+ videos
- Thumbnail templates

**Acceptance Criteria:**
- Channel set up and branded
- 2+ video scripts ready
- Production workflow documented
- Upload checklist created

Apply: video-content-pattern

---

### TASK-10: Produce and publish 1+ YouTube video (8h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Launch YouTube presence with tutorial video

**Implementation Notes:**
**Video 1: "Getting Started with Ginko CLI - Context Management for AI Coding"**

**Script Outline:**
1. Hook (0:00-0:15): "Tired of your AI losing context every session? Here's how to fix it."
2. Problem (0:15-1:00): Context loss, slow startups, no team visibility
3. Solution (1:00-2:00): Ginko intro, key features
4. Demo (2:00-7:00): Install → Init → Start → Log → Handoff (live terminal)
5. Results (7:00-8:00): Performance metrics, team benefits
6. CTA (8:00-8:30): Install instructions, links to docs/GitHub/Discord

**Production:**
- Record terminal session with clean shell
- Add voiceover or live narration
- Add text overlays for key points
- Background music (low volume)
- Thumbnail: "Ginko CLI Tutorial" + terminal screenshot

**SEO:**
- Title: "Ginko CLI Tutorial - Git-Native Context for AI Pair Programming"
- Description: Full description with timestamps, links
- Tags: git, CLI, AI coding, developer tools, context management, Claude Code
- Playlist: "Getting Started with Ginko"

**Deliverable:**
- Video published on YouTube
- Shared on X.com, LinkedIn, Reddit, Discord
- Embedded on landing page or blog

**Acceptance Criteria:**
- Video >5 min, <10 min
- Production quality (clear audio, smooth cuts)
- CTA includes UTM-tagged landing page link
- Views >50 in first week

---

### TASK-11: Create YouTube shorts from blog content (4h)
**Status:** [ ] Not Started
**Priority:** LOW

**Goal:** Produce 2+ shorts (60-90s) for quick reach

**Implementation Notes:**
**Short 1: "47x Faster CLI Startup" (from blog post 1)**
- Hook: "Our CLI took 90 seconds to start. We got it to 2 seconds. Here's how."
- Show: Before/after timing comparison
- Explain: Event-based loading in 1 sentence
- CTA: "Try Ginko - link in bio"

**Short 2: "Never Lose AI Context" (from blog post 2)**
- Hook: "Stop losing your AI chat history every session."
- Show: Demo of `ginko start` loading context instantly
- CTA: "Install Ginko - link in bio"

**Format:**
- Vertical 9:16 aspect ratio
- Text overlays (no voiceover needed, but optional)
- Fast cuts, high energy
- Hashtags: #devtools #AI #coding #CLI

**Publishing:**
- YouTube Shorts
- X.com (native video)
- LinkedIn (native video)

**Acceptance Criteria:**
- 2+ shorts produced
- Each <90s
- Published across platforms
- Views >100 combined in first week

---

### TASK-12: Implement UTM tracking across all platforms (3h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Ensure all external links include proper UTM parameters for attribution

**Implementation Notes:**
**UTM Builder:**
- Create spreadsheet or script to generate UTM links
- Columns: Platform, Campaign, Content, Full URL

**Platform-Specific Examples:**
- Reddit: `?utm_source=reddit&utm_medium=organic-social&utm_campaign=mvp-launch&utm_content=r-programming-001`
- X.com: `?utm_source=twitter&utm_medium=organic-social&utm_campaign=blog-post-fast-startups`
- LinkedIn: `?utm_source=linkedin&utm_medium=organic-social&utm_campaign=thought-leadership-observability`
- YouTube: `?utm_source=youtube&utm_medium=video&utm_campaign=tutorial-getting-started`

**Link Shortener:**
- Use Bitly or custom domain (go.ginkoai.com) for cleaner links
- Maintain UTM parameters through redirect

**Tracking:**
- All links logged in `docs/marketing/utm-links.csv`
- GA4 configured to track UTM parameters

**Acceptance Criteria:**
- All platform links include UTMs
- Links tracked in central spreadsheet
- GA4 reports show accurate attribution
- Short links working and trackable

Follow: UTM Schema (TASK-4 in Sprint 1)

---

### TASK-13: Create cross-platform content calendar (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Coordinate publishing across all platforms for maximum impact

**Implementation Notes:**
**Calendar Structure:**
- Week view with all platforms
- Blog post → social repurposing timeline
- Platform-specific posting days/times

**Example Week:**
```
Monday:
- Blog: Publish post 1
- X.com: Thread from post 1 (9am)
- LinkedIn: Share post 1 with leadership angle (10am)

Tuesday:
- Reddit: Share post 1 in r/ExperiencedDevs (value-first framing)
- X.com: Founder tweet on building in public

Wednesday:
- YouTube: Publish tutorial video
- X.com: Announce video with clip
- LinkedIn: Share video

Thursday:
- X.com: Tip/trick post
- Reddit: Engage in relevant threads

Friday:
- X.com: User showcase
- LinkedIn: Weekly recap

Weekend:
- Reddit: r/programming Saturday post (if ready)
```

**Tool:**
- Google Calendar or Notion calendar
- Buffer/Hootsuite for scheduling

**Deliverable:**
- `docs/marketing/CROSS-PLATFORM-CALENDAR.md`
- Shared calendar (Google Calendar or Notion)

**Acceptance Criteria:**
- 4-week calendar populated
- All blog posts mapped to social repurposing
- Platform-specific optimal times documented
- Team has access to calendar

Apply: content-orchestration-pattern

---

### TASK-14: Monitor and document engagement metrics (Ongoing, 4h)
**Status:** [ ] Not Started
**Priority:** LOW

**Goal:** Track performance across all platforms for weekly reviews

**Implementation Notes:**
**Metrics to Track:**
- Reddit: Upvotes, comments, click-throughs per post
- X.com: Impressions, engagement rate, follower growth, link clicks
- LinkedIn: Impressions, engagement rate, connection growth, link clicks
- YouTube: Views, watch time, CTR, subscribers
- Overall: Traffic by source (GA4), conversion by channel

**Reporting:**
- Weekly snapshot (every Monday)
- Best/worst performing content
- Channel attribution for CLI installs
- Engagement rate trends

**Deliverable:**
- Weekly report template: `docs/marketing/WEEKLY-METRICS-TEMPLATE.md`
- Automated data collection (Zapier or manual)
- Dashboard view (GA4 + PostHog)

**Acceptance Criteria:**
- Metrics collected weekly
- Top-performing content identified
- Underperforming channels flagged
- Insights inform next week's content

---

## Accomplishments This Sprint

[To be filled as work progresses]

---

## Next Steps

1. Begin Sprint 4: Launch, Community & Iteration
2. Double down on best-performing content types
3. Iterate messaging based on engagement data

---

## Blockers

[To be updated if blockers arise]

---

## References

- [EPIC-010: MVP Marketing Strategy](../epics/EPIC-010-mvp-marketing-strategy.md)
- [Sprint 1: Analytics Foundation](./SPRINT-2026-01-e010-sprint1-analytics-foundation.md)
- [Sprint 2: Landing Page Optimization](./SPRINT-2026-01-e010-sprint2-landing-page-optimization.md)
