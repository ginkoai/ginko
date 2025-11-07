/**
 * @fileType: guide
 * @status: current
 * @updated: 2025-11-07
 * @tags: [documentation, video, demo, marketing]
 * @related: [QUICK-START.md, USER-GUIDE.md]
 * @priority: medium
 * @complexity: low
 */

# Video Walkthrough Script: Ginko Knowledge Graph Platform

**Duration:** 7-10 minutes
**Target Audience:** Developers, engineering teams
**Goal:** Demonstrate value proposition and core features
**Call to Action:** Try Ginko at https://ginkoai.com

---

## Video Outline

1. **Hook** (0:00-0:30) - The Problem
2. **Introduction** (0:30-1:00) - What is Ginko?
3. **Demo Part 1** (1:00-3:00) - Getting Started & Knowledge Creation
4. **Demo Part 2** (3:00-5:00) - Semantic Search & Relationships
5. **Demo Part 3** (5:00-7:00) - Team Collaboration & Public Discovery
6. **Conclusion** (7:00-8:00) - Recap & CTA
7. **Bonus** (8:00-10:00) - Advanced Features (optional)

---

## Scene-by-Scene Breakdown

### Scene 1: Hook - The Problem (0:00-0:30)

**Visual:**
- Split screen showing two developers
- Left: Developer searching through 50+ markdown files
- Right: Developer scrolling through Slack threads
- Both look frustrated

**Voiceover:**
```
"Ever spent 20 minutes searching for that one architecture decision
you made three months ago? Or trying to remember why your team chose
PostgreSQL over MySQL?

In modern software development, we create hundreds of important
decisions, patterns, and insights every month. But most of them get
lost in markdown files, Slack threads, or someone's head.

There's a better way."
```

**Screen Recording Notes:**
- Record actual frustration of searching through files
- Show `grep -r "database" docs/` with overwhelming results
- Show Slack search with irrelevant results

---

### Scene 2: Introduction - What is Ginko? (0:30-1:00)

**Visual:**
- Ginko logo animation
- Architecture diagram (CLI → API → Neo4j graph)
- Quick feature highlights with icons

**Voiceover:**
```
"Introducing Ginko - a cloud-first knowledge graph platform for
AI-assisted development.

Ginko captures your team's architecture decisions, product requirements,
and development patterns in an intelligent graph database.

It uses semantic search powered by vector embeddings to help you find
exactly what you need, when you need it.

Best of all, it works right from your terminal with a simple CLI.

Let me show you how it works."
```

**Screen Recording Notes:**
- Show logo with tagline: "Never lose context again"
- Animate graph nodes connecting
- Show terminal with `ginko --help`

---

### Scene 3: Demo Part 1 - Getting Started (1:00-3:00)

**Visual:**
- Terminal split with code editor
- Browser showing GitHub OAuth

**Voiceover:**
```
"Getting started is simple. First, install the CLI:"
```

**Screen Recording:**
```bash
# Terminal
npm install -g @ginko/cli
ginko --version
# Output: 1.5.0
```

**Voiceover:**
```
"Then authenticate with GitHub:"
```

**Screen Recording:**
```bash
ginko login
# Browser opens for GitHub OAuth
# Return to terminal
# Output: ✅ Authentication successful!
```

**Voiceover:**
```
"Create a project for your repository:"
```

**Screen Recording:**
```bash
ginko project create my-saas-app --repo=github.com/demo/my-saas-app
# Output: ✅ Project created successfully!
```

**Voiceover:**
```
"Now let's add our first architecture decision. We recently chose
PostgreSQL for our database. Let's capture that:"
```

**Screen Recording:**
```bash
ginko knowledge create \
  --type ADR \
  --title "Use PostgreSQL for Primary Database" \
  --content "We chose PostgreSQL because it provides strong ACID guarantees, excellent JSON support, and proven scalability." \
  --tags database,architecture,postgres \
  --status accepted

# Output: ✅ Knowledge node created successfully!
# ID: adr_abc123
```

**Voiceover:**
```
"That's it! Your decision is now in the cloud, indexed, and searchable.

Let's add a few more to make it interesting..."
```

**Screen Recording:**
```bash
# Fast-forward animation showing:
ginko knowledge create --type ADR --title "Use GraphQL for API" ...
ginko knowledge create --type PRD --title "User Authentication System" ...
ginko knowledge create --type ContextModule --title "Async Validation Pattern" ...

# Output: Created 3 more nodes
```

---

### Scene 4: Demo Part 2 - Semantic Search (3:00-5:00)

**Visual:**
- Terminal showing search results
- Highlight semantic matching (not just keyword)

**Voiceover:**
```
"Now comes the magic. Let's search for something related to databases:"
```

**Screen Recording:**
```bash
ginko knowledge search "database choice" --table
```

