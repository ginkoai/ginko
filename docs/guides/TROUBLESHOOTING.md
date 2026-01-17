/**
 * @fileType: guide
 * @status: current
 * @updated: 2026-01-17
 * @tags: [troubleshooting, support, debugging, errors, beta]
 * @related: [QUICK-START.md, CLI-REFERENCE.md, BETA-README.md, FAQ.md]
 * @priority: critical
 * @complexity: medium
 */

# Troubleshooting Guide

Solutions to common issues with Ginko CLI, Dashboard, and integrations. If you don't find your answer here, check the [FAQ](./FAQ.md) or report an issue on [GitHub](https://github.com/chrispangg/ginko/issues).

---

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Authentication Problems](#authentication-problems)
3. [ginko start Issues](#ginko-start-issues)
4. [Session Logging Problems](#session-logging-problems)
5. [Sync Issues](#sync-issues)
6. [Dashboard Problems](#dashboard-problems)
7. [Graph and Search Issues](#graph-and-search-issues)
8. [Performance Tips](#performance-tips)
9. [Advanced Debugging](#advanced-debugging)
10. [Getting More Help](#getting-more-help)

---

## Installation Issues

### "Command not found: ginko"

**Symptom:** After installing, running `ginko` returns "command not found."

**Solution 1: Check npm global bin path**

```bash
# Find where npm installs global packages
npm config get prefix

# Check if that bin directory is in your PATH
echo $PATH | tr ':' '\n' | grep npm
```

**Solution 2: Add npm bin to PATH**

```bash
# For bash (~/.bashrc)
echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# For zsh (~/.zshrc)
echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Solution 3: Use npx as workaround**

```bash
npx @ginko/cli@beta --version
npx @ginko/cli@beta start
```

### "Permission denied" during install

**Symptom:** `npm install -g` fails with EACCES permission error.

**Solution 1: Fix npm permissions (recommended)**

```bash
# Create npm global directory in home folder
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'

# Add to PATH
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Reinstall
npm install -g @ginko/cli@beta
```

**Solution 2: Use nvm (Node Version Manager)**

```bash
# If you have nvm, global installs work without sudo
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
npm install -g @ginko/cli@beta
```

### "Node.js version not supported"

**Symptom:** Error about Node.js version compatibility.

**Solution:** Install Node.js 18 or later

```bash
# Check current version
node --version

# Using nvm to upgrade
nvm install 18
nvm use 18

# Or using Homebrew (macOS)
brew install node@18
```

### "Package not found: @ginko/cli@beta"

**Symptom:** npm cannot find the beta package.

**Solution:** Ensure you're using the correct registry

```bash
# Check npm registry
npm config get registry

# Should be: https://registry.npmjs.org/

# If not, reset it
npm config set registry https://registry.npmjs.org/
```

---

## Authentication Problems

### "Authentication failed" during login

**Symptom:** `ginko login` opens browser but then fails.

**Solution 1: Check browser popup blockers**

- Ensure popups are allowed for the OAuth URL
- Try a different browser
- Copy the URL manually if popup is blocked

**Solution 2: Force re-authentication**

```bash
# Clear existing auth and try again
ginko logout
ginko login --force
```

**Solution 3: Check GitHub permissions**

- Visit https://github.com/settings/applications
- Look for "Ginko" in authorized OAuth apps
- Revoke access and re-authorize

### "Invalid API key" errors

**Symptom:** Commands fail with API key errors after previously working.

**Solution 1: Regenerate API key**

```bash
ginko login --force
```

**Solution 2: Check auth file**

```bash
# View auth file location
cat ~/.ginko/auth.json

# If corrupted, delete and re-authenticate
rm ~/.ginko/auth.json
ginko login
```

**Solution 3: Use environment variable**

```bash
# Set API key directly (useful for CI/CD)
export GINKO_API_KEY=gk_your_key_here
ginko whoami
```

### OAuth callback port conflict

**Symptom:** OAuth callback fails with "address already in use."

**Solution:**

```bash
# Find process using port 9876 (default OAuth callback port)
lsof -i :9876

# Kill the process
kill -9 [PID]

# Try login again
ginko login
```

### "Not authenticated" when using CLI

**Symptom:** Commands fail even though you logged in.

**Solution: Verify authentication**

```bash
# Check if authenticated
ginko whoami

# If not, re-authenticate
ginko login
```

---

## ginko start Issues

### "ginko start" hangs or takes too long

**Symptom:** `ginko start` doesn't complete within 10 seconds.

**Expected behavior:**
- First run: 5-10 seconds (graph initialization)
- Subsequent runs: < 2 seconds

**Solution 1: Check network connectivity**

```bash
# Test API connectivity
curl -I https://app.ginkoai.com/api/health
```

**Solution 2: Clear session cache**

```bash
# Remove cached session data
rm -rf .ginko/sessions/*/cache/
ginko start
```

**Solution 3: Check for process issues**

```bash
# Look for zombie ginko processes
ps aux | grep ginko

# Kill any stuck processes
pkill -f "ginko"
```

**Solution 4: Verbose output for debugging**

```bash
export GINKO_LOG_LEVEL=debug
ginko start
```

### "No active project" error

**Symptom:** `ginko start` fails saying no project is configured.

**Solution 1: Initialize the project**

```bash
ginko init
```

**Solution 2: Reinitialize the graph**

```bash
ginko graph init --force
```

**Solution 3: Check .ginko directory exists**

```bash
ls -la .ginko/
# Should contain config.json and sessions/
```

### "Team context is critically stale" warning

**Symptom:** Warning about stale team context during `ginko start`.

**Solution:** Sync team context

```bash
ginko sync
```

This warning appears when:
- Never synced (first time setup)
- More than 7 days since last sync
- Team members have made significant updates

### Session log not created

**Symptom:** `.ginko/sessions/[user]/current-session-log.md` doesn't exist after start.

**Solution 1: Start with logging enabled (default)**

```bash
ginko start  # Logging enabled by default
```

**Solution 2: Check if accidentally disabled**

```bash
# Don't use --no-log unless intentional
ginko start --no-log  # This disables logging
```

---

## Session Logging Problems

### "ginko log" fails with error

**Symptom:** Logging command fails or shows error.

**Solution 1: Ensure session is active**

```bash
# Start a session first
ginko start

# Then log
ginko log "Your message" --category=fix
```

**Solution 2: Check message content**

```bash
# Messages should be non-empty
ginko log "Meaningful description of what happened"

# Avoid very short messages
ginko log "Fixed it"  # May trigger quality warning
```

**Solution 3: Verify event file is writable**

```bash
ls -la .ginko/sessions/*/current-events.jsonl
# Should be writable by your user
```

### Events not syncing to dashboard

**Symptom:** Logged events don't appear in the dashboard.

**Expected delay:** Up to 30 seconds for event sync.

**Solution 1: Check sync status**

```bash
ginko status
```

**Solution 2: Force sync**

```bash
ginko sync --force
```

**Solution 3: Check API connectivity**

```bash
export GINKO_LOG_LEVEL=debug
ginko log "test message"
# Look for API response in output
```

### Quality feedback always shows "Needs improvement"

**Symptom:** Log messages consistently rated poorly.

**Solution:** Write more detailed messages following the WHAT + WHY + HOW pattern:

```bash
# Bad (too short)
ginko log "Fixed bug"

# Good (includes context)
ginko log "Fixed authentication timeout by increasing JWT expiry from 1h to 24h. Root cause: mobile users kept getting logged out mid-session." \
  --category=fix --impact=high
```

---

## Sync Issues

### "ginko sync" fails with error

**Symptom:** Sync command fails or times out.

**Solution 1: Check network connectivity**

```bash
curl -I https://app.ginkoai.com/api/health
```

**Solution 2: Try dry run first**

```bash
ginko sync --dry-run
# Review what would sync before actually syncing
```

**Solution 3: Sync specific types**

```bash
# If full sync fails, try syncing specific node types
ginko sync --type ADR
ginko sync --type Pattern
```

### Sync conflicts between CLI and Dashboard

**Symptom:** Local files differ from dashboard after sync.

**Solution 1: Preview changes first**

```bash
ginko sync --dry-run
```

**Solution 2: Force overwrite from graph**

```bash
ginko sync --force
# This overwrites local files with graph versions
```

**Solution 3: Manual resolution**

```bash
# Keep your local changes, don't sync
ginko sync --no-commit

# Review files manually, then commit
git diff
git add .
git commit -m "Resolved sync conflicts"
```

### "Unsynced nodes" notification won't clear

**Symptom:** Dashboard shows unsynced nodes even after syncing.

**Solution:**

```bash
# Full sync with force flag
ginko sync --force

# Refresh dashboard (hard refresh)
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
```

---

## Dashboard Problems

### Dashboard won't load

**Symptom:** https://app.ginkoai.com shows blank page or error.

**Solution 1: Clear browser cache**

```bash
# Hard refresh
Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows/Linux)
```

**Solution 2: Try incognito/private window**

**Solution 3: Check browser console for errors**

- Open Developer Tools (F12 or Cmd+Option+I)
- Check Console tab for error messages
- Report any errors in GitHub issues

### Login redirects but doesn't complete

**Symptom:** OAuth succeeds but dashboard shows logged out.

**Solution 1: Clear cookies for app.ginkoai.com**

**Solution 2: Try different browser**

**Solution 3: Check for third-party cookie blocking**

- Some browsers block third-party cookies by default
- Ensure cookies are allowed for ginkoai.com

### Graph view is empty

**Symptom:** Graph explorer shows no nodes.

**Solution 1: Check project is initialized**

```bash
ginko graph status
```

**Solution 2: Reinitialize graph**

```bash
ginko graph init --force
```

**Solution 3: Check filters**

- In dashboard, ensure no filters are hiding nodes
- Click "Clear Filters" to reset

### Dashboard is slow or unresponsive

**Symptom:** Dashboard takes long to load or freezes.

**Solution 1: Use filters to reduce visible nodes**

- Filter by node type
- Use search to narrow results

**Solution 2: Try a different browser**

- Chrome is recommended for best performance

**Solution 3: Clear browser storage**

- Open Developer Tools > Application > Storage
- Click "Clear site data"

---

## Graph and Search Issues

### "ginko graph query" returns no results

**Symptom:** Search returns empty even for known content.

**Solution 1: Lower similarity threshold**

```bash
ginko graph query "your search" --limit 20
# Default threshold might be too strict
```

**Solution 2: Try different query phrasing**

```bash
# Try natural language variations
ginko graph query "authentication patterns"
ginko graph query "how do we handle auth"
ginko graph query "login flow"
```

**Solution 3: Check graph has content**

```bash
ginko graph status
# Verify node counts > 0
```

### Graph health shows issues

**Symptom:** `ginko graph health` shows warnings or errors.

**Solution 1: Wait for indexing**

After creating many nodes, embeddings may take a few minutes to generate.

**Solution 2: Force reindex**

```bash
# Contact support for reindexing if health issues persist
```

### Search returns irrelevant results

**Symptom:** Results don't match the query intent.

**Solution:** Be more specific in queries

```bash
# Too vague
ginko graph query "problem"

# Better
ginko graph query "database connection timeout issues"
```

---

## Performance Tips

### Speed up "ginko start"

```bash
# Ensure you're not on legacy mode
ginko start  # Uses fast event-based loading by default

# Avoid --strategic flag unless needed
# ginko start --strategic  # This is slower
```

### Reduce sync time

```bash
# Sync only what you need
ginko sync --type ADR  # Instead of syncing everything

# Check what needs syncing first
ginko sync --dry-run
```

### Optimize dashboard performance

1. **Use filters** - Don't load all nodes at once
2. **Paginate** - Use pagination controls for large datasets
3. **Search first** - Use search to narrow to relevant nodes
4. **Close detail panel** - Reduce DOM complexity

### Reduce CLI memory usage

For very large projects with many events:

```bash
# Archive old sessions periodically
ginko handoff "Session complete"

# This moves events to archive, reducing active session size
```

---

## Advanced Debugging

### Enable debug logging

```bash
export GINKO_LOG_LEVEL=debug
ginko [command]
```

### View raw API requests

```bash
export GINKO_LOG_LEVEL=debug
ginko graph query "test" 2>&1 | grep -i "request\|response"
```

### Check local file state

```bash
# View session configuration
cat .ginko/config.json

# View recent events
tail -20 .ginko/sessions/*/current-events.jsonl

# View session log
cat .ginko/sessions/*/current-session-log.md
```

### Test API connectivity

```bash
# Health check
curl https://app.ginkoai.com/api/health

# With authentication
curl -H "Authorization: Bearer $(cat ~/.ginko/auth.json | jq -r .apiKey)" \
  https://app.ginkoai.com/api/user
```

### Report diagnostic information

When filing a bug report, include:

```bash
# System info
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "OS: $(uname -a)"
echo "CLI: $(ginko --version)"

# Configuration
cat .ginko/config.json

# Recent errors
export GINKO_LOG_LEVEL=debug
ginko [failing command] 2>&1 | tail -50
```

---

## Getting More Help

### Self-Service Resources

1. **This troubleshooting guide** - You're here!
2. **[FAQ](./FAQ.md)** - Common questions answered
3. **[CLI Reference](./CLI-REFERENCE.md)** - All commands documented
4. **[Quick Start](./QUICK-START.md)** - Getting started tutorial

### Community Support

- **Discord**: https://discord.gg/ginko (real-time community help)
- **GitHub Discussions**: https://github.com/chrispangg/ginko/discussions

### Direct Support

- **GitHub Issues**: https://github.com/chrispangg/ginko/issues (bugs and features)
- **Email**: chris@watchhill.ai (private/account issues)

### When Contacting Support

Include:
1. What you were trying to do
2. What happened (exact error message)
3. What you expected to happen
4. CLI version (`ginko --version`)
5. Node version (`node --version`)
6. Operating system

---

## Common Error Reference

| Error | Likely Cause | Quick Fix |
|-------|--------------|-----------|
| `Command not found: ginko` | PATH not configured | See [Installation Issues](#installation-issues) |
| `Authentication failed` | Expired token | `ginko login --force` |
| `No active project` | Not initialized | `ginko init` |
| `Network error` | Connectivity issue | Check internet, firewall |
| `Rate limited` | Too many requests | Wait 60 seconds |
| `Permission denied` | File permissions | Check `.ginko/` ownership |
| `Invalid JSON` | Corrupted config | Delete and reinit |
| `Timeout` | Slow network/server | Retry, check status page |

---

*Last updated: 2026-01-17*
*For CLI version: 1.5.x*
