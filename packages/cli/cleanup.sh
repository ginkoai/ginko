#!/bin/bash

# Cleanup script for Simple Builder Pattern refactoring
echo "🧹 Cleaning up test files and organizing codebase..."

# Remove test files
echo "Removing test files..."
rm -f test-ai-integration.js
rm -f test-backlog-documentation-pipelines.js
rm -f test-pipeline-refactor.js
rm -f test-prd-architecture-pipelines.js

# Remove any compiled test files
rm -f dist/test*.js

# Check if there are any TypeScript build artifacts to clean
if [ -d "dist" ]; then
    echo "Cleaning dist directory..."
    find dist -name "*.js.map" -delete 2>/dev/null
fi

echo "✅ Cleanup complete!"

# Show current status
echo ""
echo "📊 Current project status:"
echo "=========================="
find src/commands -name "*-pipeline.ts" -type f | wc -l | xargs echo "Pipeline implementations:"
find src/commands -name "*-reflection.ts" -type f | wc -l | xargs echo "Original reflections:"
echo ""

echo "🎯 Refactored pipelines:"
find src/commands -name "*-pipeline.ts" -type f | while read file; do
    basename "$file" | sed 's/-pipeline.ts//' | sed 's/^/  • /'
done

echo ""
echo "✨ Ready for final commit!"