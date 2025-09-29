# WSL2 Setup Checklist for Ginko Testing

## Chris's Parallel Tasks While Claude Works on Templates

### 1. Windows VM Setup (if using Parallels)
- [ ] Install Windows 10/11 Pro in Parallels (Home edition has WSL2 limitations)
- [ ] Ensure VM has at least 8GB RAM allocated
- [ ] Enable virtualization in Parallels VM settings

### 2. WSL2 Installation
```powershell
# In PowerShell as Administrator
wsl --install

# This installs Ubuntu by default
# Restart when prompted
```

### 3. Initial WSL2 Configuration
```bash
# After restart, open Ubuntu from Start menu
# Set up your Linux username and password

# Update packages
sudo apt update && sudo apt upgrade -y
```

### 4. Development Tools Installation

#### Git
```bash
# Git with your config
sudo apt install git -y
git config --global user.name "Chris Norton"
git config --global user.email "chris@ginko.ai"
```

#### GitHub CLI
```bash
# GitHub CLI for authentication
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh -y

# Authenticate
gh auth login
```

#### Node.js (v18+)
```bash
# Using NodeSource repository for latest
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version
npm --version
```

#### Python (usually pre-installed)
```bash
# Check Python
python3 --version

# Install pip if needed
sudo apt install python3-pip -y
```

### 5. Clone Ginko for Testing
```bash
# In WSL2 Ubuntu
cd ~
git clone https://github.com/ginko/ginko.git
cd ginko

# Checkout our feature branch
git checkout feature/git-native-handoffs
```

### 6. Test Ginko Commands
```bash
# Test our new CLI
./ginko status
./ginko handoff

# Check file structure
ls -la .ginko/
```

### 7. VSCode Integration (Optional but Recommended)
- Install VSCode on Windows
- Install "WSL" extension in VSCode
- Open WSL2 folder with: `code .` from Ubuntu terminal

## What to Test Specifically

1. **Path Handling**: Do our scripts work with WSL2 paths?
2. **Git Config**: Does email detection work?
3. **File Permissions**: Any issues with hidden folders?
4. **Editor Opening**: Does `./ginko handoff` open correctly?

## Known WSL2 Gotchas to Watch For

1. **Line Endings**: Git may complain about CRLF vs LF
   ```bash
   git config --global core.autocrlf input
   ```

2. **File Performance**: WSL2 accessing Windows files is slow
   - Keep project files in WSL2 filesystem (~/), not /mnt/c/

3. **Network**: WSL2 has its own IP address
   - May affect server connections

4. **PATH Issues**: Windows paths vs Linux paths
   - Our scripts should handle this, but test carefully

## Quick Test Script
Save this as `test-ginko-wsl2.sh`:
```bash
#!/bin/bash
echo "Testing Ginko on WSL2..."
echo "=========================="
echo "Git Config:"
git config user.name
git config user.email
echo ""
echo "Node Version:"
node --version
echo ""
echo "Ginko Status:"
./ginko status
echo ""
echo "Directory Structure:"
ls -la .ginko/
echo "=========================="
echo "If all above worked, WSL2 is ready!"
```

---

## Timeline

**While you set this up** (30-45 minutes):
- Claude will implement templates
- Claude will create WSL2-specific documentation

**When you're ready**:
- We'll test everything on your WSL2
- Document any issues found
- Create fixes if needed

This parallel work maximizes our efficiency! 🚀