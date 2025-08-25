# WSL2 Test Onboarding Guide - Private Repository

## Setting Up Test Accounts for Private Repo Access

### Option 1: GitHub Collaborator Access (Recommended for Testing)

#### On Your Main GitHub Account:
1. Go to https://github.com/GinkoAI/Ginko/settings/access
2. Click "Add people" 
3. Add your test account(s) as collaborators
4. They'll receive an invitation email

#### In WSL2 with Test Account:
```bash
# Configure test identity
git config --global user.name "Test Developer"
git config --global user.email "testdev@example.com"

# Authenticate with GitHub (choose one method):

# Method A: GitHub CLI (Easiest)
gh auth login
# Choose: GitHub.com → HTTPS → Login with web browser
# Use test account credentials

# Clone with gh
gh repo clone GinkoAI/Ginko

# Method B: Personal Access Token
# 1. Login to GitHub as test user
# 2. Go to Settings → Developer settings → Personal access tokens → Tokens (classic)
# 3. Generate new token with 'repo' scope
# 4. Clone with token
git clone https://TEST_USER:TOKEN@github.com/GinkoAI/Ginko.git

# Method C: SSH Key
ssh-keygen -t ed25519 -C "testdev@example.com"
cat ~/.ssh/id_ed25519.pub
# Add this key to test account's GitHub settings
git clone git@github.com:GinkoAI/Ginko.git
```

### Option 2: Fine-Grained Personal Access Token (More Secure)

#### Create Repository-Specific Token:
1. On your main account: GitHub Settings → Developer settings
2. Personal access tokens → Fine-grained tokens
3. Generate new token:
   - Repository access: Select "GinkoAI/Ginko"
   - Permissions: Contents (Read), Metadata (Read)
   - Expiration: 7 days (for testing)

#### Share Token with Test Environment:
```bash
# In WSL2
export GITHUB_TOKEN="github_pat_..."

# Clone using token
git clone https://oauth2:${GITHUB_TOKEN}@github.com/GinkoAI/Ginko.git

# Or configure git to use token
git config --global url."https://oauth2:${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
git clone https://github.com/GinkoAI/Ginko.git
```

### Option 3: Deploy Key (Read-Only Access)

#### Create Deploy Key:
```bash
# In WSL2
ssh-keygen -t ed25519 -f ~/.ssh/ginko_deploy_key -C "wsl2-test"
cat ~/.ssh/ginko_deploy_key.pub
```

#### Add to Repository:
1. Go to https://github.com/GinkoAI/Ginko/settings/keys
2. Add deploy key (read-only)
3. Paste the public key

#### Configure SSH:
```bash
# ~/.ssh/config
Host github-ginko
    HostName github.com
    User git
    IdentityFile ~/.ssh/ginko_deploy_key

# Clone with custom host
git clone git@github-ginko:GinkoAI/Ginko.git
```

## Complete Test Onboarding Flow

### 1. Fresh WSL2 Environment Setup
```bash
# Start fresh
sudo apt update && sudo apt upgrade -y

# Install prerequisites
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs git

# Install GitHub CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh -y
```

### 2. Test User Configuration
```bash
# Configure as new developer
git config --global user.name "Alex Developer"
git config --global user.email "alex@testcompany.com"

# Authenticate (using gh cli)
gh auth login
# Follow prompts with test credentials
```

### 3. Clone and Setup Ginko
```bash
# Clone repository
gh repo clone GinkoAI/Ginko
cd Ginko

# Checkout feature branch
git checkout feature/git-native-handoffs

# Test the setup
./ginko status
```

### 4. Verify Onboarding Experience
```bash
# Check that personal directory is created correctly
./ginko status
# Should show: "❌ No handoff found"

# Apply a template
./ginko template feature

# Check it worked
./ginko status
# Should show handoff for alex-at-testcompany-com

# Open in editor (test WSL2 editor detection)
./ginko handoff
```

### 5. Test Multi-User Scenarios
```bash
# Simulate different users
git config user.email "bob@anothercompany.com"
./ginko template bug-fix

git config user.email "carol@startup.io"
./ginko template refactor

# Verify separate directories
ls -la .ginko/sessions/
# Should show:
# alex-at-testcompany-com/
# bob-at-anothercompany-com/
# carol-at-startup-io/
```

## Testing Checklist

### Core Functionality
- [ ] Git config detection works
- [ ] Email-based directory creation
- [ ] Templates apply correctly
- [ ] File paths work in WSL2
- [ ] Editor detection works

### Edge Cases
- [ ] Special characters in email
- [ ] Long email addresses
- [ ] No git config set
- [ ] Permission issues
- [ ] Case sensitivity

### WSL2-Specific
- [ ] Line endings (CRLF vs LF)
- [ ] Path separators
- [ ] File permissions
- [ ] Symbolic links work
- [ ] Hidden folder visibility

## Common Issues & Solutions

### Issue: "Permission denied"
```bash
# Fix permissions
chmod +x ginko
chmod +x .ginko/bin/*
```

### Issue: "Repository not found"
```bash
# Verify authentication
gh auth status

# Try refreshing auth
gh auth refresh
```

### Issue: Line ending problems
```bash
# Configure git for WSL2
git config --global core.autocrlf input
```

### Issue: Can't open editor
```bash
# Install a Linux editor
sudo apt install nano vim

# Or install VSCode with WSL extension
code .
```

## Security Notes for Testing

1. **Use temporary tokens** with expiration dates
2. **Revoke test access** after testing
3. **Don't commit test credentials**
4. **Use separate test GitHub accounts** if possible
5. **Clean up test data** from repository

## Measuring Onboarding Success

### Time Metrics
- Time to clone: _____ seconds
- Time to first handoff: _____ minutes
- Time to understand workflow: _____ minutes

### Friction Points
- [ ] Authentication complexity
- [ ] Unclear error messages
- [ ] Missing dependencies
- [ ] Confusing commands

### Success Indicators
- [ ] Can create handoff without help
- [ ] Understands directory structure
- [ ] Can use templates
- [ ] Workflow feels natural

---

This testing will validate our "signup to first use" flow for professional developers!