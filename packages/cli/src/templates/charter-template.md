# Project Charter Template

## AI-Mediated Charter Creation Guide

**For AI Partners:** Use this template to guide a natural conversation with the user. Ask these questions conversationally, synthesize responses, and create a well-formed charter.

---

## Charter Questions

### 1. Purpose & Problem (Required)
**Ask:** "What problem are you solving? What would you like to build?"

**Synthesize into:**
- Clear problem statement
- Value proposition
- Core purpose

**Example:**
> **Purpose:** Build a CLI tool that helps developers maintain context across AI pair programming sessions, preventing loss of progress when switching between different AI assistants or resuming work later.

---

### 2. Users & Personas (Required)
**Ask:** "Who will use this? What are their needs?"

**Synthesize into:**
- User types/personas
- Their goals and pain points

**Example:**
> **Users:**
> - Solo developers using AI assistants (Claude, Cursor, Copilot)
> - Small development teams coordinating AI-assisted work
> - Developers working across multiple projects/contexts

---

### 3. Success Criteria (Required)
**Ask:** "How will you know if this is successful? What does 'done' look like?"

**Synthesize into:**
- Measurable outcomes
- Acceptance criteria
- Definition of success

**Example:**
> **Success Criteria:**
> - [ ] Context preserved across AI tool switches with < 5min recovery time
> - [ ] Team members can resume each other's sessions seamlessly
> - [ ] 80% reduction in "what was I working on?" moments
> - [ ] Zero data leaves local machine without explicit action

---

### 4. Scope Boundaries (Required)
**Ask:** "What's included in this project? What's explicitly out of scope?"

**Synthesize into:**
- In Scope: What will be built
- Out of Scope: What won't be built
- TBD: What needs more investigation

**Example:**
> **Scope:**
>
> **In Scope:**
> - Local context storage and retrieval
> - Git-native session management
> - CLI for context operations
> - Support for major AI assistants
>
> **Out of Scope:**
> - Cloud storage (v1)
> - Mobile apps
> - IDE plugins
> - Automatic code generation
>
> **TBD:**
> - Team collaboration features
> - Knowledge graph integration
> - Analytics/insights

---

### 5. Constraints (Optional)
**Ask:** "Any constraints or limitations? Budget, timeline, technical requirements?"

**Synthesize into:**
- Technical constraints
- Resource limitations
- Timeline expectations

**Example:**
> **Constraints:**
> - Must work offline (privacy-first)
> - Node.js/TypeScript only (for maintainability)
> - No external dependencies on cloud services
> - Self-funded, bootstrap timeline

---

### 6. Risks & Mitigation (Optional - for full-planning mode)
**Ask:** "What could go wrong? What are the main risks?"

**Synthesize into:**
- Key risks
- Mitigation strategies

**Example:**
> **Risks:**
> - **Context drift:** Mitigation - Regular handoff discipline
> - **Adoption friction:** Mitigation - Magical onboarding UX
> - **Storage growth:** Mitigation - Automatic cleanup policies

---

### 7. Alternatives Considered (Optional - for full-planning mode)
**Ask:** "Did you consider other approaches? Why this direction?"

**Synthesize into:**
- Alternatives considered
- Rationale for chosen approach

**Example:**
> **Alternatives:**
> - **Cloud-only solution:** Rejected for privacy concerns
> - **IDE plugin first:** Rejected - too narrow, maintenance burden
> - **Markdown files only:** Rejected - lacks structure

---

## Work Mode Detection

Listen for signals to determine work mode:

**Hack & Ship** (light depth):
- Keywords: quick, prototype, MVP, weekend, validate
- Time: ~5 minutes conversation
- Required: Purpose, Scope only

**Think & Build** (standard depth):
- Keywords: team, process, testing, architecture
- Time: ~15 minutes conversation
- Required: Purpose, Users, Success, Scope, Constraints

**Full Planning** (comprehensive):
- Keywords: stakeholders, governance, risks, compliance
- Time: ~30 minutes conversation
- Required: All sections including Risks, Alternatives

---

## Conversation Guidelines for AI Partners

### Do:
- ✅ Ask questions naturally, not as a form
- ✅ Offer insights from your knowledge ("I've seen similar projects...")
- ✅ Guide them through thinking, don't just collect answers
- ✅ Adapt based on their responses (go deeper if engaged, lighter if rushed)
- ✅ Summarize what you've captured before finalizing
- ✅ Be tactful if something is unclear ("Want to think more about...?")

### Don't:
- ❌ Ask all questions mechanically in sequence
- ❌ Force complete answers if they're uncertain (mark TBD)
- ❌ Use corporate jargon or bureaucratic tone
- ❌ Ask for things they haven't thought about yet
- ❌ Make it feel like a long form

### Completion Logic:
Stop when:
- Overall confidence > 70%, OR
- All critical aspects (purpose, users, success, scope) > 40%
- User signals they're done ("That's enough for now")

---

## Output Format

After conversation, create `docs/PROJECT-CHARTER.md` with this structure:

\`\`\`markdown
---
version: 1.0.0
status: active
work_mode: think-build
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# Project Charter: [Project Name]

## Purpose

[Synthesized purpose and problem statement]

## Users

- [User type 1]: [Their needs]
- [User type 2]: [Their needs]

## Success Criteria

- [ ] [Measurable criterion 1]
- [ ] [Measurable criterion 2]
- [ ] [Measurable criterion 3]

## Scope

### In Scope
- [Feature/capability 1]
- [Feature/capability 2]

### Out of Scope
- [Explicitly excluded item 1]
- [Explicitly excluded item 2]

### To Be Determined
- [Item needing more investigation]

## Constraints

[Constraints if discussed]

## Timeline

[Timeline if discussed]

## Team

- [Team member 1]
- [Team member 2]

## Risks

[Risks if discussed - full-planning mode]

## Alternatives Considered

[Alternatives if discussed - full-planning mode]

---

## Changelog

### v1.0.0 - YYYY-MM-DD
- Initial charter creation
- Participants: [user email], Claude
\`\`\`

---

## Graph Sync (IMPORTANT)

After creating the charter file, **you must sync it to the graph** so it's available for team collaboration and context retrieval:

```bash
ginko charter --sync
```

This creates a `ProjectCharter` node in the knowledge graph with relationships to the project.

**Complete workflow:**
1. Create `docs/PROJECT-CHARTER.md` with the charter content
2. Run `ginko charter --sync` to sync to graph
3. Confirm sync success message

---

**Remember:** The goal is a helpful conversation that produces a useful charter, not a perfect document. Quality over completeness. Natural over formal.
