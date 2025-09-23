#!/bin/bash
# @fileType: script
# @status: legacy
# @updated: 2025-09-22
# @tags: [rollback, monorepo, git, legacy, migration]
# @related: []
# @priority: low
# @complexity: low
# @dependencies: [git, bash]
# @description: Legacy script for rolling back monorepo migration - specific to past migration

echo "Rolling back monorepo migration..."
git checkout main
git branch -D feat/monorepo-migration
rm -rf packages
echo "✅ Rollback complete. Back on main branch."
echo "To rollback Vercel deployment: vercel rollback"