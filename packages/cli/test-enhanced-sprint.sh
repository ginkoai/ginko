#!/bin/bash

echo "Testing Enhanced Sprint Pipeline with Safe Defaults"
echo "===================================================="

# Test 1: Standard sprint with dependencies (default)
echo -e "\n1. Standard sprint planning with multiple PRDs:"
echo "   Command: ginko reflect --domain sprint \"PRD-A, PRD-B, PRD-C\""
# This will show dependency analysis by default

# Test 2: Sprint with capacity warning
echo -e "\n2. Overloaded sprint (should warn):"
echo "   Command: ginko reflect --domain sprint \"PRD-A, PRD-B, PRD-C, PRD-D, PRD-E\""
# Should trigger capacity warnings

# Test 3: Sprint with no dependency checking
echo -e "\n3. Quick sprint without dependency analysis:"
echo "   Command: ginko reflect --domain sprint \"PRD-A\" --nodep"
# Skips dependency analysis

# Test 4: Dry run mode for planning
echo -e "\n4. Dry run for what-if analysis:"
echo "   Command: ginko reflect --domain sprint \"PRD-A, PRD-B\" --dryrun"
# Shows plan without saving

# Test 5: Full analysis with all enhancements
echo -e "\n5. Complete analysis with WBS and traceability:"
echo "   Command: ginko reflect --domain sprint \"PRD-A\" --wbs --trace"
# Full work breakdown and traceability

# Test 6: Strict mode (should fail with warnings)
echo -e "\n6. Strict mode for CI/CD:"
echo "   Command: ginko reflect --domain sprint \"PRD-X, PRD-Y, PRD-Z\" --strict"
# Should fail if dependencies missing or overloaded

echo -e "\nTest commands ready. Run individually to see results."