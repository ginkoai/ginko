<p align="center">
  <img src="https://ginkoai.com/logo.svg" alt="Ginko" width="120" />
</p>

<h1 align="center">Ginko</h1>

<p align="center">
  <strong>AI-native project management for developers who work with AI partners.</strong>
</p>

<p align="center">
  <a href="https://github.com/ginkoai/ginko/actions/workflows/ci.yml"><img src="https://github.com/ginkoai/ginko/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/@ginkoai/cli"><img src="https://img.shields.io/npm/v/@ginkoai/cli.svg" alt="npm version" /></a>
  <a href="https://github.com/ginkoai/ginko/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="License: AGPL-3.0" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/@ginkoai/cli.svg" alt="Node.js version" /></a>
</p>

<p align="center">
  Privacy-first. Git-native. Zero config required.
</p>

---

## What is Ginko?

Ginko is a CLI tool that makes AI collaboration **safe, observable, and learnable**. It gives your AI coding partner (Claude, GPT, Gemini, or any LLM) structured memory across sessions — so every conversation picks up where the last one left off.

**The problem:** AI coding assistants forget everything between sessions. You waste time re-explaining context, repeating decisions, and rediscovering gotchas.

**The solution:** Ginko provides git-native session management, structured handoffs, and progressive context loading — all stored locally in your repo.

### 30-Second Demo

```bash
# Install
npm install -g @ginkoai/cli

# Initialize in your project
cd your-project
ginko init

# Start a session — your AI partner gets full context
ginko start

# ... work with your AI partner ...

# Save progress for next session
ginko handoff "Implemented auth middleware, JWT validation working"

# Next session picks up exactly where you left off
ginko start
# → "Last session: Implemented auth middleware, JWT validation working"
# → "Next up: Add refresh token rotation"
```

## Features

### Privacy First
- **Your code never leaves your machine** — all data stored in `.ginko/` inside your repo
- **Git-native persistence** — session data tracked in git, works with any git workflow
- **Zero telemetry** — no analytics, no tracking, no phone-home. Ever.

