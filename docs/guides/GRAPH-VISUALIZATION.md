/**
 * @fileType: guide
 * @status: current
 * @updated: 2025-12-15
 * @tags: [graph, visualization, dashboard, knowledge-graph, explorer, ui]
 * @related: [DASHBOARD-OVERVIEW.md, FOCUS-PAGE.md]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

# Graph Visualization Guide

**Target audience:** Ginko Dashboard beta users
**Reading time:** 4-5 minutes
**Last updated:** 2025-12-15

## Introduction

The **Graph** page in the Ginko Dashboard is your knowledge graph explorer, providing a visual interface to navigate all project entities and their relationships. Unlike traditional file browsers, the graph view shows the semantic structure of your project: epics, sprints, tasks, architecture decisions (ADRs), patterns, and gotchas—all interconnected.

Think of it as your project's knowledge map, where you can explore not just _what_ exists, but _how everything relates_.

## Layout Overview

The Graph page uses a three-panel layout optimized for exploration and discovery:

```
┌─────────────┬──────────────────────┬─────────────┐
│             │                      │             │
│    Tree     │     Card Grid        │   Detail    │
│  Explorer   │   (Main Content)     │   Panel     │
│             │                      │  (Slide-in) │
│ Collapsible │  Filterable, Search  │             │
│  ⌘F Search  │  Sortable, Paginated │  Node Info  │
│             │                      │  Relations  │
└─────────────┴──────────────────────┴─────────────┘
```

### Panel Functions

- **Left Panel (Tree Explorer):** Hierarchical navigation through your project structure
- **Center Panel (Card Grid):** Visual browsing of filtered nodes with metadata
- **Right Panel (Detail Panel):** Deep dive into individual nodes and their connections

All panels work together: select a node in the tree to filter the grid, click a card to view details, or follow relationships to traverse the graph.

---

## Tree Explorer (Left Panel)

The Tree Explorer provides a hierarchical view of your project's knowledge graph, organized by entity type and relationships.

### Structure

```
📁 Projects
  └─ 📁 ginko
      ├─ 📁 Epics
      │   ├─ 📁 e001 - Foundation
      │   │   ├─ 📁 Sprints
      │   │   │   ├─ e001_s01 - Core CLI
      │   │   │   └─ e001_s02 - Session Management
      │   │   └─ 📁 Tasks
      │   │       ├─ e001_s01_t01 - Implement start command
      │   │       └─ e001_s01_t02 - Add session logging
      │   └─ 📁 e002 - Dashboard
      ├─ 📁 ADRs
      │   ├─ ADR-002: AI-Optimized File Discovery
      │   └─ ADR-033: Context Pressure Mitigation
      ├─ 📁 Patterns
      │   └─ retry-pattern
      └─ 📁 Gotchas
          └─ timer-unref-gotcha
```

### Features

**Expand/Collapse Folders**
Click folder icons to navigate deep hierarchies without losing context.

**Search with ⌘F**
Press `⌘F` (macOS) or `Ctrl+F` (Windows/Linux) to instantly search the tree. Results highlight matching nodes.

**Collapsible Panel**
Toggle the tree on/off to maximize card grid space when needed.

### Navigation Tips

- **Epics → Sprints → Tasks:** Follow the work breakdown structure
- **ADRs by topic:** Find architecture decisions grouped by concern
- **Patterns/Gotchas:** Quick access to reusable knowledge

---

## Card Grid (Center Panel)

The Card Grid is your main browsing interface, displaying nodes as rich cards with metadata and visual indicators.

![Card Grid Example - Placeholder](../assets/screenshots/graph-card-grid.png)
_Screenshot placeholder: Card grid showing filtered tasks with status badges_

### Card Information

Each card displays:
- **Title:** Node name (e.g., "TASK-01: Implement event queue")
- **Type Badge:** Visual indicator (Epic, Sprint, Task, ADR, Pattern, Gotcha)
- **Status:** Current state (e.g., in-progress, complete, paused)
- **Timestamps:** Created and last updated dates
- **Description Preview:** First 100 characters of node description

### Filtering

**Filter by Type (Checkboxes)**
Toggle entity types to focus your view:

```
☑ Epics       ☑ Sprints      ☑ Tasks
☑ ADRs        ☑ Patterns     ☑ Gotchas
```

Example: Uncheck everything except "ADRs" to see only architecture decisions.

### Searching

**Search Bar**
Filters visible cards by title, description, or tags. Search is case-insensitive and applies to the currently filtered set.

Example: Search "auth" to find all authentication-related nodes.

### Sorting

**Sort Options:**
- **Name (A-Z / Z-A):** Alphabetical order
- **Created (Newest / Oldest):** When node was added
- **Updated (Newest / Oldest):** Last modification time

Default: Newest updated first (most recent work appears first).

### View Modes

**Grid View (Default)**
Visual cards arranged in a responsive grid. Best for browsing and pattern recognition.

**List View**
Compact rows showing more nodes per screen. Best for scanning many items quickly.

Toggle between views using the view switcher in the toolbar.

### Pagination

Large result sets paginate automatically:
- **10, 25, 50, 100** items per page
- Navigation: Previous / Next buttons + page number display
- Keyboard shortcuts: `←` (previous) / `→` (next)

### Interactions

- **Single Click:** Select node (highlights card, updates context)
- **Double Click:** Open detail panel with full node information
- **Hover:** Preview additional metadata in tooltip

---

## Node Details Panel (Right Panel)

The Detail Panel slides in when you double-click a card, providing comprehensive information about the selected node.

![Detail Panel Example - Placeholder](../assets/screenshots/graph-detail-panel.png)
_Screenshot placeholder: Detail panel showing task node with related sprints and ADRs_

### Sections

**1. Header**
- **Title:** Full node name
- **Type Badge:** Entity type with color coding
- **Status Indicator:** Current state (with confidence/severity icons if applicable)
- **Close Button:** Slide panel closed (or press `Esc`)

**2. Overview**
- **Description:** Full markdown-rendered description
- **Created:** Timestamp and author (if available)
- **Updated:** Last modification time
- **Tags:** Clickable tags for cross-referencing

**3. Properties**
Type-specific fields based on node type:

| Type | Properties |
|------|-----------|
| **Task** | Sprint, assignee, estimated hours, actual hours, blockers |
| **Sprint** | Epic, start date, end date, progress %, task count |
| **Epic** | Project, owner, sprint count, completion % |
| **ADR** | Decision status, alternatives considered, consequences |
| **Pattern** | Confidence level (★◐○), use cases, related patterns |
| **Gotcha** | Severity (🚨⚠️💡), mitigation steps, affected components |

**4. Related Nodes**

The most powerful feature of the Detail Panel: view all incoming and outgoing relationships.

**Example for Task Node:**
```
Incoming Relationships (2)
  ├─ Sprint: e001_s01 - Core CLI (PART_OF)
  └─ ADR: ADR-033 - Context Pressure (FOLLOWS)

Outgoing Relationships (3)
  ├─ Pattern: retry-pattern (APPLIES)
  ├─ Gotcha: timer-unref-gotcha (AVOIDS)
  └─ File: packages/cli/src/lib/event-queue.ts (MODIFIES)
```

**Relationship Types:**
- **PART_OF:** Hierarchical containment (task → sprint → epic)
- **FOLLOWS:** Architecture decision adherence
- **APPLIES:** Pattern usage
- **AVOIDS:** Gotcha awareness
- **MODIFIES:** File-level changes
- **DEPENDS_ON:** Technical dependencies
- **RELATES_TO:** Semantic connections

### Breadcrumb Navigation

Click any related node to navigate to its detail view. The panel updates with breadcrumb history:

```
Home > Epic: e001 > Sprint: e001_s01 > Task: e001_s01_t01
```

Click breadcrumb segments to navigate back through your exploration path.

### Actions

Available actions depend on node type:
- **Edit:** Modify node properties (if authorized)
- **View in Context:** Jump to related sprint/epic
- **Open File:** Launch editor at specific line (for file relationships)
- **Copy Link:** Get shareable deep link to this node

---

## Tips & Keyboard Shortcuts

### Deep Linking

Share specific nodes by copying the URL with `?node=nodeId`:

```
https://app.ginkoai.com/graph?node=e001_s01_t01
```

Opens the graph page with that node pre-selected and detail panel expanded.

### Keyboard Navigation

| Shortcut | Action |
|----------|--------|
| `⌘F` / `Ctrl+F` | Search tree explorer |
| `/` | Focus search bar in card grid |
| `←` / `→` | Navigate pagination |
| `Esc` | Close detail panel |
| `?` | Show all keyboard shortcuts |

### Pro Workflows

**1. Sprint Progress Check**
Filter by Sprint → Sort by Updated → See most recent work

**2. Find Architecture Decisions**
Filter by ADR → Search by topic → View related tasks implementing the decision

**3. Pattern Discovery**
Filter by Pattern → Sort by Confidence → Review high-confidence patterns for reuse

**4. Dependency Mapping**
Select a task → View relationships → Follow DEPENDS_ON edges to understand blockers

**5. Impact Analysis**
Select a file node → View incoming relationships → See all tasks modifying that file

---

## Common Questions

**Q: Why don't I see all my files in the tree?**
A: The graph shows _semantic entities_ (epics, sprints, tasks, ADRs) not raw files. Files appear as relationships when tasks modify them.

**Q: How often does the graph update?**
A: Real-time. Changes from `ginko log` or CLI commands sync immediately via event stream.

**Q: Can I create nodes from the UI?**
A: Currently, node creation happens via CLI (`ginko epic`, `ginko sprint`, etc.). The graph is read-only for visualization.

**Q: What's the difference between Tree Explorer and Card Grid?**
A: Tree shows _structure_ (hierarchy), Grid shows _content_ (metadata). Use both together for fast navigation.

**Q: How do I find nodes created by a specific person?**
A: Use the search bar + filter by Event nodes (if tracking user activity) or check node properties for author fields.

---

## Next Steps

- **Explore your project graph:** Start with the Tree Explorer to understand structure
- **Use filters aggressively:** Narrow focus to specific entity types
- **Follow relationships:** Let the graph guide you through connections
- **Bookmark deep links:** Save important nodes for quick access

**Related guides:**
- [Dashboard Overview](DASHBOARD-OVERVIEW.md) - Full platform navigation
- [Focus Page Guide](FOCUS-PAGE.md) - Sprint-focused workflow view

---

**Need help?** Reach out via the feedback button in the dashboard or email support@ginkoai.com.
