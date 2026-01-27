#!/bin/bash
#
# reset-local-ginko.sh - Reset local ginko environment for UAT testing
#
# Removes all local ginko credentials, data, and configuration to provide
# a clean slate for testing the onboarding and authentication flows.
#
# Usage:
#   ./scripts/reset-local-ginko.sh           # Interactive mode (prompts for confirmation)
#   ./scripts/reset-local-ginko.sh --force   # Non-interactive mode (no prompts)
#
# What gets removed:
#   ~/.ginko/           - Global ginko directory (auth, session state, tool history)
#   .ginko/             - Project-level ginko directory (sessions, context, graph config)
#
# What is preserved:
#   - Git history and uncommitted changes
#   - Source code and configuration files
#   - docs/ directory (ADRs, sprints, etc.)
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
FORCE_MODE=false
for arg in "$@"; do
    case $arg in
        --force|-f)
            FORCE_MODE=true
            shift
            ;;
    esac
done

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Ginko Local Environment Reset${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Define paths
GLOBAL_GINKO_DIR="$HOME/.ginko"
PROJECT_GINKO_DIR=".ginko"

# Show what will be deleted
echo -e "${YELLOW}The following will be removed:${NC}"
echo ""

# Check global directory
if [ -d "$GLOBAL_GINKO_DIR" ]; then
    echo -e "  ${RED}~/.ginko/${NC} (global credentials & state)"
    if [ -f "$GLOBAL_GINKO_DIR/auth.json" ]; then
        echo "    - auth.json (API key and user info)"
    fi
    if [ -f "$GLOBAL_GINKO_DIR/session_state.json" ]; then
        echo "    - session_state.json"
    fi
    if [ -f "$GLOBAL_GINKO_DIR/tool_history.jsonl" ]; then
        echo "    - tool_history.jsonl"
    fi
    if [ -f "$GLOBAL_GINKO_DIR/statusline.json" ]; then
        echo "    - statusline.json"
    fi
    if [ -d "$GLOBAL_GINKO_DIR/sync-logs" ]; then
        echo "    - sync-logs/"
    fi
else
    echo -e "  ${GREEN}~/.ginko/${NC} - Not found (already clean)"
fi

echo ""

# Check project directory
if [ -d "$PROJECT_GINKO_DIR" ]; then
    echo -e "  ${RED}.ginko/${NC} (project-level data)"
    if [ -d "$PROJECT_GINKO_DIR/sessions" ]; then
        echo "    - sessions/ (session logs and context)"
    fi
    if [ -d "$PROJECT_GINKO_DIR/context" ]; then
        echo "    - context/"
    fi
    if [ -d "$PROJECT_GINKO_DIR/graph" ]; then
        echo "    - graph/ (local graph config)"
    fi
    if [ -d "$PROJECT_GINKO_DIR/sprints" ]; then
        echo "    - sprints/"
    fi
    if [ -f "$PROJECT_GINKO_DIR/local.json" ]; then
        echo "    - local.json"
    fi
    if [ -f "$PROJECT_GINKO_DIR/state-cache.json" ]; then
        echo "    - state-cache.json"
    fi
    if [ -f "$PROJECT_GINKO_DIR/user-progress.json" ]; then
        echo "    - user-progress.json"
    fi
else
    echo -e "  ${GREEN}.ginko/${NC} - Not found (already clean)"
fi

echo ""

# Check if there's anything to delete
if [ ! -d "$GLOBAL_GINKO_DIR" ] && [ ! -d "$PROJECT_GINKO_DIR" ]; then
    echo -e "${GREEN}Environment is already clean. Nothing to reset.${NC}"
    echo ""
    exit 0
fi

# Confirm deletion
if [ "$FORCE_MODE" = false ]; then
    echo -e "${YELLOW}This action cannot be undone.${NC}"
    echo ""
    read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Aborted. No changes made.${NC}"
        exit 0
    fi
fi

echo ""
echo -e "${BLUE}Removing ginko data...${NC}"
echo ""

# Remove global directory
if [ -d "$GLOBAL_GINKO_DIR" ]; then
    echo -n "  Removing ~/.ginko/... "
    rm -rf "$GLOBAL_GINKO_DIR"
    echo -e "${GREEN}done${NC}"
fi

# Remove project directory
if [ -d "$PROJECT_GINKO_DIR" ]; then
    echo -n "  Removing .ginko/... "
    rm -rf "$PROJECT_GINKO_DIR"
    echo -e "${GREEN}done${NC}"
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Local environment reset complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Next steps for UAT testing:"
echo "  1. Run 'ginko login' to authenticate"
echo "  2. Run 'ginko init' to initialize the project"
echo "  3. Run 'ginko start' to begin a session"
echo ""
