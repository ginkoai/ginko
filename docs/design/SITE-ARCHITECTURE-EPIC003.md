# Ginko Marketing Site Architecture

**Epic:** EPIC-003 Sprint 1 - TASK-2
**Created:** 2025-12-02
**Status:** Draft

---

## Current State

- **Tech:** Static HTML/CSS/JS
- **Hosting:** Vercel
- **Files:** index.html, styles.css, script.js
- **Size:** ~480 lines HTML, ~1000 lines CSS, ~200 lines JS

### What Works

- Single-page app with smooth scrolling
- Mobile responsive
- ROI calculator with animation
- Terminal demo mockup
- Clear pricing tiers

### What Changes

- Typography: Inter → JetBrains Mono + Inter
- Colors: Blue/green gradient → Neutral + ginko green accent
- Aesthetic: Generic SaaS → Industrial/terminal precision (Brass Hands)
- Theme: Light only → Light + Dark
- Structure: Reorganize sections for clarity
- Content: Refine messaging, remove speculative roadmap

---

## Proposed Site Structure

```
www.ginkoai.com/
├── / (Home)
│   ├── Hero - What ginko IS + primary CTA
│   ├── Problem - Context rot in 3 pain points
│   ├── Solution - How ginko works (visual)
│   ├── Features - 6 core capabilities
│   ├── Testimonial/Social proof
│   └── CTA - Get started
│
├── /developers (For Developers - 70%)
│   ├── Hero - Developer-focused value prop
│   ├── Quick start - Installation + first command
│   ├── How it works - Technical overview
│   ├── CLI commands - Key features
│   └── CTA - Install now
│
├── /teams (For Teams - 30%)
│   ├── Hero - Team/manager value prop
│   ├── Benefits - Productivity, visibility, knowledge
│   ├── ROI Calculator - Interactive
│   ├── Enterprise features
│   └── CTA - Contact sales
│
├── /pricing
│   ├── Pricing tiers (Free/Pro/Enterprise)
│   ├── Feature comparison
│   └── FAQ
│
├── /docs (Link to existing docs)
│
└── /blog (Future - Sprint 2)
```

---

## Page-by-Page Content

### Homepage (/)

**Purpose:** Establish what ginko is and why it matters in 30 seconds.

#### Hero Section

```
┌──────────────────────────────────────────────────────────────────┐
│  [corner]                                              [corner]  │
│                                                                  │
│        ginko                                                     │
│                                                                  │
│        Context that flows with you.                              │
│                                                                  │
│        Git-native session management for AI-assisted             │
│        development. Back in flow in 30 seconds.                  │
│                                                                  │
│        $ ginko start                                             │
│                                                                  │
│        [Get Started]  [View Docs]                                │
│                                                                  │
│  [corner]                                              [corner]  │
└──────────────────────────────────────────────────────────────────┘
```

**Key Messages:**
- Lead with WHAT: "Git-native session management"
- BENEFIT: "Back in flow in 30 seconds"
- PROOF: Show the command (terminal authenticity)

#### Problem Section

**Three cards, monospace headers:**

1. **CONTEXT_ROT**
   "AI assistants lose effectiveness as conversations grow. By message 50, they're guessing."

2. **SESSION_RESET**
   "Every new session = 10+ minutes re-explaining your project, decisions, and goals."

3. **KNOWLEDGE_SILOS**
   "Context lives in your head. When you switch tools or take a break, it's gone."

#### Solution Section

**Visual: Terminal demonstration**

```
$ ginko start

Ready | Hot (10/10) | Think & Build mode
Resume: Implementing payment integration with Stripe

Sprint: Payment System v2 (67%)
  [x] TASK-1: Stripe SDK setup
  [@] TASK-2: Webhook handlers
  [ ] TASK-3: Checkout flow

What would you like to work on?
```

**Copy:**
- "ginko captures your development context automatically"
- "Session logs, sprint progress, patterns, gotchas - all preserved"
- "Start fresh sessions with full context in seconds, not minutes"

#### Features Grid

Six cards with monospace labels:

| Label | Description |
|-------|-------------|
| `SESSION_HANDOFF` | Capture and resume development state across AI sessions |
| `SPRINT_TRACKING` | Progress tracking that lives alongside your code |
| `PATTERN_CAPTURE` | Learn from your codebase, remember what works |
| `GOTCHA_ALERTS` | Surface past mistakes before you repeat them |
| `GIT_NATIVE` | Works offline, versioned with your code |
| `TEAM_SYNC` | Share context across team members (Pro) |

#### Social Proof

Single testimonial with corner brackets:

```
┌──                                                              ──┐

  "The rapport is right there from the start. The flow is
   preserved, and my frustrations are gone."

   — Beta User

└──                                                              ──┘
```

#### CTA Section

```
Ready to eliminate context rot?

$ npm install -g ginko

[Get Started Free]  [Read the Docs]
```

---

### Developers Page (/developers)

**Purpose:** Technical credibility + immediate path to value.

#### Hero

```
Built for developers who live in the terminal.

ginko is a CLI-first tool that integrates with your existing
workflow. No new apps, no context switching, no learning curve.

$ npm install -g ginko && ginko init
```

#### Quick Start (3 steps)

