# Cursor IDE Integration Guide

## Overview
Ginko provides deep integration with Cursor IDE through multiple approaches, enabling seamless context management and session handoffs.

## Integration Methods

### 1. Cursor Custom Mode (Recommended)

The most powerful integration uses Cursor's Custom Mode feature (beta).

#### Setup
1. Enable Custom Modes in Cursor Settings → Chat → Custom Modes (Beta)
2. In chat, click mode selector → "Add custom mode"
3. Configure with these settings:
   - **Name**: Ginko
   - **Model**: Auto or GPT 4.1 (free) / Claude 3.5 (pro)
   - **Tools**: Enable all (Search, Edit, Run)
   - **Auto-run**: ON (for automatic command execution)

#### Instructions Template
```
You are in Ginko mode for context-aware development with session handoffs.

ALWAYS:
1. Check .ginko/sessions/*/current.md for previous session context
2. Reference .ginko/context/modules/*.md for project patterns
3. Run "ginko start" when beginning work
4. Suggest "ginko handoff [message]" before stopping work
5. Use "ginko vibecheck" when direction is unclear
6. Maintain continuity by reading handoffs from previous sessions
```

#### Usage
- Select "Ginko" mode in chat
- Commands auto-execute without prompts
- Context loads automatically from `.ginko/`

### 2. .cursorrules File

For basic integration without Custom Modes:

```bash
ginko init --model=cursor
```

This generates a concise `.cursorrules` file that:
- References `.ginko/` for detailed context
- Saves tokens with external context storage
- Works with Cursor's file indexing

### 3. VS Code Extension

The Ginko VS Code extension (`packages/vscode-extension/`) works in Cursor:

```bash
# Build and package
cd packages/vscode-extension
npm install
npm run compile
vsce package

# Install in Cursor
cursor --install-extension ginko-vscode-0.1.0.vsix
```

Features:
- Command palette integration
- Extension settings for auto-context
- Works alongside Cursor's features

## Model Support

### Free Users
- **GPT 4.1**: Full ginko support
- **Auto**: Cursor selects best available model

### Pro Users ($20/month)
- **Claude 3.5 Sonnet**: Optimal for ginko
- **All premium models**: Full compatibility

## Workflow

### Starting a Session
```
# In Ginko mode chat
Start a new session
```
Automatically runs `ginko start` and loads previous context.

### Creating Handoffs
```
Save my progress on [description]
```
Runs `ginko handoff` with your message.

### Quick Realignment
```
I'm feeling lost
```
Triggers vibecheck for direction validation.

## Troubleshooting

### "Run command?" Prompts
Enable Auto-run in Custom Mode settings or use "Use Allowlist" option.

### Missing .ginko Directory
Initialize in project root:
```bash
ginko init --model=cursor
```

### Path Resolution Errors
Harmless - Cursor trying to make paths clickable. Commands still execute.

## Architecture

```
ginko/
├── packages/
│   ├── cli/                 # Core CLI with Cursor adapter
│   ├── vscode-extension/    # VS Code/Cursor extension
│   ├── cursor-agent/        # Cursor agent attempt (deprecated)
│   └── cursor-mcp/          # MCP server (future)
└── .ginko/                  # Context storage (git-tracked)
```

## Key Files
- `packages/cli/src/adapters/cursor-adapter.ts` - Cursor-specific adapter
- `packages/vscode-extension/` - Universal IDE extension
- `.cursorrules` - Generated Cursor instructions

## Benefits
- **Session continuity** across context switches
- **Git-native storage** for team collaboration
- **Token-efficient** with external context
- **Model-agnostic** works with any AI model
- **Auto-execution** of ginko commands