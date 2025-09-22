# ADR-031: Marketplace Security Scanning System

## Status
**PROPOSED** - 2025-09-22

## Context

The Ginko Reflectors Marketplace will host 3rd-party reflectors that integrate deeply with user workflows and potentially access sensitive project information. Without proper security screening, malicious or vulnerable reflectors could:

- Execute arbitrary code in user environments
- Exfiltrate sensitive project data through AI prompts
- Introduce dependencies with known vulnerabilities
- Perform prompt injection attacks against AI systems
- Compromise team development workflows

Current challenges:
- No existing security scanning infrastructure for Ginko packages
- Need to detect both traditional code vulnerabilities and AI-specific attacks
- Balance security rigor with marketplace velocity
- Support automated screening while allowing manual review
- Integrate with existing npm security tooling

The security system must protect users while maintaining an efficient approval process for legitimate developers.

## Decision

We will implement a **Comprehensive Marketplace Security Scanning System** that combines automated vulnerability detection, AI safety checks, and human review processes to ensure reflector security before marketplace publication.

### Core Components

#### 1. Multi-Stage Security Pipeline
```typescript
export class SecurityPipeline {
  async scanReflector(submission: ReflectorSubmission): Promise<SecurityReport> {
    const stages = [
      new DependencyScanner(),
      new CodeQualityScanner(),
      new AIPromptSafetyScanner(),
      new PrivacyAnalyzer(),
      new MalwareDetector(),
      new LicenseComplianceScanner()
    ];

    const results = await Promise.all(
      stages.map(scanner => scanner.scan(submission))
    );

    return this.aggregateResults(results);
  }
}
```

#### 2. Dependency Vulnerability Scanning
```typescript
export class DependencyScanner implements SecurityScanner {
  async scan(submission: ReflectorSubmission): Promise<ScanResult> {
    const packageJson = submission.getPackageJson();

    // Integrate with multiple vulnerability databases
    const sources = [
      new NpmAuditScanner(),
      new SnykScanner(),
      new GitHubAdvisoryScanner(),
      new OSVScanner()
    ];

    const vulnerabilities = await this.aggregateVulnerabilities(sources, packageJson);

    return {
      stage: 'dependency_scan',
      severity: this.calculateSeverity(vulnerabilities),
      findings: vulnerabilities,
      recommendations: this.generateRecommendations(vulnerabilities)
    };
  }
}
```

#### 3. AI Prompt Safety Scanner
```typescript
export class AIPromptSafetyScanner implements SecurityScanner {
  async scan(submission: ReflectorSubmission): Promise<ScanResult> {
    const templates = submission.getAITemplates();
    const findings: PromptSafetyFinding[] = [];

    for (const template of templates) {
      // Check for prompt injection patterns
      findings.push(...await this.detectPromptInjection(template));

      // Analyze data access patterns
      findings.push(...await this.analyzeDataAccess(template));

      // Check for information disclosure risks
      findings.push(...await this.detectInformationLeakage(template));

      // Validate prompt boundaries
      findings.push(...await this.validatePromptBoundaries(template));
    }

    return {
      stage: 'prompt_safety',
      severity: this.calculatePromptRisk(findings),
      findings,
      recommendations: this.generatePromptRecommendations(findings)
    };
  }

  private async detectPromptInjection(template: AITemplate): Promise<PromptSafetyFinding[]> {
    const injectionPatterns = [
      /ignore\s+previous\s+instructions/i,
      /system\s*:\s*you\s+are/i,
      /\{\{\s*user_input\s*\}\}.*\{\{\s*system/i,
      /execute\s+this\s+instead/i,
      /end\s+of\s+prompt/i
    ];

    const findings: PromptSafetyFinding[] = [];

    for (const pattern of injectionPatterns) {
      if (pattern.test(template.content)) {
        findings.push({
          type: 'prompt_injection',
          severity: 'high',
          location: template.path,
          description: `Potential prompt injection pattern detected: ${pattern}`,
          mitigation: 'Use input sanitization and prompt boundary validation'
        });
      }
    }

    return findings;
  }
}
```

