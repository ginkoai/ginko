# Ginko CLI Commands Reference

Complete reference for all ginko CLI commands.

## Session Commands

### `ginko start [sessionId]`
Start or resume a session with event-based context loading.
- Loads context from `.ginko/sessions/[user]/`
- Shows active sprint and next task
- Warns about uncommitted files

### `ginko status`
Show current session status.

### `ginko handoff [message]`
Pause current session and create handoff document.
- Archives previous session
- Creates continuity document for next session

### `ginko log [description]`
Log an event to the current session (defensive logging).

### `ginko compact`
Reduce context size by removing stale information.

## Task Management

### `ginko task complete <taskId>`
Mark task as complete. Updates knowledge graph (syncs to dashboard).
- Options: `--cascade` (auto-complete parent if all siblings done)

### `ginko task start <taskId>`
Mark task as in progress.

### `ginko task pause <taskId>`
Return task to not_started state.

### `ginko task block <taskId> [reason]`
Block task with reason. Prompts for reason if not provided.

### `ginko task show <taskId>`
Show current task status.

## Sprint Management

### `ginko sprint start <sprintId>`
Start sprint (planned → active).

### `ginko sprint complete <sprintId>`
Complete sprint (active → complete).

### `ginko sprint pause <sprintId>`
Pause sprint (active → paused).

### `ginko sprint status show <sprintId>`
Show current sprint status.

### `ginko sprint deps`
Visualize task dependencies as a tree.

## Knowledge Graph

### `ginko graph init`
Initialize knowledge graph for your project.

### `ginko graph load [options]`
Upload documents to knowledge graph.
- `--docs-only`: Load ADRs and PRDs only
- `--extended-only`: Load patterns, gotchas, sessions only
- `--force`: Reload all documents even if unchanged

### `ginko graph status`
Show graph statistics and health.

### `ginko graph health`
Show graph reliability metrics (success rate, latency, retries).

### `ginko graph query <text>`
Search documents using semantic similarity.
- Options: `--limit N`, `--type <TYPE>`

### `ginko graph explore <documentId>`
Explore document and its connections.

### `ginko graph migrate <migration>`
Run graph migrations.

## Team & Assignment

### `ginko assign <taskIdOrEmail> [email]`
Assign tasks to team members.
- Updates both graph and sprint markdown
- Options: `--sprint <id> --all` (assign all tasks in sprint)

### `ginko sync [options]`
Pull dashboard knowledge edits to local git.
- `--preview`: Preview without syncing
- `--dry-run`: Preview what files would sync
- `--force`: Overwrite local files
- `--type <type>`: Sync only specific type (ADR, PRD, Pattern, etc.)
- `--no-commit`: Sync without committing

### `ginko team-activity [user]`
View team activity from user-namespaced session logs.

### `ginko invite [email]`
Invite collaborators to join your team.

### `ginko join [code]`
Join a team using an invitation code.

## Planning & Architecture

### `ginko charter`
Create and manage project charter (AI-assisted).

### `ginko epic`
Create and manage epics with status tracking.

### `ginko sprint [intent]`
Sprint management and planning commands.

### `ginko plan [feature]`
Create phased implementation plan with acceptance criteria.

### `ginko architecture [decision]`
Design mode for crafting ADRs with AI enhancement.

### `ginko roadmap`
View product roadmap (Now/Next/Later priority lanes).

### `ginko backlog`
Manage git-native backlog items.

### `ginko feature <description>`
Quick create a feature (shortcut for backlog create feature).

### `ginko story <description>`
Quick create a story (shortcut for backlog create story).

## Development Tools

### `ginko ship [message]`
AI-enhanced shipping with smart commit messages and PR descriptions.

### `ginko verify <taskId>`
Verify task completion by running acceptance criteria checks.

### `ginko vibecheck [concern]`
Pause moment for recalibration - conversational check-in.

### `ginko capture [description]`
Capture a learning, discovery, or important context.

### `ginko explore [topic]`
Collaborative thinking mode for exploring problems and solutions.

### `ginko reflect <intent>`
Universal reflection pattern for AI-enhanced content generation.

## Multi-Agent

### `ginko orchestrate`
Run as supervisor agent to coordinate multi-agent task execution.

### `ginko agent`
Manage AI agents for multi-agent collaboration.

### `ginko checkpoint`
Manage checkpoints for task rollback and recovery.

### `ginko dlq`
Manage Dead Letter Queue (failed events).

### `ginko escalation`
Manage human escalations for multi-agent collaboration.

### `ginko notifications`
Manage notification hooks for human observability.

## Authentication

### `ginko login`
Authenticate CLI with GitHub via Supabase OAuth.

### `ginko logout`
Clear local authentication session.

### `ginko whoami`
Display current authentication status and user information.

## Configuration

### `ginko init`
Initialize Ginko in your project (sets up local structure + cloud graph).

### `ginko config [key] [value]`
Manage Ginko configuration.

### `ginko context`
Manage session context.

## IDE Integration

### `ginko init-cursor`
Generate Cursor setup preview or apply it to the repository.

### `ginko uninstall-cursor`
Remove Cursor integration.

### `ginko init-copilot`
Generate GitHub Copilot setup preview or apply to repository.

### `ginko uninstall-copilot`
Remove GitHub Copilot integration.

## Migration

### `ginko migrate`
Migration utilities for syncing markdown to graph.