### Session Continuity
- **Structured handoffs** — save context with enough detail for your next session (or a teammate's)
- **Progressive context loading** — only loads what's relevant, not your entire project history
- **Session synthesis** — AI-readable summaries of what happened, what was decided, and what's next

### Work Structure
- **Epics & Sprints** — organize work into trackable units with AI-assisted planning
- **Project charters** — define goals, scope, and success criteria
- **ADR tracking** — architecture decisions live alongside your code

### AI Adaptability
Ginko auto-detects your AI partner and formats output accordingly:
- Claude (rich markdown)
- GPT-4 (structured JSON)
- Gemini (hierarchical XML)
- Any LLM (universal fallback)

## Installation

```bash
npm install -g @ginkoai/cli
```

**Requirements:** Node.js 18+

## Quick Start

```bash
# 1. Initialize Ginko in your project
ginko init

# 2. Start a session
ginko start

# 3. Log important events as you work
ginko log "Chose JWT over sessions for stateless auth"

# 4. Save progress when done
ginko handoff "Auth middleware complete, tests passing"
```

## Core Commands

| Command | Description |
|---------|-------------|
| `ginko init` | Initialize Ginko in your project |
| `ginko start` | Start or resume a session with full context |
| `ginko handoff` | Save session progress for seamless continuation |
| `ginko status` | Show current session and sprint status |
| `ginko log` | Log events, decisions, and insights |
| `ginko vibecheck` | Quick recalibration when feeling stuck |
| `ginko charter` | Create/edit project charter (AI-assisted) |
| `ginko epic` | Plan epics with sprint breakdown (AI-assisted) |
| `ginko ship` | Create and push a PR-ready branch |
| `ginko compact` | Clean up old sessions and reduce context size |
| `ginko config` | Manage configuration |

Run `ginko --help` for all commands and options.

## How It Works

```
Your Project
├── .ginko/                    # All Ginko data (git-tracked)
│   ├── sessions/              # Session handoffs and archives
│   │   └── your-email/
│   │       ├── current-session-log.md
│   │       └── archive/
│   ├── context/               # Context modules and state
│   └── config.json            # Local configuration
├── docs/
│   ├── PROJECT-CHARTER.md     # Project goals and scope
│   ├── adr/                   # Architecture Decision Records
│   ├── epics/                 # Epic definitions
│   └── sprints/               # Sprint plans with tasks
└── CLAUDE.md                  # AI instructions (auto-generated)
```

Ginko stores everything in your repo as plain files. No database, no external service, no lock-in.

## Local vs Cloud

Ginko works fully offline with zero configuration. An optional cloud tier adds team features.

| Feature | Local (Free, Open Source) | Ginko Cloud |
|---------|--------------------------|-------------|
| Session management | Yes | Yes |
| Handoffs & context | Yes | Yes |
| Epics & sprints | Yes | Yes |
| Project charter | Yes | Yes |
| ADR tracking | Yes | Yes |
| AI-assisted planning | Yes | Yes |
| **Knowledge graph** | — | Yes |
| **Team collaboration** | — | Yes |
| **Graph-powered search** | — | Yes |
| **Dashboard & visualization** | — | Yes |
| **Coaching insights** | — | Yes |

The CLI gracefully degrades when cloud features aren't configured — no errors, no nag screens.

## Architecture Decisions

Ginko's architecture is documented through ADRs in [`docs/adr/`](docs/adr/). Key decisions:

- [ADR-020: CLI-First Pivot](docs/adr/ADR-020-cli-first-pivot.md) — Why we chose CLI over IDE plugins
- [ADR-021: Privacy-First, Git-Native](docs/adr/ADR-021-privacy-first-git-native.md) — Core privacy philosophy
- [ADR-032: Core CLI Architecture](docs/adr/ADR-032-core-cli-architecture-and-reflection-system.md) — How the CLI works internally
- [ADR-052: Entity Naming Convention](docs/adr/ADR-052-unified-entity-naming-convention.md) — How tasks/sprints/epics are identified
- [ADR-078: Local-First Architecture](docs/adr/ADR-078-local-first-cli-architecture.md) — How cloud features degrade gracefully

## Development

```bash
# Clone the repository
git clone https://github.com/ginkoai/ginko.git
cd ginko

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Link for local development
cd packages/cli
npm link
```

### Project Structure

```
ginko/
├── packages/
│   └── cli/          # The Ginko CLI (@ginkoai/cli)
│       ├── src/      # TypeScript source
│       ├── test/     # Test suites
│       └── dist/     # Compiled output
├── docs/
│   ├── adr/          # Architecture Decision Records
│   └── guides/       # User guides
└── .github/
    └── workflows/    # CI/CD pipelines
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in CI mode (no coverage, force exit)
npm run test -w @ginkoai/cli -- --ci
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Before submitting a PR:
1. Run `npm test` and ensure all tests pass
2. Follow existing code patterns and conventions
3. Add tests for new features
4. Update relevant documentation

## Security

Found a vulnerability? Please report it responsibly. See [SECURITY.md](SECURITY.md).

## License

[AGPL-3.0-or-later](LICENSE) — Ginko is free software. You can use, modify, and distribute it under the terms of the GNU Affero General Public License.

**Why AGPL?** We believe development tools should be open and transparent. AGPL ensures that improvements to Ginko remain available to the community, while allowing unrestricted use in any project (open source or proprietary).

## Links

- **Website:** [ginkoai.com](https://ginkoai.com)
- **Documentation:** [Getting Started Guide](docs/guides/GETTING-STARTED.md)
- **Issues:** [GitHub Issues](https://github.com/ginkoai/ginko/issues)
- **Discussions:** [GitHub Discussions](https://github.com/ginkoai/ginko/discussions)

---

<p align="center">
  Built with care by <a href="https://ginkoai.com">Ginko AI</a>
</p>