**Output:**
```
┌──────────────┬─────────────────────────┬──────────┬───────┐
│ ID           │ Title                   │ Type     │ Score │
├──────────────┼─────────────────────────┼──────────┼───────┤
│ adr_abc123   │ Use PostgreSQL for DB   │ ADR      │ 0.94  │
│ adr_def456   │ Caching Strategy        │ ADR      │ 0.78  │
└──────────────┴─────────────────────────┴──────────┴───────┘
```

**Voiceover:**
```
"Notice how we searched for 'database choice' but it found
'Use PostgreSQL for Primary Database'? That's semantic search
at work - it understands meaning, not just keywords.

Let's try something more complex:"
```

**Screen Recording:**
```bash
ginko knowledge search "how do we handle user login?" --limit 5
```

**Output:**
```
Found 3 results:

1. User Authentication System (PRD) - Score: 0.89
   We will implement OAuth2 with GitHub and Google providers...

2. Use GraphQL for API (ADR) - Score: 0.82
   Includes authentication middleware and JWT validation...

3. JWT Token Best Practices (ContextModule) - Score: 0.76
   Always validate tokens server-side...
```

**Voiceover:**
```
"Even though none of these contain the words 'user login',
Ginko found all the relevant knowledge about authentication.

Now let's visualize the relationships:"
```

**Screen Recording:**
```bash
ginko knowledge graph adr_abc123
```

**Output:**
```
📊 Knowledge Graph: Use PostgreSQL for Primary Database

├─ IMPLEMENTS
│  └─ PRD: User Authentication System
├─ REFERENCES
│  └─ ADR: Caching Strategy
└─ RELATED_TO (semantic similarity)
   ├─ ContextModule: Database Index Patterns (0.85)
   └─ ADR: Read Replica Setup (0.79)
```

**Voiceover:**
```
"Ginko automatically discovers relationships between your knowledge
using semantic similarity. This helps you understand the full context
around any decision."
```

---

### Scene 5: Demo Part 3 - Team Collaboration (5:00-7:00)

**Visual:**
- Terminal showing team features
- Browser showing public catalog

**Voiceover:**
```
"Ginko is built for teams. Let's invite a teammate:"
```

**Screen Recording:**
```bash
ginko project add-member alice@example.com --role editor
# Output: ✅ Member added successfully!

ginko team create backend-team
ginko team add-member backend-team alice@example.com
ginko team add-to-project backend-team my-saas-app --role editor
```

**Voiceover:**
```
"Now when Alice starts her day, she can see what the team has been
working on:"
```

**Screen Recording:**
```bash
# Switch to Alice's terminal
ginko start
```

**Output:**
```
🚀 Starting Ginko session...

Loading team context...
  - bob: Added PostgreSQL decision (2 hours ago)
  - carol: Created authentication PRD (4 hours ago)
  - dave: Updated API documentation (1 day ago)

Session started. Team context loaded in 687ms.
```

**Voiceover:**
```
"All team knowledge is automatically shared. No more asking
'Why did we choose X?' - just search for it.

But it gets better. Ginko also has a public discovery catalog
for open-source projects:"
```

**Screen Recording:**
```bash
# Switch to browser
open https://app.ginkoai.com/explore
```

**Browser Actions:**
- Show public catalog homepage
- Search for "authentication patterns"
- Browse results from different OSS projects
- Click into one project's knowledge graph
- Show related ADRs and PRDs

**Voiceover:**
```
"Browse knowledge from thousands of open-source projects.
Learn how other teams solve similar problems.

You can search across all public knowledge, filter by tags,
and even fork interesting patterns into your own projects.

It's like GitHub, but for architectural knowledge."
```

---

### Scene 6: Conclusion & Call to Action (7:00-8:00)

**Visual:**
- Quick montage of key features
- Ginko logo with website URL

**Voiceover:**
```
"Let's recap what we've seen:

✅ Capture architecture decisions, PRDs, and patterns with a simple CLI
✅ Search using natural language - find knowledge by meaning, not keywords
✅ Visualize relationships automatically
✅ Collaborate with your team in real-time
✅ Discover patterns from open-source projects

Ginko helps you preserve context, share knowledge, and make better
decisions faster.

It's free for public open-source projects, and affordable for
private teams.

Ready to stop losing context?

Get started today at ginkoai.com

Thanks for watching!"
```

**Screen Recording Notes:**
- Show quick 2-second clips of each feature
- End with call to action screen
- Include QR code for mobile viewers

---

### Scene 7: Bonus - Advanced Features (8:00-10:00)

**Optional advanced demo for interested viewers**

**Voiceover:**
```
"Want to see more? Here are some advanced features..."
```

**Feature 1: GraphQL API**
```bash
# Show GraphiQL interface
open https://app.ginkoai.com/api/graphql
```

**GraphQL Query:**
```graphql
query SearchKnowledge {
  search(query: "authentication", graphId: "graph_xyz", limit: 5) {
    node { id title type }
    score
  }
}
```

