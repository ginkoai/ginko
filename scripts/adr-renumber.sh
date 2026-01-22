#!/bin/zsh
# ADR Renumbering Script
# Generated: 2026-01-22
# Purpose: Resolve duplicate ADR numbers by renumbering non-canonical ADRs
#
# Usage:
#   ./scripts/adr-renumber.sh --dry-run    # Preview changes
#   ./scripts/adr-renumber.sh --execute    # Apply changes
#
# This script:
#   1. Renames ADR files to new numbers
#   2. Updates internal headers in renamed files
#   3. Updates all references across the codebase
#   4. Fixes mismatched headers in ADR-008 and ADR-009
#   5. Moves supplementary docs to appropriate locations
#   6. Deletes obsolete files
#   7. Generates Cypher queries for graph updates

set -euo pipefail

SCRIPT_DIR="${0:A:h}"
PROJECT_ROOT="${SCRIPT_DIR:h}"
ADR_DIR="$PROJECT_ROOT/docs/adr"
GUIDES_DIR="$PROJECT_ROOT/docs/guides"
ARCHIVE_DIR="$PROJECT_ROOT/docs/archive"

DRY_RUN=true
VERBOSE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Renumbering map using zsh associative arrays
typeset -A RENUMBER_MAP
RENUMBER_MAP=(
    "ADR-003-oauth-authentication-architecture" "062"
    "ADR-003-migration-to-ginkoai" "063"
    "ADR-004-browser-extension-strategy" "064"
    "ADR-006-continuous-context-invocation" "065"
    "ADR-007-github-search-engine" "066"
    "ADR-007-phase-context-coherence" "067"
    "ADR-008-context-reflexes" "068"
    "ADR-009-progressive-context-loading" "069"
    "ADR-011-backlog-architecture" "070"
    "ADR-012-ginko-command-architecture" "071"
    "ADR-013-simple-builder-pattern" "072"
    "ADR-014-safe-defaults-reflector-pattern" "073"
    "ADR-014-enhanced-handoff-quality" "074"
    "ADR-016-handoff-tool-consolidation-and-vibecheck" "075"
    "ADR-026-enhanced-ginko-init-with-intelligent-project-optimization-for-ai-collaboration" "076"
)

# New titles for renumbered ADRs
typeset -A NEW_TITLES
NEW_TITLES=(
    "062" "OAuth Authentication Architecture"
    "063" "Migration from WatchHill to Ginko AI"
    "064" "Browser-First Strategy for Claude.ai Integration"
    "065" "Continuous Context Invocation Pattern"
    "066" "GitHub-Indexed Search Engine Architecture"
    "067" "Phase Context Coherence"
    "068" "Context Reflexes Architecture"
    "069" "Progressive Context Loading"
    "070" "Git-Native Backlog Architecture"
    "071" "Ginko Command Architecture - Structured Freedom"
    "072" "Simple Builder Pattern for Pipeline Architecture"
    "073" "Safe Defaults Pattern for Reflector Pipelines"
    "074" "Enhanced Handoff Quality Standards"
    "075" "Handoff Tool Consolidation and Vibecheck Pattern"
    "076" "Enhanced ginko init with Intelligent Project Optimization"
)

# Files to move (supplementary docs)
typeset -A MOVE_MAP
MOVE_MAP=(
    "$ADR_DIR/ADR-033-implementation-guide.md" "$GUIDES_DIR/ADR-033-GUIDE.md"
    "$ADR_DIR/ADR-033-implementation-summary.md" "$ARCHIVE_DIR/ADR-033-SUMMARY.md"
)

# Files to delete
DELETE_FILES=(
    "$ADR_DIR/ADR-033-implementation-plan.md"
)

# Header fixes (files with wrong internal ADR numbers)
typeset -A HEADER_FIXES
HEADER_FIXES=(
    "ADR-008-environment-based-authentication" "008"
    "ADR-009-serverless-first-mvp-architecture" "009"
)

