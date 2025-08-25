#!/bin/bash

# ADR Creation Helper Script
# Ensures unique numbering and proper template usage

set -e

# Configuration
DOCS_DIR="docs/architecture"
TEMPLATE_FILE="$DOCS_DIR/ADR-TEMPLATE.md"
INDEX_FILE="$DOCS_DIR/ADR-INDEX.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "$TEMPLATE_FILE" ]; then
    print_error "ADR template not found. Please run this script from the project root."
    exit 1
fi

# Get the next available ADR number
get_next_adr_number() {
    local highest=0
    
    # Find highest existing ADR number
    for file in $DOCS_DIR/ADR-*.md; do
        if [[ -f "$file" && "$file" != *"TEMPLATE"* && "$file" != *"INDEX"* ]]; then
            # Extract number from filename
            number=$(basename "$file" | sed 's/ADR-\([0-9]*\).*/\1/' | sed 's/^0*//')
            if [[ "$number" =~ ^[0-9]+$ ]] && [ "$number" -gt "$highest" ]; then
                highest=$number
            fi
        fi
    done
    
    echo $((highest + 1))
}

# Format number with leading zeros
format_adr_number() {
    printf "%03d" "$1"
}

# Validate title
validate_title() {
    local title="$1"
    
    if [ -z "$title" ]; then
        print_error "Title cannot be empty"
        return 1
    fi
    
    if [ ${#title} -lt 5 ]; then
        print_error "Title must be at least 5 characters long"
        return 1
    fi
    
    # Convert to kebab-case
    local kebab_title=$(echo "$title" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
    echo "$kebab_title"
}

# Create the ADR file
create_adr_file() {
    local number="$1"
    local title="$2"
    local kebab_title="$3"
    local filename="$DOCS_DIR/ADR-$number-$kebab_title.md"
    
    # Copy template
    cp "$TEMPLATE_FILE" "$filename"
    
    # Replace placeholders
    sed -i '' "s/ADR-XXX/$number/g" "$filename"
    sed -i '' "s/\[Decision Title\]/$title/g" "$filename"
    sed -i '' "s/YYYY-MM-DD/$(date +%Y-%m-%d)/g" "$filename"
    
    echo "$filename"
}

# Update the index file
update_index() {
    local number="$1"
    local title="$2"
    local kebab_title="$3"
    local date="$(date +%Y-%m-%d)"
    
    # Create the new index entry
    local new_entry="| [ADR-$number](ADR-$number-$kebab_title.md) | $title | Draft | $date | [tags] |"
    
    # Find the last entry in the table and add after it
    if grep -q "| \[ADR-" "$INDEX_FILE"; then
        # Add after the last ADR entry
        sed -i '' "/| \[ADR-.*|$/a\\
$new_entry
" "$INDEX_FILE"
    else
        print_error "Could not update index automatically. Please add the following line manually:"
        echo "$new_entry"
    fi
    
    # Update the "Next Available Number" line
    local next_number=$(format_adr_number $(($(echo "$number" | sed 's/^0*//') + 1)))
    sed -i '' "s/Next Available Number: ADR-[0-9]*/Next Available Number: ADR-$next_number/" "$INDEX_FILE"
}

# Main script
main() {
    print_info "🏗️  Ginko ADR Creation Helper"
    echo
    
    # Get title from user
    if [ -z "$1" ]; then
        read -p "Enter ADR title: " title
    else
        title="$1"
    fi
    
    # Validate and format title
    kebab_title=$(validate_title "$title")
    if [ $? -ne 0 ]; then
        exit 1
    fi
    
    # Get next ADR number
    next_number=$(get_next_adr_number)
    formatted_number=$(format_adr_number "$next_number")
    
    print_info "Next available ADR number: $formatted_number"
    print_info "Formatted title: $kebab_title"
    
    # Confirm with user
    echo
    read -p "Create ADR-$formatted_number-$kebab_title.md? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        print_warning "Cancelled by user"
        exit 0
    fi
    
    echo
    print_status "Creating ADR-$formatted_number..."
    
    # Create the ADR file
    filename=$(create_adr_file "$formatted_number" "$title" "$kebab_title")
    print_status "Created: $filename"
    
    # Update the index
    update_index "$formatted_number" "$title" "$kebab_title"
    print_status "Updated: $INDEX_FILE"
    
    echo
    print_status "ADR created successfully!"
    print_info "Next steps:"
    echo "  1. Edit the ADR file: $filename"
    echo "  2. Fill out all required sections"
    echo "  3. Change status from 'draft' to 'proposed' when ready for review"
    echo "  4. Commit both the ADR and updated index together"
    echo
    print_info "Opening ADR file in default editor..."
    
    # Open in default editor (if available)
    if command -v code >/dev/null 2>&1; then
        code "$filename"
    elif command -v vim >/dev/null 2>&1; then
        vim "$filename"
    else
        print_info "Please open $filename in your preferred editor"
    fi
}

# Run main function
main "$@"