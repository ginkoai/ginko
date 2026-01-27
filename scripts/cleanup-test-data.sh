#!/bin/bash
#
# cleanup-test-data.sh - Clean up test data from remote services (graph + supabase)
#
# Removes test data for a SPECIFIC graph from:
#   - Neo4j graph database (all nodes for the specified graphId)
#   - Supabase teams table (teams matching the specified graph_id)
#
# SAFETY: Requires explicit --graph-id parameter to prevent accidental deletion
#         of production data. Only deletes data matching the specified graphId.
#
# Usage:
#   ./scripts/cleanup-test-data.sh --graph-id uat-testing-123           # Preview mode
#   ./scripts/cleanup-test-data.sh --graph-id uat-testing-123 --execute # Execute cleanup
#   ./scripts/cleanup-test-data.sh --graph-id uat-testing-123 --graph-only
#   ./scripts/cleanup-test-data.sh --graph-id uat-testing-123 --supabase-only
#
# Requirements:
#   - GINKO_API_KEY or gk_* key from ~/.ginko/auth.json
#   - Admin access to the ginko dashboard API
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DASHBOARD_URL="${GINKO_DASHBOARD_URL:-https://app.ginko.ai}"
API_KEY=""
EXECUTE_MODE=false
CLEAN_GRAPH=true
CLEAN_SUPABASE=true
GRAPH_ID=""

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
        --graph-only)
            CLEAN_SUPABASE=false
            shift
            ;;
        --supabase-only)
            CLEAN_GRAPH=false
            shift
            ;;
        --help|-h)
            echo "Usage: $0 --graph-id <GRAPH_ID> [OPTIONS]"
            echo ""
            echo "Required:"
            echo "  --graph-id <ID>   Graph ID to clean up (e.g., 'uat-testing-123')"
            echo ""
            echo "Options:"
            echo "  --execute, -e     Execute cleanup (default is preview mode)"
            echo "  --graph-only      Only clean Neo4j graph database"
            echo "  --supabase-only   Only clean Supabase tables"
            echo "  --help, -h        Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  GINKO_API_KEY         API key for authentication"
            echo "  GINKO_DASHBOARD_URL   Dashboard URL (default: https://app.ginko.ai)"
            echo ""
            echo "Examples:"
            echo "  # Preview cleanup for a test graph"
            echo "  $0 --graph-id uat-testing-123"
            echo ""
            echo "  # Execute cleanup"
            echo "  $0 --graph-id uat-testing-123 --execute"
            echo ""
            echo "  # Clean only graph data (not Supabase)"
            echo "  $0 --graph-id uat-testing-123 --graph-only --execute"
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
    echo "Usage: $0 --graph-id <GRAPH_ID> [OPTIONS]"
    echo ""
    echo "This parameter is required to prevent accidental deletion of production data."
    echo "Use --help for more information."
    exit 1
