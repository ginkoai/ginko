# Ginko × GitHub Copilot Setup (Preview)

This is a safe preview. No existing files were modified. Files were written to `.ginko/generated/`.

## Setup Options

### Option 1: Repository-wide Instructions (Recommended)
1. Copy `.ginko/generated/copilot-instructions.md` to `.github/copilot-instructions.md`
2. Commit to repository for team-wide consistency
3. All team members will automatically get these instructions

### Option 2: Workspace Settings (Local)
1. Copy settings from `.ginko/generated/vscode-settings.json` to `.vscode/settings.json`
2. Merge with existing settings if the file already exists
3. Optionally commit to repository for team consistency

### Option 3: Apply Automatically
Run `ginko init-copilot --apply` to:
- Create `.github/copilot-instructions.md` 
- Update `.vscode/settings.json` with Copilot settings
- Commit changes to repository

## Key Copilot Settings Applied
- Auto-completions optimized for your project
- Chat instructions tailored to your codebase
- Code review suggestions configured
- Custom patterns for your tech stack

## Testing Your Setup
1. Open VS Code with GitHub Copilot extension installed
2. Test inline suggestions with comments like `// TODO: `
3. Open Copilot Chat and ask about your project conventions
4. Check that suggestions follow your team's patterns

## Reverting Changes
Run `ginko uninstall-copilot` to remove all Copilot configurations