#### 4. Code Quality and Malware Detection
```typescript
export class MalwareDetector implements SecurityScanner {
  async scan(submission: ReflectorSubmission): Promise<ScanResult> {
    const sourceFiles = submission.getSourceFiles();
    const findings: MalwareFinding[] = [];

    for (const file of sourceFiles) {
      // Check for suspicious network activity
      findings.push(...await this.detectSuspiciousNetworking(file));

      // Analyze file system access patterns
      findings.push(...await this.analyzeFileSystemAccess(file));

      // Check for code obfuscation (potential hiding of malicious behavior)
      findings.push(...await this.detectObfuscation(file));

      // Validate execution boundaries
      findings.push(...await this.validateExecutionBoundaries(file));
    }

    return {
      stage: 'malware_detection',
      severity: this.calculateMalwareRisk(findings),
      findings,
      recommendations: this.generateMalwareRecommendations(findings)
    };
  }

  private async detectSuspiciousNetworking(file: SourceFile): Promise<MalwareFinding[]> {
    const suspiciousPatterns = [
      /fetch\([^)]*https?:\/\/(?!api\.ginko\.dev)/g, // External API calls
      /require\(['"]child_process['"]\)/g,           // Process spawning
      /eval\s*\(/g,                                 // Dynamic code execution
      /Function\s*\(/g,                             // Function constructor
      /\.on\s*\(\s*['"]error['"]/g                 // Error handling that might hide issues
    ];

    // Implementation details...
  }
}
```

### Security Approval Workflow

#### Automated Screening
```typescript
export class AutomatedScreening {
  async processSubmission(submission: ReflectorSubmission): Promise<ScreeningResult> {
    const securityReport = await this.securityPipeline.scan(submission);
    const riskScore = this.calculateRiskScore(securityReport);

    if (riskScore <= this.AUTO_APPROVE_THRESHOLD) {
      return {
        status: 'auto_approved',
        report: securityReport,
        nextSteps: ['publish_to_marketplace']
      };
    } else if (riskScore >= this.AUTO_REJECT_THRESHOLD) {
      return {
        status: 'auto_rejected',
        report: securityReport,
        nextSteps: ['notify_developer', 'provide_remediation_guidance']
      };
    } else {
      return {
        status: 'manual_review_required',
        report: securityReport,
        nextSteps: ['queue_for_human_review']
      };
    }
  }
}
```

#### Human Review Process
```typescript
export class HumanReviewQueue {
  async queueForReview(submission: ReflectorSubmission, report: SecurityReport): Promise<void> {
    const reviewTask = {
      submissionId: submission.id,
      priority: this.calculateReviewPriority(report),
      findings: report.findings.filter(f => f.requiresHumanReview),
      estimatedReviewTime: this.estimateReviewTime(report),
      assignedReviewer: await this.assignReviewer(submission)
    };

    await this.reviewQueue.enqueue(reviewTask);
    await this.notifyReviewer(reviewTask);
  }

  async submitReviewDecision(reviewId: string, decision: ReviewDecision): Promise<void> {
    const review = await this.getReview(reviewId);

    if (decision.approved) {
      await this.approveReflector(review.submissionId);
      await this.publishToMarketplace(review.submissionId);
    } else {
      await this.rejectReflector(review.submissionId, decision.reasons);
      await this.provideFeedback(review.submissionId, decision.feedback);
    }
  }
}
```

### Developer Feedback and Remediation

#### Automated Fix Suggestions
```typescript
export class RemediationEngine {
  async generateFixes(findings: SecurityFinding[]): Promise<RemediationSuggestion[]> {
    const suggestions: RemediationSuggestion[] = [];

    for (const finding of findings) {
      switch (finding.type) {
        case 'vulnerable_dependency':
          suggestions.push(await this.suggestDependencyUpgrade(finding));
          break;
        case 'prompt_injection':
          suggestions.push(await this.suggestPromptSanitization(finding));
          break;
        case 'insecure_network_call':
          suggestions.push(await this.suggestSecureNetworking(finding));
          break;
      }
    }

    return suggestions;
  }

  private async suggestDependencyUpgrade(finding: VulnerabilityFinding): Promise<RemediationSuggestion> {
    const latestSafe = await this.findLatestSafeVersion(finding.packageName);

    return {
      type: 'dependency_upgrade',
      description: `Upgrade ${finding.packageName} to version ${latestSafe}`,
      automaticFix: true,
      command: `npm install ${finding.packageName}@${latestSafe}`,
      impact: 'low',
      testRequired: true
    };
  }
}
```

### Admin Controls and Oversight

#### Security Dashboard
```typescript
export class SecurityDashboard {
  async getMarketplaceSecurity(): Promise<SecurityMetrics> {
    return {
      totalSubmissions: await this.getTotalSubmissions(),
      approvalRate: await this.getApprovalRate(),
      averageReviewTime: await this.getAverageReviewTime(),
      topVulnerabilities: await this.getTopVulnerabilities(),
      riskDistribution: await this.getRiskDistribution(),
      reviewerWorkload: await this.getReviewerWorkload()
    };
  }

  async generateSecurityReport(timeRange: TimeRange): Promise<SecurityReport> {
    // Generate comprehensive security reporting
  }
}
```

