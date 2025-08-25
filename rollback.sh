#!/bin/bash
echo "Rolling back monorepo migration..."
git checkout main
git branch -D feat/monorepo-migration
rm -rf packages
echo "✅ Rollback complete. Back on main branch."
echo "To rollback Vercel deployment: vercel rollback"