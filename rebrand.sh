#!/bin/bash

echo "🔄 Starting Ginko to Ginko rebranding..."

# Case-sensitive replacements
echo "Replacing Ginko with Ginko..."
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \
  -o -name "*.jsx" -o -name "*.json" -o -name "*.md" \
  -o -name "*.html" -o -name "*.css" -o -name "*.yml" -o -name "*.yaml" -o -name "*.sh" \) \
  -not -path "./node_modules/*" -not -path "./.git/*" \
  -exec sed -i '' 's/Ginko/Ginko/g' {} +

# Lowercase replacements
echo "Replacing ginko with ginko..."
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \
  -o -name "*.jsx" -o -name "*.json" -o -name "*.md" \
  -o -name "*.html" -o -name "*.css" -o -name "*.yml" -o -name "*.yaml" -o -name "*.sh" \) \
  -not -path "./node_modules/*" -not -path "./.git/*" \
  -exec sed -i '' 's/ginko/ginko/g' {} +

# Uppercase replacements
echo "Replacing GINKO with GINKO..."
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \
  -o -name "*.jsx" -o -name "*.json" -o -name "*.md" \
  -o -name "*.html" -o -name "*.css" -o -name "*.yml" -o -name "*.yaml" -o -name "*.sh" \) \
  -not -path "./node_modules/*" -not -path "./.git/*" \
  -exec sed -i '' 's/GINKO/GINKO/g' {} +

# Domain replacements
echo "Replacing ginko.ai with ginkoai.com..."
find . -type f -not -path "./node_modules/*" -not -path "./.git/*" \
  -exec sed -i '' 's/ginko\.ai/ginkoai.com/g' {} +

# Email replacements
echo "Replacing @ginko.ai with @ginkoai.com..."
find . -type f -not -path "./node_modules/*" -not -path "./.git/*" \
  -exec sed -i '' 's/@ginko\.ai/@ginkoai.com/g' {} +

# NPM package replacements
echo "Replacing @ginkoai with @ginkoai..."
find . -type f -not -path "./node_modules/*" -not -path "./.git/*" \
  -exec sed -i '' 's/@ginkoai/@ginkoai/g' {} +

echo "✅ Text replacements complete!"