#### Team Installation Controls
```typescript
export class TeamSecurityControls {
  async configureTeamPolicy(teamId: string, policy: SecurityPolicy): Promise<void> {
    // Teams can set their own security requirements
    await this.db.setTeamPolicy(teamId, {
      maxRiskScore: policy.maxRiskScore || 50,
      requiredApprovals: policy.requiredApprovals || 1,
      bannedCategories: policy.bannedCategories || [],
      allowPrerelease: policy.allowPrerelease || false,
      requireCodeReview: policy.requireCodeReview || true
    });
  }

  async checkTeamApproval(teamId: string, reflectorId: string): Promise<ApprovalResult> {
    const policy = await this.getTeamPolicy(teamId);
    const reflector = await this.getReflectorSecurity(reflectorId);

    return {
      approved: reflector.riskScore <= policy.maxRiskScore,
      reason: reflector.riskScore > policy.maxRiskScore
        ? 'exceeds_team_risk_threshold'
        : 'meets_security_requirements',
      requiresAdminApproval: reflector.riskScore > policy.maxRiskScore
    };
  }
}
```

## Consequences

### Positive
- **User Protection**: Prevents malicious and vulnerable reflectors from reaching users
- **Brand Protection**: Maintains trust in the Ginko marketplace
- **Developer Guidance**: Provides actionable feedback for improving reflector security
- **Compliance Support**: Helps enterprises meet security requirements
- **Automated Efficiency**: Reduces manual review workload through automation

### Negative
- **Approval Delays**: Security scanning adds time to marketplace publication
- **False Positives**: Some legitimate reflectors may be flagged incorrectly
- **Development Overhead**: Requires significant security infrastructure investment
- **Maintenance Burden**: Security rules and scanners need continuous updates
- **Developer Friction**: May discourage some developers from submitting reflectors

### Neutral
- **Resource Requirements**: Significant compute and storage for security scanning
- **Expertise Needed**: Requires security specialists for system maintenance
- **Legal Considerations**: Need clear terms for security requirements

## Implementation Details

### Phase 1: Core Scanning Infrastructure (4 weeks)
- Implement dependency vulnerability scanning
- Build code quality analysis pipeline
- Create automated approval workflow
- Add developer notification system

### Phase 2: AI Safety Scanning (3 weeks)
- Develop prompt injection detection
- Implement AI prompt safety analyzer
- Add data access pattern analysis
- Create prompt security recommendations

### Phase 3: Manual Review System (2 weeks)
- Build human review queue interface
- Implement reviewer assignment system
- Create review decision workflow
- Add feedback and remediation system

### Phase 4: Admin and Team Controls (2 weeks)
- Develop security dashboard
- Implement team security policies
- Add admin approval workflows
- Create security reporting system

### Phase 5: Advanced Detection (3 weeks)
- Add malware detection capabilities
- Implement behavioral analysis
- Create threat intelligence integration
- Build advanced remediation engine

## Alternative Approaches Considered

### 1. Manual Review Only
**Rejected**: Too slow and expensive to scale with marketplace growth.

### 2. Crowd-Sourced Security Review
**Rejected**: Quality and consistency concerns, potential for gaming.

### 3. Static Analysis Only
**Rejected**: Insufficient for detecting AI-specific attacks and runtime behaviors.

### 4. Sandboxed Execution Testing
**Considered**: Complex but could supplement static analysis in future phases.

### 5. Third-Party Security Service
**Rejected**: Need control over AI-specific security checks and integration with Ginko workflows.

## Metrics for Success

### Security Effectiveness
- **Vulnerability Detection**: > 95% of known vulnerabilities caught before approval
- **False Positive Rate**: < 10% of legitimate submissions incorrectly flagged
- **AI Attack Prevention**: 100% detection of known prompt injection patterns
- **Zero-Day Response**: < 24 hours to add detection for new attack patterns

### Process Efficiency
- **Automated Approval**: 70% of submissions automatically approved
- **Review Time**: < 48 hours average for manual reviews
- **Developer Satisfaction**: 4.0+ rating for security feedback quality
- **Approval Rate**: > 80% of submissions ultimately approved after remediation

### Marketplace Health
- **Security Incidents**: < 0.1% of approved reflectors involved in security incidents
- **User Trust**: 4.5+ rating for marketplace security confidence
- **Developer Adoption**: No significant decrease in submission rate due to security requirements
- **Enterprise Adoption**: 90% of enterprise customers approve security standards

---

**Author**: AI + Human Collaboration
**Reviewers**: [To be assigned]
**Implementation**: Pending approval