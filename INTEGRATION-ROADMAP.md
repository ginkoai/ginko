# Integration Roadmap: First-Use Experience Enhancement

## 🎯 Current State Summary

### ✅ **COMPLETED ARCHITECTURE** (5 Worktrees)
```
../ginko-worktrees/
├── validation-layer/          # GitValidator, ConfigValidator, EnvironmentValidator
├── config-system/             # ConfigLoader, PathResolver, ConfigMigrator
├── document-management/       # DocumentNamer, SequenceManager, DocumentMigrator
├── platform-adapter/          # PlatformDetector, HookAdapter, PathNormalizer
└── doctor-system/             # DiagnosticEngine, RepairEngine, ReportGenerator
```

### 📋 **ARCHITECTURE DOCUMENTS**
- `docs/adr/ADR-028-first-use-experience-architecture.md` - Core architectural decisions
- `docs/PRD/PRD-2025-09-18-first-use-experience-enhancement.md` - Complete requirements
- `docs/PRD/PRD-003-ginko-doctor-reflector.md` - Doctor system specification
- `docs/PRD/PRD-004-subsume-init-with-doctor.md` - Init-doctor unification strategy

## 🚧 **INTEGRATION PHASES**

### **Phase 1: Core Integration** (Priority 1 - Week 1)

#### **1.1 Merge Validation Layer**
```bash
cd ../ginko-worktrees/validation-layer
git checkout main
git merge feature/validation-layer  # Merge back to main
```

**Integration Tasks:**
- [ ] Copy `packages/cli/src/core/validators/` to main
- [ ] Update existing commands to use validators:
  - `init.ts` → Add GitValidator check
  - `handoff/index.ts` → Add pre-flight validation
  - `start/index.ts` → Add environment validation
- [ ] Add validation to SimplePipelineBase
- [ ] Update error messages with validator suggestions

**Testing:**
- [ ] Run validator test suite in main codebase
- [ ] Test integration with existing commands
- [ ] Verify performance < 500ms requirement

#### **1.2 Merge Configuration System**
```bash
cd ../ginko-worktrees/config-system
git checkout main
git merge feature/config-system
```

**Integration Tasks:**
- [ ] Copy `packages/cli/src/core/config/` to main
- [ ] Update all hard-coded paths to use ConfigLoader
- [ ] Replace path logic in:
  - `architecture-pipeline.ts`
  - `prd-pipeline.ts`
  - `sprint-pipeline.ts`
  - `documentation-pipeline.ts`
- [ ] Add ginko.json schema validation

**Migration Requirements:**
- [ ] Create migration tool for existing projects
- [ ] Generate default ginko.json for projects without one
- [ ] Validate all existing paths still work

### **Phase 2: Enhanced Functionality** (Priority 2 - Week 2)

#### **2.1 Merge Document Management**
```bash
cd ../ginko-worktrees/document-management
git checkout main
git merge feature/document-management
```

**Integration Tasks:**
- [ ] Copy `packages/cli/src/core/documents/` to main
- [ ] Update `ginko reflect` command to use DocumentNamer
- [ ] Add naming enforcement to all document generators
- [ ] Create `ginko rename --standardize` command

**Document Types to Update:**
- [ ] ADR generation → Use ADR-###-description format
- [ ] PRD generation → Use PRD-###-description format
- [ ] Sprint documentation → Use SPRINT-###-description format

#### **2.2 Merge Platform Adapter**
```bash
cd ../ginko-worktrees/platform-adapter
git checkout main
git merge feature/platform-adapter
```

**Integration Tasks:**
- [ ] Copy `packages/cli/src/core/platform/` to main
- [ ] Update init command to use platform detection
- [ ] Add hook migration to setup process
- [ ] Fix the real Claude hooks Windows/macOS issue

**Cross-Platform Testing:**
- [ ] Test on Windows (batch script conversion)
- [ ] Test on macOS (shell script handling)
- [ ] Test migration scenarios

### **Phase 3: Intelligent Doctor** (Priority 3 - Week 3)

#### **3.1 Merge Doctor System**
```bash
cd ../ginko-worktrees/doctor-system
git checkout main
git merge feature/doctor-system
```

**Integration Tasks:**
- [ ] Copy `packages/cli/src/commands/doctor/` to main
- [ ] Integrate with all subsystems
- [ ] Update CLI to support both syntaxes:
  - `ginko doctor "problem description"`
  - `ginko reflect --domain doctor "problem description"`

#### **3.2 Implement PRD-004: Subsume Init with Doctor**
**Goal:** Make `ginko init` delegate to `ginko doctor`

