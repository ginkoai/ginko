#!/bin/bash
# Reset UAT test project directory
# Usage: ./scripts/reset-test-project.sh -old /path/to/old -new /path/to/new

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
OLD_DIR=""
NEW_DIR=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -old)
      OLD_DIR="$2"
      shift 2
      ;;
    -new)
      NEW_DIR="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 -old OLD_DIR_NAME -new NEW_DIR_NAME"
      echo ""
      echo "Options:"
      echo "  -old DIR    Directory to remove (optional)"
      echo "  -new DIR    New directory to create (required)"
      echo "  -h, --help  Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0 -old /tmp/test-old -new /tmp/test-new"
      echo "  $0 -new /tmp/test-new"
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown parameter: $1${NC}"
      echo "Use -h or --help for usage information"
      exit 1
      ;;
  esac
done

# Validate required parameters
if [ -z "$NEW_DIR" ]; then
  echo -e "${RED}Error: -new parameter is required${NC}"
  echo "Use -h or --help for usage information"
  exit 1
fi

# Remove old directory if specified
if [ -n "$OLD_DIR" ]; then
  if [ -d "$OLD_DIR" ]; then
    echo -e "${YELLOW}🗑️  Removing old directory: $OLD_DIR${NC}"
    rm -rf "$OLD_DIR"
    echo -e "${GREEN}✓ Removed${NC}"
  else
    echo -e "${YELLOW}⚠️  Old directory not found (skipping): $OLD_DIR${NC}"
  fi
fi

# Check if new directory already exists
if [ -d "$NEW_DIR" ]; then
  echo -e "${RED}Error: New directory already exists: $NEW_DIR${NC}"
  echo -e "${YELLOW}Remove it first or use -old to remove automatically${NC}"
  exit 1
fi

# Create new directory
echo -e "${BLUE}📁 Creating new directory: $NEW_DIR${NC}"
mkdir -p "$NEW_DIR"
cd "$NEW_DIR"

# Initialize git
echo -e "${BLUE}🔧 Initializing git repository...${NC}"
git init

# Configure git user (use existing config or defaults)
git config user.name "Test User" 2>/dev/null || true
git config user.email "test@example.com" 2>/dev/null || true

# Create README.md
echo -e "${BLUE}📄 Creating README.md...${NC}"
cat > README.md << 'EOF'
# UAT Test Project

This is a test project for Ginko CLI UAT testing.

## Setup

```bash
ginko login
ginko init
ginko start
```

## Testing

- Verify `start` command triggers `ginko start` immediately
- Check charter creation prompt after first `ginko start`
- Test graph initialization integration
EOF

# Initial commit
echo -e "${BLUE}💾 Creating initial commit...${NC}"
git add .
git commit -m "Initial commit"

# Summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Test project ready!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Location:${NC} $NEW_DIR"
echo -e "${BLUE}Files:${NC}"
ls -la
echo ""
echo -e "${BLUE}Git status:${NC}"
git log --oneline -1
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  cd $NEW_DIR"
echo -e "  ginko init"
echo -e "  ginko start"
echo ""
