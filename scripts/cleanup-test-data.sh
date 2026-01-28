#!/bin/bash
#
# cleanup-test-data.sh - Clean up test data from remote services (graph + supabase)
#
# Removes test data for a SPECIFIC graph from:
#   - Neo4j graph database (all nodes for the specified graphId)
#   - Supabase: teams, team_members, insight_runs, insights
#   - Project node itself
#
# SAFETY: Requires explicit --graph-id parameter to prevent accidental deletion
#         of production data. Only deletes data matching the specified graphId.
#
# Usage:
#   ./scripts/cleanup-test-data.sh --graph-id uat-testing-123           # Preview mode
#   ./scripts/cleanup-test-data.sh --graph-id uat-testing-123 --execute # Execute cleanup
#   ./scripts/cleanup-test-data.sh --graph-id uat-testing-123 --delete-project --execute
#
# Actions:
#   --analyze         Analyze issues (orphans, duplicates, etc.) - default
#   --delete-project  Delete ALL traces of the project (DESTRUCTIVE)
#   --cleanup-orphans Delete orphan nodes (no graphId)
#   --dedupe-tasks    Remove duplicate Task nodes
#
# Requirements:
#   - GINKO_API_KEY or token from ~/.ginko/auth.json
#   - Admin/owner access to the graph
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
DASHBOARD_URL="${GINKO_DASHBOARD_URL:-https://app.ginko.ai}"
API_KEY=""
EXECUTE_MODE=false
GRAPH_ID=""
ACTION="analyze"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --graph-id)
            GRAPH_ID="$2"
            shift 2
            ;;
        --execute|-e)
            EXECUTE_MODE=true
            shift
            ;;
        --delete-project)
            ACTION="delete-project"
            shift
            ;;
        --cleanup-orphans)
            ACTION="cleanup-orphans"
            shift
            ;;
        --dedupe-tasks)
            ACTION="dedupe-tasks"
            shift
            ;;
        --cleanup-default)
            ACTION="cleanup-default"
            shift
            ;;
        --analyze)
            ACTION="analyze"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 --graph-id <GRAPH_ID> [ACTION] [OPTIONS]"
            echo ""
            echo "Required:"
            echo "  --graph-id <ID>    Graph ID to operate on (e.g., 'uat-testing-123')"
            echo ""
            echo "Actions:"
            echo "  --analyze          Analyze issues (default)"
            echo "  --delete-project   DELETE ALL traces of the project (DESTRUCTIVE!)"
            echo "  --cleanup-orphans  Delete orphan nodes (no graphId)"
            echo "  --dedupe-tasks     Remove duplicate Task nodes"
            echo "  --cleanup-default  Delete nodes with 'default' graphId"
            echo ""
            echo "Options:"
            echo "  --execute, -e      Execute cleanup (default is preview/dry-run)"
            echo "  --help, -h         Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  GINKO_API_KEY         API key for authentication"
            echo "  GINKO_DASHBOARD_URL   Dashboard URL (default: https://app.ginko.ai)"
            echo ""
            echo "Examples:"
            echo "  # Preview what would be cleaned for a test graph"
            echo "  $0 --graph-id test-001"
            echo ""
            echo "  # Delete orphan nodes (dry run)"
            echo "  $0 --graph-id test-001 --cleanup-orphans"
            echo ""
            echo "  # Delete orphan nodes (execute)"
            echo "  $0 --graph-id test-001 --cleanup-orphans --execute"
            echo ""
            echo "  # COMPLETELY DELETE a project (preview)"
            echo "  $0 --graph-id test-001 --delete-project"
            echo ""
            echo "  # COMPLETELY DELETE a project (execute - DANGEROUS!)"
            echo "  $0 --graph-id test-001 --delete-project --execute"
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate required parameters
if [ -z "$GRAPH_ID" ]; then
    echo -e "${RED}Error: --graph-id is required${NC}"
    echo ""
    echo "Usage: $0 --graph-id <GRAPH_ID> [ACTION] [OPTIONS]"
    echo ""
    echo "This parameter is required to prevent accidental deletion of production data."
    echo "Use --help for more information."
    exit 1
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ${BOLD}Ginko Project Cleanup Tool${NC}${BLUE}                             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get API key
if [ -n "$GINKO_API_KEY" ]; then
    API_KEY="$GINKO_API_KEY"
elif [ -f "$HOME/.ginko/auth.json" ]; then
    # Try to extract access_token from auth.json
    API_KEY=$(cat "$HOME/.ginko/auth.json" | grep -o '"access_token"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*: *"//' | tr -d '"')
    if [ -z "$API_KEY" ]; then
        # Fallback to api_key field
        API_KEY=$(cat "$HOME/.ginko/auth.json" | grep -o '"api_key"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*: *"//' | tr -d '"')
    fi
fi

if [ -z "$API_KEY" ]; then
    echo -e "${RED}Error: No API key found${NC}"
    echo ""
    echo "Please either:"
    echo "  1. Set GINKO_API_KEY environment variable"
    echo "  2. Run 'ginko login' to authenticate"
    exit 1
fi

