# End-to-End User Journey: Ginko Statusline Intelligence

**Document Type**: User Experience Reference  
**Version**: 1.0  
**Last Updated**: 2025-08-19  
**Audience**: Product, Engineering, Support

---

## Overview

This document details the complete user journey from initial Ginko discovery through active use of intelligent statusline coaching. The flow covers authentication, installation, configuration, and first-use experience.

**Journey Duration**: 5-10 minutes for complete setup  
**Success Rate Target**: >80% completion for users who start installation  
**Key Success Metric**: User receives first coaching message within 2 minutes of Claude Code restart

---

## User Journey Map

### Phase 1: Discovery & Authentication (30 seconds)

#### Entry Points
- Direct navigation to `https://app.ginko.ai`
- Referral from colleague or documentation
- Search result or social media link

#### Authentication Flow
```
https://app.ginko.ai
│
├─ Landing Page
│   ├─ Value proposition: "Transform your Claude Code experience"
│   ├─ Social proof: Testimonials, usage stats
│   └─ CTA: "Get Started Free"
│
└─ GitHub OAuth
    ├─ "Sign in with GitHub" button
    ├─ GitHub OAuth consent screen
    ├─ Permission grants: email, public profile
    └─ Redirect to Ginko dashboard
```

**Success Criteria**: User authenticated and lands on dashboard
**Drop-off Points**: OAuth consent, GitHub login issues

---

### Phase 2: Onboarding & Setup Introduction (1 minute)

#### Dashboard Welcome Experience
```
┌─────────────────────────────────────────────────────────┐
│ 🎯 Welcome to Ginko Intelligence!                   │
│                                                         │
│ Transform your Claude Code sessions with real-time     │
│ coaching that helps you stay productive and focused.   │
│                                                         │
│ ✨ What you'll get:                                     │
│   🎯 Smart pattern recognition                          │
│   💬 Contextual coaching messages                       │
│   ⚡ Real-time feedback (sub-second latency)            │
│   📊 Productivity insights                              │
│                                                         │
│ 🏠 Privacy First:                                       │
│   • All processing happens on your machine             │
│   • No file contents or personal data collected        │
│   • Complete control over data sharing                 │
│                                                         │
│ Ready to get started?                                  │
│                                                         │
│ [🚀 Set Up Claude Code Integration] [📚 Learn More]    │
└─────────────────────────────────────────────────────────┘
```

#### Integration Setup Instructions
```
┌─────────────────────────────────────────────────────────┐
│ 📋 Claude Code Integration Setup                        │
│                                                         │
│ Follow these steps to enable intelligent coaching:     │
│                                                         │
│ Step 1: Install Ginko CLI                          │
│ > npm install -g @ginko/cli                        │
│                                                         │
│ Step 2: Run the coaching setup                         │
│ > ginko setup-coaching                             │
│                                                         │
│ Step 3: Follow the installation prompts                │
│ (We'll guide you through permissions and privacy)      │
│                                                         │
│ Step 4: Restart Claude Code and activate hooks         │
│ > /hooks                                                │
│                                                         │
│ 💡 The entire process takes 3-5 minutes and all data   │
│    stays on your machine unless you opt into analytics │
│                                                         │
│ [📋 Copy Commands] [🎬 Watch Video Guide]              │
└─────────────────────────────────────────────────────────┘
```

**Success Criteria**: User understands value proposition and next steps
**Drop-off Points**: Complex instructions, unclear value

---

### Phase 3: CLI Installation & Setup (2-3 minutes)

#### Terminal Commands
```bash
user@machine:~$ npm install -g @ginko/cli
npm WARN deprecated packageA@1.0.0: use packageB instead
+ @ginko/cli@1.0.0
added 45 packages from 23 contributors in 12.345s

user@machine:~$ ginko setup-coaching
```

