#!/bin/bash

# Ginko - Generate Git-Native Session Handoff
# This script generates a handoff from the current session state

# Get the user's email-based directory
EMAIL=$(git config user.email)
NAME=$(git config user.name)
SAFE_USERNAME=$(echo "$EMAIL" | sed 's/@/-at-/g' | sed 's/\./-/g')
HANDOFF_PATH=".ginko/sessions/$SAFE_USERNAME/session-handoff.md"
TEMPLATE_PATH=".ginko/templates/default.md"

# Create user directory if it doesn't exist
mkdir -p ".ginko/sessions/$SAFE_USERNAME"
mkdir -p ".ginko/sessions/$SAFE_USERNAME/archive"

# Get current git state
BRANCH=$(git branch --show-current)
LAST_COMMIT=$(git log -1 --format="%h %s" 2>/dev/null || echo "No commits yet")
MODIFIED_FILES=$(git status --porcelain | wc -l | tr -d ' ')
STAGED_FILES=$(git diff --cached --name-only | wc -l | tr -d ' ')

# Get session timing
DATE=$(date +%Y-%m-%d)
TIME=$(date "+%H:%M")
SESSION_ID="${BRANCH}-$(date +%s)"

# Function to generate handoff content
generate_handoff() {
    cat << EOF
# Session Handoff - Git-Native Implementation

**Date**: $DATE  
**Time**: $TIME  
**Session ID**: $SESSION_ID  
**Author**: Claude + $NAME  
**Email**: $EMAIL  
**Branch**: $BRANCH  

## 🎯 Current Focus

[Claude will fill this with current session context]

## 📊 Session Status

### Git State
- **Current Branch**: $BRANCH
- **Last Commit**: $LAST_COMMIT
- **Modified Files**: $MODIFIED_FILES
- **Staged Files**: $STAGED_FILES

### Work Completed
[Claude will list completed tasks]

### In Progress
[Claude will list current tasks]

### Next Steps
[Claude will suggest next actions]

## 💡 Key Decisions & Rationale

[Claude will document important decisions made during the session]

## 🔧 Technical Context

[Claude will provide technical details and context]

## 📁 Files Modified

\`\`\`
$(git status --short)
\`\`\`

## ⚠️ Critical Items

[Claude will note any important warnings or considerations]

## 🔄 Session State for Resume

**Branch**: $BRANCH  
**Working Directory**: $(pwd)  
**Next Action**: [Claude will specify next action]

---

**To Resume**: 
\`\`\`bash
git checkout $BRANCH
cd $(pwd)
# [Claude will add specific resume instructions]
\`\`\`

*Generated: $(date "+%Y-%m-%d %H:%M:%S")*
EOF
}

# Check if handoff already exists
if [ -f "$HANDOFF_PATH" ]; then
    echo "📝 Existing handoff found. Options:"
    echo "   1) Overwrite current handoff"
    echo "   2) Archive current and create new"
    echo "   3) Cancel"
    read -p "Choose [1-3]: " choice
    
    case $choice in
        1)
            echo "📝 Overwriting existing handoff..."
            ;;
        2)
            # Archive existing handoff
            ARCHIVE_DIR=".ginko/sessions/$SAFE_USERNAME/archive"
            mkdir -p "$ARCHIVE_DIR"
            ARCHIVE_NAME="$(date +%Y-%m-%d-%H%M)-session.md"
            mv "$HANDOFF_PATH" "$ARCHIVE_DIR/$ARCHIVE_NAME"
            echo "📦 Archived to: $ARCHIVE_DIR/$ARCHIVE_NAME"
            ;;
        3)
            echo "❌ Cancelled"
            exit 0
            ;;
        *)
            echo "❌ Invalid choice"
            exit 1
            ;;
    esac
fi

# Generate the handoff
echo "🔄 Generating handoff..."
generate_handoff > "$HANDOFF_PATH"

echo "✅ Handoff generated at: $HANDOFF_PATH"
echo ""
echo "📊 Git status:"
if git diff --name-only | grep -q "$HANDOFF_PATH"; then
    echo "   ✏️  Handoff created (not staged)"
    echo ""
    echo "💡 Next steps:"
    echo "   1. Review/edit: ./ginko handoff"
    echo "   2. Stage: git add $HANDOFF_PATH"
    echo "   3. Commit: git commit -m \"Session: [your summary]\""
else
    echo "   ✅ Handoff is tracked"
fi

# Offer to open in editor
read -p "📝 Open handoff in editor? [Y/n]: " open_choice
if [[ "$open_choice" != "n" && "$open_choice" != "N" ]]; then
    .ginko/bin/open-handoff.sh
fi