echo -e "Dashboard: ${CYAN}$DASHBOARD_URL${NC}"
echo -e "API Key:   ${CYAN}${API_KEY:0:20}...${NC}"
echo -e "Graph ID:  ${CYAN}$GRAPH_ID${NC}"
echo -e "Action:    ${CYAN}$ACTION${NC}"
echo ""

if [ "$EXECUTE_MODE" = true ]; then
    echo -e "${YELLOW}${BOLD}⚠️  Mode: EXECUTE (changes WILL be made)${NC}"
else
    echo -e "${GREEN}Mode: PREVIEW (no changes will be made)${NC}"
fi
echo ""

# ============================================
# Analyze Mode (default)
# ============================================

if [ "$ACTION" = "analyze" ]; then
    echo -e "${BLUE}── Analyzing graph for cleanup opportunities... ──${NC}"
    echo ""

    RESPONSE=$(curl -s -X GET \
        "$DASHBOARD_URL/api/v1/graph/cleanup?graphId=$GRAPH_ID" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json")

    if echo "$RESPONSE" | grep -q '"error"'; then
        ERROR_MSG=$(echo "$RESPONSE" | grep -o '"message"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*: *"//' | tr -d '"')
        echo -e "${RED}Error: $ERROR_MSG${NC}"
        exit 1
    fi

    # Parse and display analysis
    echo -e "${GREEN}Analysis Complete${NC}"
    echo ""

    # Pretty print the JSON response
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    echo ""

    echo -e "${BLUE}── Available Actions ──${NC}"
    echo ""
    echo "  To execute a cleanup action, run:"
    echo ""
    echo "  # Cleanup orphan nodes:"
    echo "  $0 --graph-id $GRAPH_ID --cleanup-orphans --execute"
    echo ""
    echo "  # Deduplicate tasks:"
    echo "  $0 --graph-id $GRAPH_ID --dedupe-tasks --execute"
    echo ""
    echo -e "  ${RED}# DELETE ENTIRE PROJECT (irreversible):${NC}"
    echo "  $0 --graph-id $GRAPH_ID --delete-project --execute"
    echo ""
    exit 0
fi

# ============================================
# Execute Cleanup Action
# ============================================

DRY_RUN="true"
CONFIRM=""
if [ "$EXECUTE_MODE" = true ]; then
    DRY_RUN="false"
    CONFIRM="&confirm=CLEANUP_CONFIRMED"
fi

# Special warning for delete-project
if [ "$ACTION" = "delete-project" ]; then
    echo -e "${RED}${BOLD}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}${BOLD}║  ⚠️  WARNING: DELETE PROJECT                            ║${NC}"
    echo -e "${RED}${BOLD}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${RED}This will permanently delete:${NC}"
    echo "  • ALL nodes in Neo4j for graphId: $GRAPH_ID"
    echo "  • The Project node itself"
    echo "  • All teams associated with this graph"
    echo "  • All insight runs and insights for this graph"
    echo ""
    echo -e "${RED}${BOLD}This action CANNOT be undone!${NC}"
    echo ""

    if [ "$EXECUTE_MODE" = true ]; then
        echo -n "Type 'DELETE' to confirm: "
        read CONFIRM_INPUT
        if [ "$CONFIRM_INPUT" != "DELETE" ]; then
            echo -e "${YELLOW}Cancelled.${NC}"
            exit 0
        fi
    fi
fi

echo -e "${BLUE}── Executing: $ACTION (dryRun=$DRY_RUN) ──${NC}"
echo ""

RESPONSE=$(curl -s -X DELETE \
    "$DASHBOARD_URL/api/v1/graph/cleanup?graphId=$GRAPH_ID&action=$ACTION&dryRun=$DRY_RUN$CONFIRM" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json")

if echo "$RESPONSE" | grep -q '"error"'; then
    ERROR_MSG=$(echo "$RESPONSE" | grep -o '"message"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*: *"//' | tr -d '"')
    echo -e "${RED}Error: $ERROR_MSG${NC}"
    echo ""
    echo "Response: $RESPONSE"
    exit 1
fi

# Parse results
AFFECTED=$(echo "$RESPONSE" | grep -o '"affected"[[:space:]]*:[[:space:]]*[0-9]*' | head -1 | grep -o '[0-9]*')
DETAILS=$(echo "$RESPONSE" | grep -o '"details"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*: *"//' | tr -d '"')

if [ "$DRY_RUN" = "true" ]; then
    echo -e "${YELLOW}Preview:${NC} $DETAILS"
    echo -e "Affected: ${CYAN}$AFFECTED${NC} items"
    echo ""
    echo "To execute this action, add --execute flag:"
    echo "  $0 --graph-id $GRAPH_ID --$ACTION --execute"
else
    echo -e "${GREEN}✓ Complete:${NC} $DETAILS"
    echo -e "Affected: ${CYAN}$AFFECTED${NC} items"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
if [ "$EXECUTE_MODE" = true ]; then
    echo -e "${GREEN}  Cleanup complete for graphId: $GRAPH_ID${NC}"
else
    echo -e "${GREEN}  Preview complete for graphId: $GRAPH_ID${NC}"
fi
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
