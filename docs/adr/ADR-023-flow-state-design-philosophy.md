# ADR-023: Flow State Design Philosophy

## Status
Accepted

## Date
2025-08-27

## Context

Developer productivity is not measured in lines of code written or documentation created, but in sustained periods of deep, focused work - flow state. Every tool interaction, every prompt for input, every verbose output is a micro-interruption that degrades this flow state.

Traditional developer tools optimize for completeness and configurability, often at the expense of flow. They require developers to context-switch, fill out forms, wait for responses, and parse verbose output. Each interruption costs not just the seconds of interaction, but minutes of recovery to regain focus.

## Decision

Adopt **"Maximize Flow State"** as the core design philosophy for all Ginko commands and interactions.

## Design Principles

### 1. Silent Success
**Default output: "done"**
- Success should be silent or minimal
- Verbose output only on request
- No self-congratulatory messages
- No unnecessary confirmation prompts

```bash
# Good
$ ginko capture "insight"
done

# Bad  
$ ginko capture "insight"
✨ Successfully created context module!
📁 Saved to: .ginko/context/modules/gotcha-react-hooks.md
🏷️  Tags: react, hooks, performance
📊 Module stats: 3 sections, 150 words
✅ Context module created successfully!
```

### 2. The Five-Second Rule
**No command should take more than 5 seconds of user time**
- 2 seconds: Ideal (capture, load)
- 5 seconds: Maximum (handoff, ship)
- 10 seconds: Only for explicit review (vibecheck)

If an operation needs more time, it should:
- Run asynchronously
- Provide immediate feedback
- Let the user continue working

### 3. The Snapshot Metaphor
**Commands should feel like taking a photograph**
- Point and shoot simplicity
- No setup required
- Instant capture
- Process later (AI enrichment happens async)
- Build collection naturally over time

```bash
# Like street photography - capture the moment, process later
$ ginko capture "websockets need cleanup"
done
# Back to coding immediately while AI enriches in background
```

### 4. Output Inversely Proportional to Importance
The more important the flow state, the less output:
- Deep debugging → silent operations
- Quick check → brief confirmation  
- Explicit review → full output

### 5. Progressive Disclosure
Start minimal, expand on demand:
```bash
$ ginko capture "insight"          # Minimal
done

$ ginko capture "insight" -r       # Review mode
[shows enriched module]
done

$ ginko capture "insight" -v       # Verbose
Creating module...
Type detected: gotcha
Tags extracted: [performance]
Enriching with AI...
Saved to .ginko/context/modules/
done
```

### 6. No Required Interaction
- No mandatory prompts
- No required confirmations
- No forms to fill
- Sensible defaults for everything
- Override via flags when needed

## Implementation Guidelines

### Command Design
Every command must:
1. Have a sensible default action
2. Complete without user interaction
3. Provide feedback in <500ms
4. Return to prompt in <5s
5. Support `--quiet` for scripts
6. Support `--verbose` for debugging

### Flag Hierarchy
```bash
--quiet (-q)    # Absolutely no output
(default)        # Minimal output: "done"
--review (-r)    # Show result before saving
--verbose (-v)   # Show process details
--debug          # Full trace output
```

### Error Handling
- Errors should be brief and actionable
- No stack traces unless --debug
- Suggest the fix, not just the problem

```bash
# Good
error: auth module not found
try: ginko load auth

# Bad
Error: ContextModuleNotFoundException: The requested context module 'authentication' 
could not be located in the module index at /Users/x/.ginko/context/index.json
Stack trace:
  at ModuleLoader.load (module-loader.ts:45:17)
  at ContextCommand.execute (context.ts:123:5)
  ...
```

## Measuring Success

### Flow Metrics
- **Uninterrupted coding periods**: Average duration between Ginko commands
- **Command latency**: Time from enter to "done"
- **Capture frequency**: More captures = better habit formation
- **Silent success rate**: % of commands needing no follow-up

### Anti-Metrics (what NOT to measure)
- Lines of documentation generated
- Number of context modules
- Module completeness scores
- Configuration complexity

## Examples in Practice

### The Perfect Workday
```bash
09:00  $ ginko start
       # Loads context silently, begins work

10:30  $ ginko capture "useState can't be conditional"
       done
       # Continues coding without interruption

11:45  $ ginko capture "optimize re-renders with memo"  
       done
       # Another quick capture

14:00  $ ginko vibecheck
       # Quick realignment after lunch

16:30  $ ginko handoff
       done
       # End of day, state preserved

Never once pulled out of flow state.
```

### Power User Customization
```bash
# Set personal preferences
$ ginko config set output.style minimal
$ ginko config set capture.review false
$ ginko config set success.message "→"

# Now even more minimal
$ ginko capture "insight"
→
```

## Consequences

### Positive
- Developers maintain flow state longer
- Faster adoption due to minimal friction
- Higher capture frequency
- Better long-term knowledge accumulation
- Commands become muscle memory

### Negative
- Less discoverability of features
- Power users may want more feedback
- Debugging requires explicit verbose mode
- Success might feel anticlimactic

### Mitigations
- Provide `--review` flag for those who want to see output
- Document power user features separately
- Make verbose mode comprehensive when requested
- Celebrate success through accumulated value, not immediate feedback

## The Philosophy in One Line

**"The best tool is invisible during use, profound in impact."**

## References

- Deep Work by Cal Newport
- The Humane Interface by Jef Raskin  
- Unix Philosophy: "Silence is golden"
- Snapshot photography principles
- Zen and the Art of Motorcycle Maintenance (quality through presence)