```
# 1. Install
$ npm install -g ginko

# 2. Initialize in your project
$ cd your-project && ginko init

# 3. Start a session
$ ginko start

Ready in 30 seconds. Full context loaded.
```

#### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  YOUR CODE              GINKO                AI ASSISTANT   │
│  ─────────              ─────                ────────────   │
│                                                             │
│  git commits    ───►    session logs    ───►   Claude       │
│  file changes   ───►    sprint state    ───►   Cursor       │
│  terminal cmds  ───►    patterns        ───►   Copilot      │
│                                                             │
│  All stored locally in .ginko/, versioned with your code    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Key Commands

| Command | Description |
|---------|-------------|
| `ginko start` | Begin or resume a session |
| `ginko log "message"` | Capture an insight |
| `ginko handoff` | Create session summary for handoff |
| `ginko status` | View current context state |

#### CTA

```
$ npm install -g ginko

Open source core. MIT licensed.

[View on GitHub]  [Read Full Docs]
```

---

### Teams Page (/teams)

**Purpose:** Business value for managers/leads making tool decisions.

#### Hero

```
Context is your team's competitive advantage.

When developers leave for the day, their context shouldn't leave
with them. ginko preserves institutional knowledge automatically.
```

#### Benefits Grid

| For Managers | For Teams |
|--------------|-----------|
| Visibility into AI-assisted work | Shared patterns and gotchas |
| ROI metrics on context preservation | Reduced onboarding time |
| Audit trails for compliance | Knowledge that survives turnover |

#### ROI Calculator (Interactive)

Keep existing calculator but restyle:
- Monospace numbers
- Neutral colors with green highlights
- Show calculation breakdown

#### Enterprise Features

- SSO/SAML integration
- Audit logging
- On-premise deployment
- Priority support

#### CTA

```
[Start Team Trial]  [Contact Sales]
```

---

### Pricing Page (/pricing)

**Three tiers, clean grid:**

```
┌─────────────────┬─────────────────┬─────────────────┐
│      FREE       │       PRO       │   ENTERPRISE    │
├─────────────────┼─────────────────┼─────────────────┤
│     $0/mo       │   $9/user/mo    │   $29/user/mo   │
├─────────────────┼─────────────────┼─────────────────┤
│ 1 user          │ Unlimited users │ Unlimited       │
│ 1 project       │ Team sync       │ SSO/SAML        │
│ Local only      │ Cloud backup    │ Audit logging   │
│ Git integration │ Analytics       │ On-premise      │
│ Community       │ Email support   │ Priority SLA    │
├─────────────────┼─────────────────┼─────────────────┤
│ [Get Started]   │ [Start Trial]   │ [Contact Sales] │
└─────────────────┴─────────────────┴─────────────────┘
```

#### FAQ (Collapsible)

- Is ginko open source?
- What AI assistants does ginko work with?
- Where is my data stored?
- Can I self-host?
- What's the difference between Free and Pro?

---

## Navigation Structure

### Header

```
ginko                           [Developers] [Teams] [Pricing] [Docs]  [G] Get Started
```

- Logo: "ginko" in monospace (no "AI" suffix - cleaner)
- Nav links: Monospace, subtle
- Keyboard hint: `[G]` for Get Started (Stripe Dev pattern)
- CTA: Green button, corner bracket style

### Footer

```
─────────────────────────────────────────────────────────────────────

ginko                Product              Company           Resources
                     Developers           About             GitHub
Context that         Teams                Blog (soon)       Docs
flows with you.      Pricing                                Support

─────────────────────────────────────────────────────────────────────
© 2025 Ginko  •  Privacy  •  Terms  •  Made in Rhode Island
```

---

## Content Removal/Changes

### Remove

- [ ] "The AI-First Future" roadmap section (speculative)
- [ ] Market size claims ($200B, TAM)
- [ ] Inflated GitHub stats (2.5K stars, 150 contributors)
- [ ] Emoji icons in feature cards (replace with monospace labels)
- [ ] "GinkoAI" branding (simplify to "ginko")

### Refine

- [ ] Hero: Lead with what ginko IS, not what problem it solves
- [ ] Stats: Remove or use real numbers only
- [ ] Testimonial: Keep but restyle with corner brackets
- [ ] Terminal demo: Update to show actual ginko commands

### Add

- [ ] Dark mode toggle
- [ ] Keyboard navigation hints
- [ ] More terminal/code examples
- [ ] Clearer installation path

---

## Technical Implementation Notes

### Keep Static HTML

The current static approach works well:
- Fast load times
- No build step required
- Easy to maintain
- Vercel hosts static sites efficiently

### CSS Variables for Theming

Add CSS custom properties for light/dark:

```css
:root {
  --bg-primary: #FAFAFA;
  --text-primary: #171717;
  --accent: #22C55E;
  /* ... */
}

[data-theme="dark"] {
  --bg-primary: #0A0A0A;
  --text-primary: #FAFAFA;
  /* ... */
}
```

### Font Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

### Multi-Page Strategy

For now, keep single page with anchor sections. If we add /developers, /teams, /pricing as separate pages, create them as individual HTML files.

---

## Next Steps

1. [ ] Chris approves architecture
2. [ ] Begin homepage redesign (TASK-3)
3. [ ] Create developer/teams pages (TASK-4)
4. [ ] Implement dark mode toggle (TASK-6)