**Implementation:**
```typescript
// packages/cli/src/commands/init.ts
export async function initCommand(options) {
  return doctorCommand({
    intent: "initialize new project",
    autoFix: options.autoFix ?? true,
    interactive: options.interactive ?? false
  });
}
```

**Requirements:**
- [ ] Doctor detects uninitialized projects
- [ ] Doctor offers to initialize when needed
- [ ] Backward compatibility maintained
- [ ] Same output format preserved

### **Phase 4: Missing Features** (Priority 4 - Week 4)

#### **4.1 Implement First-Run Experience** (Week 4 from original PRD)
**Missing from worktree implementations:**

- [ ] Welcome flow for new users
- [ ] Guided setup process
- [ ] Project type detection
- [ ] Success confirmation messaging

**Implementation Location:**
- Create `packages/cli/src/commands/welcome/`
- Integrate with doctor system for guided setup
- Trigger on first-ever ginko command in project

#### **4.2 Performance Optimization**
**Requirements from PRD:**
- [ ] Validation overhead < 500ms
- [ ] Diagnostic checks < 3 seconds
- [ ] Configuration loading < 100ms

**Optimization Tasks:**
- [ ] Benchmark all operations
- [ ] Implement caching where beneficial
- [ ] Parallel execution of safe operations
- [ ] Optimize file I/O patterns

## 🧪 **TESTING STRATEGY**

### **Integration Tests**
```bash
# Test worktree integration
npm run test:integration

# Test cross-platform
npm run test:platform

# Test performance
npm run test:performance
```

### **User Acceptance Testing**
- [ ] Fresh Windows installation
- [ ] Fresh macOS installation
- [ ] Fresh Linux installation
- [ ] Migration from existing setup
- [ ] Platform switch (macOS → Windows)

### **Regression Testing**
- [ ] All existing ginko commands work
- [ ] No performance degradation
- [ ] Backward compatibility maintained
- [ ] Configuration migration works

## 📊 **SUCCESS METRICS VALIDATION**

### **From PRD Requirements:**
- [ ] **Time to First Success**: < 5 minutes (currently ~15-30 minutes)
- [ ] **Installation Success Rate**: > 95% (measure with telemetry)
- [ ] **Context Isolation Success**: 100% (no cross-project contamination)
- [ ] **Document Naming Compliance**: > 95% (after migration)
- [ ] **Support Ticket Reduction**: 60% decrease

### **Measurement Plan:**
- [ ] Set up telemetry for timing metrics
- [ ] Create user feedback collection system
- [ ] Monitor support ticket categories
- [ ] Track user retention after first use

## 🚀 **DEPLOYMENT STRATEGY**

### **Beta Testing** (Week 5)
- [ ] Internal team testing (all worktree integrations)
- [ ] External beta users (10 users across platforms)
- [ ] Collect feedback and bug reports
- [ ] Performance validation in real environments

### **Gradual Rollout** (Week 6)
- [ ] Feature flag for new architecture
- [ ] 10% of users → Monitor for issues
- [ ] 50% of users → Confirm stability
- [ ] 100% of users → Full release

### **Post-Launch** (Week 7+)
- [ ] Monitor success metrics
- [ ] Collect user feedback
- [ ] Plan additional enhancements
- [ ] Document lessons learned

## 📁 **FILE ORGANIZATION**

### **Target Structure After Integration:**
```
packages/cli/src/
├── core/
│   ├── validators/           # From validation-layer worktree
│   ├── config/              # From config-system worktree
│   ├── documents/           # From document-management worktree
│   ├── platform/            # From platform-adapter worktree
│   └── reflection-pattern.ts # Existing
├── commands/
│   ├── doctor/              # From doctor-system worktree
│   ├── init.ts              # Modified to delegate to doctor
│   └── [existing commands]  # Updated to use new architecture
└── [existing structure]
```

## 🎯 **NEXT SESSION PRIORITIES**

### **Immediate (Start Here):**
1. **Merge validation-layer** - Lowest risk, highest value
2. **Update init command** - Test integration pattern
3. **Run integration tests** - Validate approach

### **Short Term:**
4. Merge config-system and update reflectors
5. Add document naming to reflect commands
6. Implement doctor system integration

### **Medium Term:**
7. Cross-platform testing and validation
8. Performance optimization and benchmarking
9. User acceptance testing

---

**Status**: Ready for Integration Phase
**Last Updated**: 2025-09-19T22:12:02Z
**Architecture Complete**: 100%
**Implementation Ready**: 5 worktrees with comprehensive tests
**Next Step**: Begin Phase 1 integration starting with validation layer