**Feature 2: Local-to-Cloud Sync**
```bash
# Show existing ADR files
ls docs/adr/

# Sync to cloud
ginko knowledge sync docs/adr/ --type ADR --dry-run
ginko knowledge sync docs/adr/ --type ADR
```

**Feature 3: REST API Integration**
```bash
# Show curl example
curl "https://app.ginkoai.com/api/v1/knowledge/nodes?graphId=graph_xyz" \
  -H "Authorization: Bearer $GINKO_API_KEY" | jq
```

**Feature 4: Context-Aware Session Logging**
```bash
ginko start
ginko log "Discovered async validation reduces lag by 40%" --impact high
ginko handoff "Completed OAuth. Next: refresh tokens"
```

---

## Production Notes

### Recording Setup

**Screen Recording:**
- Tool: ScreenFlow or OBS Studio
- Resolution: 1920x1080 @ 30fps
- Terminal: iTerm2 with Dracula theme
- Font: Fira Code, size 18pt
- Code editor: VS Code with Material Theme

**Audio:**
- Microphone: Blue Yeti or Shure SM7B
- Format: WAV 48kHz 16-bit
- Room: Quiet space with minimal echo
- Pop filter recommended

**Browser:**
- Chrome with clean profile (no extensions visible)
- Hide bookmarks bar
- Full screen mode

### Terminal Commands Preparation

**Pre-record setup:**
```bash
# Clean terminal history
history -c

# Setup demo project
ginko logout
rm -rf ~/.ginko
# Start fresh

# Pre-create files for sync demo
mkdir -p demo-docs/adr
echo "# Use PostgreSQL\n\nWe chose..." > demo-docs/adr/ADR-001.md
```

**Speed Tips:**
- Use shell aliases for long commands
- Pre-type commands in a script file
- Use `expect` or similar for automated typing effect
- Record in segments, edit together

### Editing Checklist

- [ ] Remove dead air and long pauses
- [ ] Add background music (subtle, non-distracting)
- [ ] Add lower thirds with feature names
- [ ] Add zoom effects for important terminal output
- [ ] Add transitions between scenes (fade or quick cut)
- [ ] Color grade for consistency
- [ ] Add captions/subtitles
- [ ] Export in multiple resolutions (4K, 1080p, 720p)

### Publishing Checklist

- [ ] Upload to YouTube
- [ ] Add title: "Ginko: Never Lose Context Again | AI-Powered Knowledge Graph"
- [ ] Add description with links and timestamps
- [ ] Add tags: developer tools, knowledge management, CLI
- [ ] Create custom thumbnail
- [ ] Add to playlists
- [ ] Share on Twitter, Reddit r/programming, Hacker News
- [ ] Embed on ginkoai.com homepage

---

## Alternative Formats

### 60-Second Version (Social Media)

**For Twitter, LinkedIn, Instagram:**

```
0:00-0:10 - Problem: "Searching for that one decision you made months ago..."
0:10-0:30 - Demo: Install, login, create knowledge, search
0:30-0:50 - Value prop: "Semantic search. Team collaboration. Public discovery."
0:50-1:00 - CTA: "Try Ginko free at ginkoai.com"
```

### 3-Minute Version (Product Hunt)

**Focused on core value:**

```
0:00-0:30 - Hook + Introduction
0:30-1:30 - Knowledge creation + semantic search
1:30-2:30 - Team collaboration
2:30-3:00 - CTA
```

### 15-Minute Version (Conference Talk)

**Detailed technical walkthrough:**

```
0:00-2:00 - Problem statement with real examples
2:00-5:00 - Architecture overview (Neo4j, vector embeddings)
5:00-10:00 - Live demo (all features)
10:00-13:00 - Advanced use cases and API
13:00-15:00 - Q&A + CTA
```

---

## Voiceover Style Guide

**Tone:**
- Conversational and friendly
- Confident but not arrogant
- Enthusiastic but not overhyped
- Technical but accessible

**Pacing:**
- 150-160 words per minute (comfortable)
- Pause 1-2 seconds after key points
- Match voiceover to screen actions

**Pronunciation:**
- "Ginko" → "GING-koh" (like "bingo")
- "ADR" → "A-D-R" (spell out)
- "Neo4j" → "NEE-oh-four-jay"

---

## Call to Action Options

**Primary CTA:**
```
"Get started free at ginkoai.com"
```

**Secondary CTAs:**
```
"Star us on GitHub: github.com/chrispangg/ginko"
"Join our Discord: discord.gg/ginko"
"Read the docs: docs.ginkoai.com"
```

**End Screen Elements:**
- Subscribe button
- Related video links
- QR code for mobile
- Social media handles

---

**Next Steps:**
1. Record screen demo segments
2. Record voiceover
3. Edit together
4. Add music and effects
5. Review and refine
6. Publish and promote

Good luck with the video! 🎥
