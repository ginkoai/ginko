# Changelog

All notable changes to Ginko will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0-beta.2] - 2026-01-03

### 🎯 EPIC-006: UX Polish and UAT Complete

This release includes all fixes and improvements from user acceptance testing.

### Fixed

#### CLI
- **Sync command** - Fixed API response parsing and --dry-run flag behavior
- **Sync command** - Fixed graph API query consistency (DELETE/sync endpoints use CONTAINS pattern)
- **Sync command** - Use git root instead of cwd for file paths
- **Sync command** - Include graphId in mark-as-synced API call

#### Dashboard
- **Node editing** - Fixed save errors for nodes with certain property combinations (B12, B20)
- **API** - Added DELETE handler for graph nodes (BUG-003)
- **UAT bugs** - Fixed multiple issues discovered during acceptance testing (BUG-004, BUG-005)

#### Insights
- **Metrics accuracy** - Fixed cold start ratio and events per session calculations
- **Period filtering** - Fixed session date parsing for period-aware filtering
- **Score display** - Add period-aware score display and hide mismatched insights
- **Evidence** - Improved data accuracy and evidence display

### Added

#### Dashboard
- **Progress bars** - Dark-to-light gradient progress bars for visual polish
- **Error handling** - React Error Boundary for graceful error states
- **Loading states** - Skeleton UI components for better loading experience
- **Node validation** - NodeNotFound component for invalid/deleted node URLs

### Performance
- **Neo4j indexes** - Added 15 performance indexes (50-100x faster unsynced queries)
- **Pagination** - Migrated CategoryView to API-level pagination (removes 100-node limit)
- **Graph cleanup** - Removed 21 orphan/duplicate nodes from graph

---

## [2.0.0-beta.1] - 2025-12-15

### 🎉 First Beta Release

This is the first public beta of Ginko - The AI Collaboration Platform. Where humans and AI ship together.

### Added

#### CLI Features
- **Event-based context loading** - Sub-second session startup (< 2s vs 90s+ previously)
- **Session logging** - `ginko log` captures insights with quality scoring
- **AI-mediated charter** - `ginko charter` creates project charters through natural conversation
- **Epic/Sprint planning** - `ginko epic` generates structured development plans
- **Knowledge sync** - `ginko sync` pulls dashboard edits to local git repository
- **Coaching insights** - `ginko insights` generates AI-powered collaboration analysis

#### Dashboard Features
- **Focus page** - Project-centric landing with sprint progress, tasks, and activity
- **Graph visualization** - Interactive knowledge graph explorer with tree, grid, and detail views
- **Coaching insights** - AI-driven scores across Efficiency, Patterns, Quality, Anti-patterns
- **Knowledge editing** - Create and edit ADRs, Patterns, Tasks directly in browser
- **Sync workflow** - Dashboard → Graph → Git bidirectional sync

#### Architecture
- **Neo4j graph database** - Cloud-hosted knowledge graph with typed relationships
- **Voyage AI embeddings** - Semantic search across all knowledge nodes
- **GitHub OAuth** - Secure authentication with long-lived API keys
- **Git-native storage** - All context stored in `.ginko/` directory

### Performance
- Session startup: **47x faster** (90s → < 2s)
- Context tokens: **99% reduction** (93K → 500 tokens)
- Event-based streaming with cursor-based pagination

### Documentation
- Quick Start guide for 5-minute onboarding
- Dashboard guide for Focus, Graph, and Insights pages
- Graph Visualization guide with keyboard shortcuts
- Coaching Insights guide for score interpretation
- Knowledge Editing guide for sync workflow

---

## [1.8.0] - 2025-12-01

### Added
- Sprint progress tracking in CLI
- Task assignment and priority display
- Improved session handoff with summaries

### Fixed
- EventQueue timer hanging process (90s → 2s startup)
- Graph authorization for Focus page components

---

## [1.7.0] - 2025-11-25

### Added
- Event-based context loading (ADR-043)
- Session logging under optimal pressure (ADR-033)
- Defensive logging reflexes

### Changed
- Default to event-based loading (--strategic flag for legacy)

---

## [1.6.0] - 2025-11-19

### Added
- Project charter creation with AI mediation
- Epic and sprint generation
- Knowledge graph integration

---

## [1.5.0] - 2025-11-10

### Added
- Cloud graph connection
- Semantic search with Voyage AI embeddings
- Team event filtering

---

## [1.0.0] - 2025-10-15

### Added
- Initial release
- `ginko start` - Begin development session
- `ginko log` - Capture insights
- `ginko handoff` - End session with summary
- Git-native session storage in `.ginko/` directory
- Local-first architecture

---

[2.0.0-beta.2]: https://github.com/ginkoai/ginko/releases/tag/v2.0.0-beta.2
[2.0.0-beta.1]: https://github.com/ginkoai/ginko/releases/tag/v2.0.0-beta.1
[1.8.0]: https://github.com/ginkoai/ginko/releases/tag/v1.8.0
[1.7.0]: https://github.com/ginkoai/ginko/releases/tag/v1.7.0
[1.6.0]: https://github.com/ginkoai/ginko/releases/tag/v1.6.0
[1.5.0]: https://github.com/ginkoai/ginko/releases/tag/v1.5.0
[1.0.0]: https://github.com/ginkoai/ginko/releases/tag/v1.0.0
