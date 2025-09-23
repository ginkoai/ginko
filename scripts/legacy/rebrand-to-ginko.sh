#!/bin/bash
# @fileType: script
# @status: legacy
# @updated: 2025-09-22
# @tags: [rebrand, legacy, migration, text-replacement, contextmcp]
# @related: [rebrand.sh]
# @priority: low
# @complexity: medium
# @dependencies: [bash, sed, find, git]
# @description: Legacy script for rebranding from ContextMCP to Ginko - completed migration

# Ginko Rebrand Script
# Updates all references from ContextMCP to Ginko

echo "🏗️ Starting Ginko rebrand..."

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backup important files
echo -e "${YELLOW}Creating backups...${NC}"
cp package.json package.json.backup
cp README.md README.md.backup

# Function to update files
update_file() {
    local file=$1
    if [[ -f "$file" ]]; then
        # Replace ContextMCP with Ginko (preserving case)
        sed -i '' 's/ContextMCP/Ginko/g' "$file"
        sed -i '' 's/contextMCP/ginko/g' "$file"
        sed -i '' 's/contextmcp/ginko/g' "$file"
        sed -i '' 's/CONTEXTMCP/GINKO/g' "$file"
        
        # Update specific product references
        sed -i '' 's/Context MCP/Ginko/g' "$file"
        sed -i '' 's/context-mcp/ginko/g' "$file"
        
        echo -e "${GREEN}✓${NC} Updated $file"
    fi
}

# Update package files
echo -e "\n${YELLOW}Updating package files...${NC}"
update_file "package.json"
update_file "package-lock.json"
update_file "README.md"
update_file "CLAUDE.md"

# Update documentation
echo -e "\n${YELLOW}Updating documentation...${NC}"
find docs -name "*.md" -type f | while read -r file; do
    update_file "$file"
done

# Update source code
echo -e "\n${YELLOW}Updating source code...${NC}"
find src -name "*.ts" -type f | while read -r file; do
    update_file "$file"
done

# Update dashboard
echo -e "\n${YELLOW}Updating dashboard...${NC}"
find dashboard/src -name "*.tsx" -o -name "*.ts" | while read -r file; do
    update_file "$file"
done

# Update website
echo -e "\n${YELLOW}Updating marketing website...${NC}"
update_file "website/index.html"
update_file "website/styles.css"
update_file "website/script.js"

# Update configuration files
echo -e "\n${YELLOW}Updating configuration files...${NC}"
update_file "tsconfig.json"
update_file "vercel.json"
update_file ".mcp.json"
update_file "claude-config.json"

# Update test files
echo -e "\n${YELLOW}Updating test files...${NC}"
find test* -name "*.js" -o -name "*.ts" | while read -r file; do
    update_file "$file"
done

# Update SQL files
echo -e "\n${YELLOW}Updating database schemas...${NC}"
find database -name "*.sql" | while read -r file; do
    update_file "$file"
done

# Special cases that need manual review
echo -e "\n${YELLOW}Files that may need manual review:${NC}"
echo "- Environment variables in .env files"
echo "- OAuth redirect URLs"
echo "- Supabase project settings"
echo "- GitHub repository name"
echo "- NPM package name (if published)"
echo "- Domain configurations"

echo -e "\n${GREEN}✨ Rebrand script complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the changes with: git diff"
echo "2. Update environment variables"
echo "3. Update OAuth configurations"
echo "4. Update domain settings"
echo "5. Test thoroughly before committing"

# Show summary
echo -e "\n${YELLOW}Summary of changes:${NC}"
git diff --stat