#### Installation Interface
```bash
🚀 === Ginko Statusline Intelligence Installer === 🚀

Transform your Claude Code experience with intelligent, real-time coaching!

✨ What you'll get:
  🎯 Smart pattern recognition - detects when you're in flow, stuck, or exploring
  💬 Contextual coaching messages - helpful hints at just the right moment
  ⚡ Real-time feedback - updates within milliseconds of your actions
  🔒 Complete privacy - all processing happens locally on your machine

Examples of intelligent coaching:
  🚀 "Great momentum! Keep exploring" (when rapidly using diverse tools)
  🔄 "Repeating Bash. Try something different?" (when stuck in a pattern)
  💭 "Quiet moment. What's next?" (during idle periods)
  🎯 "Focused work. Stay on target!" (when working intensively)

📋 Technical Details
━━━━━━━━━━━━━━━━━━━━
This feature uses Claude Code's official 'hooks' system to monitor your
tool usage patterns. Here's exactly what happens:

How it works:
  ✅ Monitors tool usage (Read, Write, Bash, etc.) for patterns
  ✅ Generates helpful coaching messages based on your workflow
  ✅ Stores pattern data locally in /Users/user/.ginko
  ✅ Updates your statusline with contextual guidance

Privacy & Data Usage:
  🏠 **LOCAL PROCESSING ONLY** - All coaching happens on your machine
  🚫 **NO DATA TRANSMISSION** - Nothing sent to Ginko servers  
  👁️  **MINIMAL DATA** - Only tool names and timing, never file contents
  🛡️  **READ-ONLY** - Never modifies your files or projects
  📁 **TRANSPARENT** - Hook scripts stored in ~/.claude/hooks (inspect anytime)

The hooks system runs small shell scripts when you use Claude Code tools.
All pattern analysis and coaching generation happens entirely on your machine.

🎉 Ready to enable intelligent statusline coaching? (y/N): 
```

**Success Criteria**: User understands technical approach and privacy model
**Decision Point**: Core functionality consent (required for product to work)

---

### Phase 4A: Consent Granted - Full Installation (1-2 minutes)

#### Primary Consent Flow
```bash
🎉 Ready to enable intelligent statusline coaching? (y/N): y

🤔 Optional: Help Improve Coaching for Everyone
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ginko can learn from anonymous usage patterns to improve coaching
quality for all users. This is completely separate from your local coaching.

If you opt in, we would occasionally collect:
  📊 Anonymous pattern summaries (e.g., "flow state lasted 15 minutes")
  🎯 Coaching effectiveness data (which messages help most)
  📈 Aggregate productivity indicators

We would NEVER collect:
  ❌ File names, paths, or contents
  ❌ Personal identifiers or project details
  ❌ Individual commands or specific activities

Benefits of sharing:
  🚀 Help build better coaching algorithms
  🎯 Contribute to evidence-based productivity insights
  📊 Access to anonymous community insights (future feature)

📊 Enable anonymous analytics to help improve coaching? (y/N): 
```

#### Installation Progress
```bash
📊 Enable anonymous analytics to help improve coaching? (y/N): y
✅ Anonymous analytics enabled - thank you for helping improve Ginko!

🔧 Starting installation...

📁 Creating directories...
💾 Creating backups...
  ✅ Backed up /Users/user/.claude/settings.json
🎣 Installing hook script...
✅ Hook script installed
⚙️  Configuring Claude Code settings...
✅ Claude Code settings updated
💾 Saving privacy preferences...
✅ Privacy preferences saved
📊 Installing command-line utilities...
✅ Statusline reader installed: ginko-status
✅ Privacy manager installed: ginko-privacy
💡 Add /Users/user/.local/bin to your PATH to use these commands globally
🧪 Testing installation...
✅ Hook script is executable
✅ Settings file configured correctly

🎉 Installation Complete!
```

#### Post-Installation Instructions
```bash
Next Steps:
━━━━━━━━━━
1. 🔄 Restart Claude Code completely (required for hooks to activate)
2. 🎯 In your new Claude Code session, run: /hooks
3. ✅ Verify hooks are active (should see confirmation message)
4. 🚀 Start using Claude Code - coaching will appear automatically!

Commands Available:
• Check coaching: ginko-status
• Detailed view: ginko-status details
• Privacy settings: ginko-privacy
• Enable analytics: ginko-privacy enable-analytics
• Disable analytics: ginko-privacy disable-analytics

Files Created:
• Hook script: /Users/user/.claude/hooks/post_tool_use.sh
• Claude Code settings: /Users/user/.claude/settings.json
• Privacy preferences: /Users/user/.ginko/privacy_settings.json
• Data directory: /Users/user/.ginko

Your Privacy Settings:
• 🏠 Local coaching: ENABLED
• 📊 Anonymous analytics: ENABLED
  └─ Helps improve coaching for everyone
  └─ Can be disabled anytime: ginko-privacy disable-analytics

If you experience issues:
• Check that Claude Code restarted completely
• Run /hooks command to activate hooks
• Contact support with logs from /Users/user/.ginko

To uninstall:
• Remove hook configuration from /Users/user/.claude/settings.json
• Delete /Users/user/.claude/hooks/post_tool_use.sh
• Delete /Users/user/.ginko (optional - contains your data)

Happy coding with intelligent statusline coaching! 🚀
```

