# Ginko Privacy & Permissions Design

## Current State (Local Only)
- All data processing happens locally
- NO transmission to servers
- Pattern detection runs entirely on user's machine
- Data stored in `~/.ginko/` directory

## Proposed Two-Tier Permissions

### Tier 1: Smart Coaching (Required)
**What it enables:**
- Real-time pattern detection and coaching
- Local data analysis for personalized guidance
- Statusline intelligence updates

**Data handling:**
- Processed locally only
- Stored in `~/.ginko/`
- Never transmitted externally
- User has full control

**Example data:**
```json
{"timestamp":1755619525,"tool":"Bash"}
{"timestamp":1755619529,"tool":"Read"}
```

### Tier 2: Anonymous Analytics (Optional)
**What it enables:**
- Aggregate pattern analysis across all users
- Improved coaching algorithm development
- Better detection of success/failure patterns
- Product quality improvements

**Data handling:**
- Only anonymous statistical summaries transmitted
- No individual sessions or personal data
- Opt-in only, can be disabled anytime
- Encrypted transmission to secure analytics endpoint

**Example aggregate data:**
```json
{
  "session_hash": "abc123...",
  "patterns": {
    "flow_state_duration": 15,
    "repetition_breaks": 3,
    "velocity_trend": "increasing"
  },
  "outcomes": {
    "session_satisfaction": "high",
    "productivity_indicators": ["diverse_tools", "steady_pace"]
  }
}
```

## Value Exchange

### For Users:
- **Tier 1**: Get immediate coaching benefit with complete privacy
- **Tier 2**: Contribute to better coaching for everyone + see community insights

### For Ginko:
- **Tier 1**: Provide value, build trust, demonstrate capability
- **Tier 2**: Learn what patterns actually correlate with developer success

## Installer Flow

```
🚀 Enable Smart Coaching?
├─ YES → Install local coaching
│   └─ 📊 Also help improve coaching for everyone?
│       ├─ YES → Enable anonymous analytics
│       └─ NO → Local only (can enable later)
└─ NO → Exit installer
```

## Technical Implementation

### Local Coaching (Tier 1)
```bash
# Current implementation - no changes needed
~/.claude/hooks/post_tool_use.sh
~/.ginko/session_state.json
~/.ginko/statusline.json
```

### Anonymous Analytics (Tier 2)
```bash
# Additional optional component
~/.ginko/analytics_consent.json
~/.ginko/analytics_buffer/
~/bin/ginko-analytics-uploader (runs periodically)
```

### Analytics Data Pipeline
```
Local Patterns → Anonymization → Aggregation → Encrypted Upload → Ginko Analytics
```

## Privacy Guarantees

### What We Never Collect:
- File names, paths, or contents
- Personal identifiers (usernames, emails, IDs)
- Project names or organization info
- Specific commands or arguments
- IP addresses or location data

### What We Might Aggregate (Tier 2 only):
- Tool usage frequency patterns
- Coaching message effectiveness
- Session duration and flow patterns
- Anonymous success indicators

## User Controls

### Settings Commands:
```bash
ginko-privacy status          # Show current permissions
ginko-privacy enable-analytics   # Opt into Tier 2
ginko-privacy disable-analytics  # Opt out of Tier 2  
ginko-privacy export-data     # Export your local data
ginko-privacy delete-data     # Delete all local data
```

## Benefits of This Approach

### For Product Development:
- Learn which coaching messages are most effective
- Identify patterns that predict developer success
- Improve pattern detection algorithms
- Build evidence-based coaching recommendations

### For Users:
- Get immediate value without sharing any data
- Option to contribute to product improvement
- Complete transparency about data usage
- Full control over privacy choices

### For Trust:
- Clear separation of local vs. shared functionality
- Opt-in only for data sharing
- Easy to understand and control
- Builds confidence in privacy protection