fi

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Ginko Test Data Cleanup${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Get API key
if [ -n "$GINKO_API_KEY" ]; then
    API_KEY="$GINKO_API_KEY"
elif [ -f "$HOME/.ginko/auth.json" ]; then
    API_KEY=$(cat "$HOME/.ginko/auth.json" | grep -o '"api_key": *"[^"]*"' | sed 's/"api_key": *"//' | tr -d '"')
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
echo -e "API Key:   ${CYAN}${API_KEY:0:15}...${NC}"
echo -e "Graph ID:  ${CYAN}$GRAPH_ID${NC}"
echo ""

if [ "$EXECUTE_MODE" = true ]; then
    echo -e "${YELLOW}Mode: EXECUTE (changes will be made)${NC}"
else
    echo -e "${GREEN}Mode: PREVIEW (no changes will be made)${NC}"
fi
echo ""

# ============================================
# Supabase Cleanup (Teams by graph_id)
# ============================================

if [ "$CLEAN_SUPABASE" = true ]; then
    echo -e "${BLUE}--- Supabase: Teams with graph_id='$GRAPH_ID' ---${NC}"
    echo ""

    # Preview what would be deleted (filter by specific graph_id)
    echo -n "  Checking for matching teams... "
    TEAMS_RESPONSE=$(curl -s -X GET \
        "$DASHBOARD_URL/api/v1/admin/cleanup-test-teams?graphId=$GRAPH_ID" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json")

    # Check for errors
    if echo "$TEAMS_RESPONSE" | grep -q '"error"'; then
        ERROR_MSG=$(echo "$TEAMS_RESPONSE" | grep -o '"error": *"[^"]*"' | head -1)
        echo -e "${RED}failed${NC}"
        echo -e "  ${RED}$ERROR_MSG${NC}"
    else
        TEAM_COUNT=$(echo "$TEAMS_RESPONSE" | grep -o '"count": *[0-9]*' | head -1 | grep -o '[0-9]*')
        TEAM_COUNT=${TEAM_COUNT:-0}
        echo -e "${GREEN}found $TEAM_COUNT teams${NC}"

        if [ "$TEAM_COUNT" -gt 0 ]; then
            echo ""
            echo "  Teams to be deleted:"
            # Parse and display teams (simplified output)
            echo "$TEAMS_RESPONSE" | grep -o '"name": *"[^"]*"' | head -10 | while read line; do
                TEAM_NAME=$(echo "$line" | sed 's/"name": *"/    - /' | tr -d '"')
                echo "$TEAM_NAME"
            done

            if [ "$EXECUTE_MODE" = true ]; then
                echo ""
                echo -n "  Deleting teams... "
                DELETE_RESPONSE=$(curl -s -X DELETE \
                    "$DASHBOARD_URL/api/v1/admin/cleanup-test-teams?graphId=$GRAPH_ID" \
                    -H "Authorization: Bearer $API_KEY" \
                    -H "Content-Type: application/json")

                if echo "$DELETE_RESPONSE" | grep -q '"success": *true'; then
                    DELETED_COUNT=$(echo "$DELETE_RESPONSE" | grep -o '"count": *[0-9]*' | head -1 | grep -o '[0-9]*')
                    echo -e "${GREEN}deleted $DELETED_COUNT teams${NC}"
                else
                    echo -e "${RED}failed${NC}"
                    echo "  Response: $DELETE_RESPONSE"
                fi
            fi
        fi
    fi
    echo ""
fi

# ============================================
# Graph Cleanup (Neo4j)
# ============================================

if [ "$CLEAN_GRAPH" = true ]; then
    echo -e "${BLUE}--- Neo4j Graph: Data for graphId='$GRAPH_ID' ---${NC}"
    echo ""

    # Analyze graph for cleanup opportunities
    echo -n "  Analyzing graph... "
    CLEANUP_RESPONSE=$(curl -s -X GET \
        "$DASHBOARD_URL/api/v1/graph/cleanup?graphId=$GRAPH_ID" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json")

    if echo "$CLEANUP_RESPONSE" | grep -q '"error"'; then
        ERROR_MSG=$(echo "$CLEANUP_RESPONSE" | grep -o '"message": *"[^"]*"' | head -1)
        echo -e "${RED}failed${NC}"
        echo -e "  ${RED}$ERROR_MSG${NC}"
    else
        echo -e "${GREEN}done${NC}"
        echo ""

        # Parse orphan nodes
        ORPHAN_TOTAL=$(echo "$CLEANUP_RESPONSE" | grep -o '"orphanNodes":{[^}]*"total": *[0-9]*' | grep -o '"total": *[0-9]*' | grep -o '[0-9]*')
        ORPHAN_TOTAL=${ORPHAN_TOTAL:-0}
        if [ "$ORPHAN_TOTAL" -gt 0 ]; then
            echo "  Orphan nodes (no graphId): $ORPHAN_TOTAL"
        fi

        # Parse default graphId nodes
        DEFAULT_TOTAL=$(echo "$CLEANUP_RESPONSE" | grep -o '"defaultGraphIdNodes":{[^}]*"total": *[0-9]*' | grep -o '"total": *[0-9]*' | grep -o '[0-9]*')
        DEFAULT_TOTAL=${DEFAULT_TOTAL:-0}
        if [ "$DEFAULT_TOTAL" -gt 0 ]; then
            echo "  Nodes with 'default' graphId: $DEFAULT_TOTAL"
        fi

        # Parse duplicate tasks
        DUP_TASK_COUNT=$(echo "$CLEANUP_RESPONSE" | grep -o '"duplicateCount": *[0-9]*' | head -1 | grep -o '[0-9]*')
        DUP_TASK_COUNT=${DUP_TASK_COUNT:-0}
        if [ "$DUP_TASK_COUNT" -gt 0 ]; then
            echo "  Duplicate task nodes: $DUP_TASK_COUNT"
        fi

        # Show if nothing to clean
        if [ "$ORPHAN_TOTAL" -eq 0 ] && [ "$DEFAULT_TOTAL" -eq 0 ] && [ "$DUP_TASK_COUNT" -eq 0 ]; then
            echo "  No cleanup needed for this graph"
        fi

        if [ "$EXECUTE_MODE" = true ]; then
            echo ""

            # Clean orphan nodes
            if [ "$ORPHAN_TOTAL" -gt 0 ]; then
                echo -n "  Cleaning orphan nodes... "
                ORPHAN_RESULT=$(curl -s -X DELETE \
                    "$DASHBOARD_URL/api/v1/graph/cleanup?graphId=$GRAPH_ID&action=cleanup-orphans&dryRun=false&confirm=CLEANUP_CONFIRMED" \
                    -H "Authorization: Bearer $API_KEY" \
                    -H "Content-Type: application/json")
                AFFECTED=$(echo "$ORPHAN_RESULT" | grep -o '"affected": *[0-9]*' | grep -o '[0-9]*')
                echo -e "${GREEN}deleted ${AFFECTED:-0} nodes${NC}"
            fi

            # Clean default graphId nodes
            if [ "$DEFAULT_TOTAL" -gt 0 ]; then
                echo -n "  Cleaning 'default' graphId nodes... "
                DEFAULT_RESULT=$(curl -s -X DELETE \
                    "$DASHBOARD_URL/api/v1/graph/cleanup?graphId=$GRAPH_ID&action=cleanup-default&dryRun=false&confirm=CLEANUP_CONFIRMED" \
                    -H "Authorization: Bearer $API_KEY" \
                    -H "Content-Type: application/json")
                AFFECTED=$(echo "$DEFAULT_RESULT" | grep -o '"affected": *[0-9]*' | grep -o '[0-9]*')
                echo -e "${GREEN}deleted ${AFFECTED:-0} nodes${NC}"
            fi

            # Dedupe tasks
            if [ "$DUP_TASK_COUNT" -gt 0 ]; then
                echo -n "  Deduplicating task nodes... "
                DEDUPE_RESULT=$(curl -s -X DELETE \
                    "$DASHBOARD_URL/api/v1/graph/cleanup?graphId=$GRAPH_ID&action=dedupe-tasks&dryRun=false&confirm=CLEANUP_CONFIRMED" \
                    -H "Authorization: Bearer $API_KEY" \
                    -H "Content-Type: application/json")
                AFFECTED=$(echo "$DEDUPE_RESULT" | grep -o '"affected": *[0-9]*' | grep -o '[0-9]*')
                echo -e "${GREEN}removed ${AFFECTED:-0} duplicates${NC}"
            fi
        fi
    fi
    echo ""
fi

# ============================================
# Summary
# ============================================

echo -e "${BLUE}============================================${NC}"
if [ "$EXECUTE_MODE" = true ]; then
    echo -e "${GREEN}  Cleanup complete for graphId: $GRAPH_ID${NC}"
else
    echo -e "${GREEN}  Preview complete for graphId: $GRAPH_ID${NC}"
    echo ""
    echo "  To execute cleanup, run:"
    echo "    $0 --graph-id $GRAPH_ID --execute"
fi
echo -e "${BLUE}============================================${NC}"
echo ""