**Success Criteria**: Installation completes without errors
**Key Files**: Hook script, settings.json, privacy preferences

---

### Phase 4B: Consent Declined - Graceful Exit (30 seconds)

#### Friendly Exit Flow
```bash
🎉 Ready to enable intelligent statusline coaching? (y/N): n

We understand! Hooks are a big decision. 🤗

Unfortunately, Ginko's intelligent coaching requires hooks to work.
Without them, there wouldn't be any real-time pattern detection or
coaching messages - you'd miss the core Ginko experience.

💡 Take your time to consider it. When you're ready:
   • Re-run this installer anytime: ginko setup-coaching
   • Read more about hooks at: https://docs.anthropic.com/en/docs/claude-code/hooks
   • Check out our privacy design: privacy-permissions-design.md

We'd love to help you be more productive when you're ready! 🚀
Thanks for considering Ginko.
```

**Success Criteria**: User feels respected and informed
**Re-engagement**: Clear path to retry installation later

---

### Phase 5: Claude Code Restart & Hook Activation (1 minute)

#### Restart Process
```bash
# User must completely restart Claude Code application
user@machine:~$ claude
```

#### Hook Activation
```bash
# In new Claude Code session
/hooks
verified that PostToolUse hook is active triggering /Users/user/.claude/hooks/post_tool_use.sh
```

**Success Criteria**: Hook activation confirmation message appears
**Common Issues**: Partial restart, settings not reloaded

---

### Phase 6: First Coaching Experience (30 seconds - 2 minutes)

#### Initial Activity
```bash
claude> Read some-file.txt
# Hook fires, creates initial session data

claude> Write another-file.txt  
# Pattern detection begins

claude> Bash echo "testing"
# Coaching message generated
```

#### Coaching Message Display
```bash
# After initial tools (startup pattern)
user@machine:~$ ginko-status
👋 Just getting started. I'm here to help!

# After diverse tool usage (flow pattern)
user@machine:~$ ginko-status
🚀 Great momentum! Keep exploring

# After repetitive usage (stuck pattern)
user@machine:~$ ginko-status
🔄 Repeating Bash. Try something different?
```

#### Detailed Status Check
```bash
user@machine:~$ ginko-status details
=== Ginko Session Status ===

Session Metrics:

Current Coaching:
🚀 Great momentum! Keep exploring

Pattern Type:
flow

Recent Tools:
  2025-08-19T16:08:23Z - TodoWrite
  2025-08-19T16:08:48Z - Write
  2025-08-19T16:08:57Z - Bash
  2025-08-19T16:09:01Z - Read
  2025-08-19T16:09:10Z - Bash
```

**Success Criteria**: User receives contextually appropriate coaching message
**Engagement**: Message feels helpful and accurate

---

### Phase 7: Ongoing Usage & Refinement (Continuous)

#### Pattern Recognition Over Time
- **Flow State**: High velocity + diverse tools → Encouragement messages
- **Stuck Pattern**: Repetitive tool use → Suggestion to try different approaches
- **Idle Detection**: Long gaps → Gentle prompts to continue
- **Focused Work**: High velocity + limited tools → Recognition of focus

#### Privacy Management
```bash
# Check current settings
user@machine:~$ ginko-privacy status

# Disable analytics
user@machine:~$ ginko-privacy disable-analytics

# Export personal data
user@machine:~$ ginko-privacy export-data
```

#### Integration with Ginko Dashboard (Future)
```
Dashboard Analytics View:
┌─────────────────────────────────────────────────────────┐
│ 📊 Coaching Effectiveness                               │
│                                                         │
│ This Week:                                              │
│   • 12 hours of flow state detected                    │
│   • 156 coaching interventions                         │
│   • 94% positive pattern recognition                   │
│                                                         │
│ Most Helpful Messages:                                  │
│   1. "Great momentum! Keep exploring" (89% helpful)    │
│   2. "Focused work. Stay on target!" (87% helpful)     │
│   3. "Quiet moment. What's next?" (82% helpful)        │
│                                                         │
│ Patterns Identified:                                    │
│   • Morning flow states: 8:00-11:00 AM                 │
│   • Afternoon focus blocks: 2:00-4:00 PM               │
│   • Common stuck points: Friday afternoons             │
│                                                         │
│ [Adjust Coaching] [View Detailed Analytics]            │
└─────────────────────────────────────────────────────────┘
```