usage() {
    echo "Usage: $0 [--dry-run|--execute] [--verbose]"
    echo ""
    echo "Options:"
    echo "  --dry-run   Preview changes without applying them (default)"
    echo "  --execute   Apply all changes"
    echo "  --verbose   Show detailed output"
    echo ""
    exit 1
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_action() {
    if [[ "$DRY_RUN" == true ]]; then
        echo -e "${YELLOW}[DRY-RUN]${NC} $1"
    else
        echo -e "${GREEN}[EXECUTE]${NC} $1"
    fi
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --execute)
            DRY_RUN=false
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

echo ""
echo "=========================================="
echo "  ADR Renumbering Script"
echo "=========================================="
echo ""
if [[ "$DRY_RUN" == true ]]; then
    log_warning "DRY RUN MODE - No changes will be made"
else
    log_warning "EXECUTE MODE - Changes will be applied!"
fi
echo ""

# Track statistics
STATS_RENAMED=0
STATS_REFS_UPDATED=0
STATS_MOVED=0
STATS_DELETED=0
STATS_HEADERS_FIXED=0

# ============================================
# Phase 1: Rename ADR files
# ============================================
echo ""
echo "Phase 1: Renaming ADR files"
echo "-------------------------------------------"

for old_slug in ${(k)RENUMBER_MAP}; do
    new_num="${RENUMBER_MAP[$old_slug]}"
    old_file="$ADR_DIR/${old_slug}.md"

    # Extract the topic part (everything after ADR-NNN-)
    topic="${old_slug#ADR-[0-9][0-9][0-9]-}"
    new_slug="ADR-${new_num}-${topic}"
    new_file="$ADR_DIR/${new_slug}.md"

    if [[ -f "$old_file" ]]; then
        log_action "Rename: ${old_slug}.md → ${new_slug}.md"

        if [[ "$DRY_RUN" == false ]]; then
            mv "$old_file" "$new_file"

            # Update the internal header (# ADR-NNN: Title)
            old_num="${old_slug[5,7]}"
            title="${NEW_TITLES[$new_num]}"

            # Update header line - handle both "# ADR-NNN:" and "# ADR-NNN-" formats
            sed -i '' "s/# ADR-${old_num}[:-].*$/# ADR-${new_num}: ${title}/" "$new_file"

            # Update any self-references in frontmatter
            sed -i '' "s/ADR-${old_num}-/ADR-${new_num}-/g" "$new_file"
        fi

        ((STATS_RENAMED++)) || true
    else
        log_warning "File not found: $old_file"
    fi
done

# ============================================
# Phase 2: Fix mismatched headers
# ============================================
echo ""
echo "Phase 2: Fixing mismatched internal headers"
echo "-------------------------------------------"

for slug in ${(k)HEADER_FIXES}; do
    correct_num="${HEADER_FIXES[$slug]}"
    file="$ADR_DIR/${slug}.md"

    if [[ -f "$file" ]]; then
        # Detect current wrong number in header
        current_header=$(grep -m1 "^# ADR-[0-9][0-9][0-9]:" "$file" 2>/dev/null || true)

        if [[ -n "$current_header" ]]; then
            wrong_num=$(echo "$current_header" | sed 's/# ADR-\([0-9][0-9][0-9]\):.*/\1/')

            if [[ "$wrong_num" != "$correct_num" ]]; then
                log_action "Fix header in ${slug}.md: ADR-${wrong_num} → ADR-${correct_num}"

                if [[ "$DRY_RUN" == false ]]; then
                    sed -i '' "s/# ADR-${wrong_num}:/# ADR-${correct_num}:/" "$file"
                fi

                ((STATS_HEADERS_FIXED++)) || true
            fi
        fi
    fi
done

# ============================================
# Phase 3: Update references across codebase
# ============================================
echo ""
echo "Phase 3: Updating references across codebase"
echo "-------------------------------------------"

# Build sed commands for all replacements
SED_COMMANDS=""
for old_slug in ${(k)RENUMBER_MAP}; do
    new_num="${RENUMBER_MAP[$old_slug]}"
    topic="${old_slug#ADR-[0-9][0-9][0-9]-}"
    new_slug="ADR-${new_num}-${topic}"
    SED_COMMANDS+="-e 's/${old_slug}/${new_slug}/g' "
done

# Find all files that might contain references (faster than grep -r for each)
log_info "Scanning for references to renamed ADRs..."

find "$PROJECT_ROOT" \( -name "*.md" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/.next/*" \
    -type f 2>/dev/null | while IFS= read -r file; do

    # Check if file contains any of the old slugs
    for old_slug in ${(k)RENUMBER_MAP}; do
        if grep -q "$old_slug" "$file" 2>/dev/null; then
            new_num="${RENUMBER_MAP[$old_slug]}"
            topic="${old_slug#ADR-[0-9][0-9][0-9]-}"
            new_slug="ADR-${new_num}-${topic}"

            # Skip the renamed file itself
            if [[ "$file" == *"${new_slug}.md" ]]; then
                continue
            fi

            ref_count=$(grep -c "$old_slug" "$file" 2>/dev/null || echo "0")
            if [[ "$ref_count" -gt 0 ]]; then
                log_action "Update $ref_count ref(s) in: ${file#$PROJECT_ROOT/}"
                ((STATS_REFS_UPDATED+=ref_count)) || true

                if [[ "$DRY_RUN" == false ]]; then
                    sed -i '' "s/${old_slug}/${new_slug}/g" "$file"
                fi
            fi
        fi
    done
done

# ============================================
# Phase 4: Move supplementary docs
# ============================================
echo ""
echo "Phase 4: Moving supplementary documents"
echo "-------------------------------------------"

for src in ${(k)MOVE_MAP}; do
    dest="${MOVE_MAP[$src]}"
    dest_dir="${dest:h}"

    if [[ -f "$src" ]]; then
        log_action "Move: ${src#$PROJECT_ROOT/} → ${dest#$PROJECT_ROOT/}"

        if [[ "$DRY_RUN" == false ]]; then
            mkdir -p "$dest_dir"
            mv "$src" "$dest"
        fi

        ((STATS_MOVED++)) || true
    else
        log_warning "File not found: $src"
    fi
done

# ============================================
# Phase 5: Delete obsolete files
# ============================================
echo ""
echo "Phase 5: Deleting obsolete files"
echo "-------------------------------------------"

for file in $DELETE_FILES; do
    if [[ -f "$file" ]]; then
        log_action "Delete: ${file#$PROJECT_ROOT/}"

        if [[ "$DRY_RUN" == false ]]; then
            rm "$file"
        fi

        ((STATS_DELETED++)) || true
    else
        log_warning "File not found: $file"
    fi
done

# ============================================
# Phase 6: Generate Cypher queries for graph
# ============================================
echo ""
echo "Phase 6: Generating Cypher queries for graph updates"
echo "-------------------------------------------"

CYPHER_FILE="$PROJECT_ROOT/scripts/adr-renumber-graph.cypher"

cypher_content="// ADR Renumbering - Graph Updates
// Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
// Run these queries in the Neo4j dashboard after local file updates
//
// IMPORTANT: Run each query separately and verify results

"

for old_slug in ${(k)RENUMBER_MAP}; do
    new_num="${RENUMBER_MAP[$old_slug]}"
    topic="${old_slug#ADR-[0-9][0-9][0-9]-}"
    new_slug="ADR-${new_num}-${topic}"
    title="${NEW_TITLES[$new_num]}"

    cypher_content+="// Renumber: ${old_slug} → ${new_slug}
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = '${old_slug}'
SET a.id = '${new_slug}',
    a.title = 'ADR-${new_num}: ${title}',
    a.name = 'ADR-${new_num}: ${title}',
    a.updatedAt = datetime()
RETURN a.id as newId;

"
done

cypher_content+="// Fix header mismatches (title updates only)
// ADR-008-environment-based-authentication (header said ADR-007)
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-008-environment-based-authentication'
  AND a.title STARTS WITH 'ADR-007'
SET a.title = 'ADR-008: Environment-Based Authentication for MCP Endpoints',
    a.name = 'ADR-008: Environment-Based Authentication for MCP Endpoints',
    a.updatedAt = datetime()
RETURN a.id, a.title;

// ADR-009-serverless-first-mvp-architecture (header said ADR-008)
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id = 'ADR-009-serverless-first-mvp-architecture'
  AND a.title STARTS WITH 'ADR-008'
SET a.title = 'ADR-009: Serverless-First Architecture for MVP',
    a.name = 'ADR-009: Serverless-First Architecture for MVP',
    a.updatedAt = datetime()
RETURN a.id, a.title;

// Delete moved/obsolete supplementary docs from graph (if they exist)
MATCH (a:ADR)
WHERE (a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd')
  AND a.id IN ['ADR-033-implementation-guide', 'ADR-033-implementation-plan', 'ADR-033-implementation-summary']
DETACH DELETE a
RETURN count(*) as deleted;

// Validation: Count ADRs after renumbering
MATCH (a:ADR)
WHERE a.graph_id = 'gin_1762125961056_dg4bsd' OR a.graphId = 'gin_1762125961056_dg4bsd'
RETURN count(a) as adrCount;
"

if [[ "$DRY_RUN" == false ]]; then
    echo "$cypher_content" > "$CYPHER_FILE"
    log_success "Cypher queries written to: scripts/adr-renumber-graph.cypher"
else
    log_action "Would write Cypher queries to: scripts/adr-renumber-graph.cypher"
fi

# ============================================
# Summary
# ============================================
echo ""
echo "=========================================="
echo "  Summary"
echo "=========================================="
echo ""
echo "  Files renamed:      $STATS_RENAMED"
echo "  References updated: $STATS_REFS_UPDATED"
echo "  Files moved:        $STATS_MOVED"
echo "  Files deleted:      $STATS_DELETED"
echo "  Headers fixed:      $STATS_HEADERS_FIXED"
echo ""

if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}This was a dry run. Run with --execute to apply changes.${NC}"
    echo ""
    echo "Recommended execution order:"
    echo "  1. ./scripts/adr-renumber.sh --execute"
    echo "  2. Review changes with: git diff"
    echo "  3. Run Cypher queries in Neo4j dashboard"
    echo "  4. Update ADR-INDEX.md manually"
    echo "  5. Commit: git add -A && git commit -m 'refactor(adr): Renumber duplicate ADRs (062-076)'"
else
    echo -e "${GREEN}Changes applied successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review changes with: git diff"
    echo "  2. Run Cypher queries: cat scripts/adr-renumber-graph.cypher"
    echo "  3. Update ADR-INDEX.md to reflect new numbers"
    echo "  4. Commit changes"
fi

echo ""
