# Ginko Agent for Cursor

A custom Cursor Agent that provides git-native context management and session handoffs.

## Installation

### Method 1: Direct Installation
```bash
cd packages/cursor-agent
cursor --install-agent .
```

### Method 2: From Cursor
1. Open Cursor Settings
2. Go to "Agents" section
3. Click "Add Custom Agent"
4. Browse to `packages/cursor-agent/agent.json`

## Usage

Once installed, the Ginko agent appears in Cursor chat:

```
@ginko start              # Start a new session
@ginko handoff fixed bug  # Save progress
@ginko vibecheck          # Quick realignment
@ginko context            # List context modules
```

## How It Works

The agent:
1. Executes ginko CLI commands
2. Reads from `.ginko/` directory
3. Provides context-aware responses
4. Maintains session continuity

## Features

- **Session Management**: Start and resume sessions
- **Handoffs**: Save progress with git-native storage
- **Context Loading**: Access project-specific modules
- **Vibecheck**: Quick realignment when stuck

## Requirements

- Cursor IDE
- Ginko CLI installed (`npm install -g @ginkoai/cli`)
- Project with `.ginko/` directory initialized