**Long-term Value**: Coaching becomes integral to workflow
**Feedback Loop**: User behavior influences coaching improvements

---

## Success Metrics & KPIs

### Installation Funnel
```
GitHub Auth → Dashboard → CLI Install → Hook Consent → First Message
     95%         90%         85%           70%          95%
```

**Overall Conversion**: ~52% (GitHub auth → First coaching message)

### Quality Metrics
- **Time to First Message**: <2 minutes after Claude Code restart
- **Pattern Accuracy**: >80% of messages feel contextually appropriate
- **User Satisfaction**: >4/5 stars for coaching helpfulness
- **Retention**: >60% still using after 30 days

### Privacy & Trust
- **Analytics Opt-in Rate**: Target 40-60%
- **Privacy Command Usage**: <5% (indicates trust in defaults)
- **Support Tickets**: <2% related to privacy concerns

---

## Drop-off Points & Mitigation

### Critical Friction Points

#### 1. Hook Consent (Biggest Drop-off)
**Issue**: ~30% of users decline hooks
**Mitigation**: 
- Clear value demonstration before asking
- Video testimonials from satisfied users
- Trial period with easy uninstall

#### 2. Claude Code Restart
**Issue**: Users forget to restart or do partial restart
**Mitigation**:
- Clear restart instructions with screenshots
- Automated detection of partial restarts
- Follow-up email with reminder

#### 3. Hook Activation Command
**Issue**: Users forget to run `/hooks` command
**Mitigation**:
- Bold, repeated instructions
- CLI tool that checks hook status
- Dashboard integration showing activation status

### Recovery Strategies
- **Email follow-up** for incomplete installations
- **Support chat** for technical issues
- **Community forum** for user questions
- **Video tutorials** for visual learners

---

## Technical Implementation Notes

### Data Flow Architecture
```
Claude Code Tool Use → PostToolUse Hook → Pattern Engine → JSON Status → Statusline Reader
```

### File Structure Created
```
~/.claude/
├── settings.json (modified)
└── hooks/
    └── post_tool_use.sh (created)

~/.ginko/
├── privacy_settings.json
├── session_state.json
├── tool_history.jsonl
└── statusline.json

~/.local/bin/
├── ginko-status
└── ginko-privacy
```

### Network Dependencies
- **Installation**: NPM registry access
- **Runtime**: None (fully local)
- **Analytics** (optional): HTTPS to Ginko endpoints

---

## Support & Troubleshooting

### Common Issues

#### "Hooks not activating"
1. Verify complete Claude Code restart (not just new session)
2. Check `.claude/settings.json` contains hook configuration
3. Run `/hooks` command to activate
4. Verify hook script is executable: `ls -la ~/.claude/hooks/`

#### "No coaching messages"
1. Check hook is firing: `tail ~/.ginko/tool_history.jsonl`
2. Use some tools to generate patterns
3. Check status: `ginko-status`
4. Reset if needed: `ginko-status reset`

#### "Permission denied errors"
1. Check file permissions on hook script
2. Verify CLI tools are executable
3. Check PATH includes `~/.local/bin`

### Escalation Path
1. **CLI diagnostics**: `ginko-status test`
2. **Privacy check**: `ginko-privacy status`
3. **Support ticket** with diagnostic output
4. **Community forum** for common questions

---

## Future Enhancements

### Planned Improvements
- **Visual installation guide** with screenshots
- **Browser extension** for dashboard integration
- **Slack/Discord notifications** for team insights
- **A/B testing** for coaching message effectiveness
- **Machine learning** for personalized patterns

### User Feedback Integration
- **In-app feedback** for coaching message quality
- **Usage analytics** (with consent) for pattern improvement
- **Community voting** on most helpful messages
- **Custom pattern creation** for advanced users

---

*Document maintained by: Ginko Product Team*  
*Last review: 2025-08-19*  
*Next review: 2025-09-19*