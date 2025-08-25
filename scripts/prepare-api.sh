#!/bin/bash
# Prepare API for Vercel deployment by copying dependencies

echo "Preparing API for deployment..."

# Create _lib directory in api
mkdir -p api/_lib

# Copy built packages
echo "Copying mcp-server dist..."
cp -r packages/mcp-server/dist/* api/_lib/

echo "Copying shared dist..."
cp -r packages/shared/dist/* api/_lib/

echo "API preparation complete!"
ls -la api/_lib/