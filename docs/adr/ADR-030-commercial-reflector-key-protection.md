# ADR-030: Commercial Reflector Key Protection System

## Status
**PROPOSED** - 2025-09-22

## Context

The Ginko Reflectors Marketplace will host commercial reflectors created by 3rd-party developers. These developers need protection against piracy and unauthorized distribution to maintain viable business models. Without proper license protection, commercial reflectors could be easily copied and redistributed, undermining the marketplace ecosystem.

Current challenges:
- No existing license validation system in Ginko
- Need to balance security with developer experience
- Must support both individual and team licenses
- Offline usage requirements for some enterprise environments
- Integration with existing Ginko CLI workflow

The protection system must be robust enough to deter casual piracy while remaining user-friendly for legitimate customers.

## Decision

We will implement a **Commercial Reflector Key Protection System** that combines online license validation with machine fingerprinting and graceful degradation for offline scenarios.

### Core Components

#### 1. License Key Generation
```typescript
interface LicenseKey {
  reflectorId: string;        // @vendor/reflector-name
  licenseType: 'individual' | 'team' | 'enterprise';
  expiryDate?: Date;          // null for perpetual licenses
  maxInstallations: number;   // concurrent installation limit
  features: string[];         // enabled feature flags
  signature: string;          // cryptographic signature
}

export class LicenseGenerator {
  generateKey(reflector: string, type: LicenseType, duration?: Duration): string {
    const payload = {
      reflectorId: reflector,
      licenseType: type,
      expiryDate: duration ? new Date(Date.now() + duration) : null,
      maxInstallations: this.getInstallationLimit(type),
      features: this.getFeatures(type),
      timestamp: Date.now()
    };

    return this.sign(payload);
  }
}
```

#### 2. License Validation Architecture
```typescript
export class LicenseManager {
  private cache: LicenseCache;
  private validator: LicenseValidator;

  async validateLicense(reflectorId: string): Promise<ValidationResult> {
    const licenseKey = this.getLicenseKey(reflectorId);

    // Try cache first (for offline scenarios)
    const cached = await this.cache.get(licenseKey);
    if (cached && !this.isExpired(cached)) {
      return { valid: true, source: 'cache' };
    }

    // Online validation
    try {
      const result = await this.validator.validateOnline(licenseKey);
      await this.cache.store(licenseKey, result);
      return result;
    } catch (error) {
      // Graceful degradation for offline scenarios
      return this.handleOfflineValidation(licenseKey, cached);
    }
  }
}
```

#### 3. Machine Fingerprinting
```typescript
export class MachineFingerprint {
  async generate(): Promise<string> {
    const components = [
      await this.getCPUInfo(),
      await this.getSystemInfo(),
      await this.getNetworkInfo(),
      this.getUserEnvironment()
    ];

    // Generate stable but unique fingerprint
    return crypto
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex')
      .substring(0, 32);
  }

  private async getCPUInfo(): Promise<string> {
    // CPU model and features (stable across boots)
  }

  private async getSystemInfo(): Promise<string> {
    // OS version, hostname (somewhat stable)
  }
}
```

### License Integration Workflow

#### Individual Developer License
```bash
# Purchase reflector from marketplace
$ ginko marketplace buy @acme/security-audit --license individual
💳 Purchasing individual license for @acme/security-audit...
✅ License purchased! Key saved to environment.

# Automatic installation and activation
$ ginko reflect --domain security-audit "Audit login system"
🔐 Validating license for @acme/security-audit...
✅ License valid - generating security audit...
```

#### Team License Distribution
```bash
# Admin purchases team license
$ ginko marketplace buy @acme/security-audit --license team --seats 10
💳 Purchasing team license (10 seats) for @acme/security-audit...
🔑 Team license key: GINKO-TEAM-ABC123...
✅ Share this key with your team members

# Team member installation
$ ginko marketplace install @acme/security-audit --team-key GINKO-TEAM-ABC123
🔐 Validating team license...
✅ License activated for team member (3/10 seats used)
```

#### Enterprise Offline License
```bash
# Generate offline license bundle
$ ginko marketplace generate-offline @acme/security-audit --duration 90days
📦 Generating offline license bundle...
💾 Saved to: acme-security-audit-offline.ginko

# Install in air-gapped environment
$ ginko marketplace install-offline acme-security-audit-offline.ginko
🔐 Installing offline license...
✅ Valid for 90 days, expires 2025-12-22
```

### Security Architecture

#### License Server Infrastructure
```typescript
// License validation API
export class LicenseValidationAPI {
  async validateLicense(request: ValidationRequest): Promise<ValidationResponse> {
    const { licenseKey, machineFingerprint, reflectorId } = request;

    // Verify license signature
    if (!this.verifySignature(licenseKey)) {
      return { valid: false, reason: 'invalid_signature' };
    }

    // Check against database
    const license = await this.db.getLicense(licenseKey);
    if (!license || license.revoked) {
      return { valid: false, reason: 'license_revoked' };
    }

    // Validate machine binding
    if (license.machineFingerprints.length >= license.maxInstallations) {
      if (!license.machineFingerprints.includes(machineFingerprint)) {
        return { valid: false, reason: 'max_installations_exceeded' };
      }
    }

    // Update usage tracking
    await this.db.recordUsage(licenseKey, machineFingerprint);

    return {
      valid: true,
      expiryDate: license.expiryDate,
      features: license.features
    };
  }
}
```

#### Tamper Protection
```typescript
export class TamperProtection {
  // Code obfuscation for commercial reflectors
  obfuscateReflectorCode(source: string): string {
    return this.applyObfuscation(source, {
      strings: true,
      controlFlow: true,
      deadCode: true,
      renaming: true
    });
  }

  // Runtime integrity checks
  validateIntegrity(): boolean {
    const expectedHash = this.getExpectedHash();
    const actualHash = this.computeCurrentHash();
    return expectedHash === actualHash;
  }
}
```

### License Types and Pricing Model

#### Individual License
- **Single user**: 1 machine installation
- **Duration**: Perpetual or subscription
- **Features**: Full reflector functionality
- **Price**: Set by reflector vendor

#### Team License
- **Multi-user**: 5-50 seats per license
- **Shared key**: Distributed by team admin
- **Centralized management**: Usage tracking and reporting
- **Features**: Team collaboration features enabled

#### Enterprise License
- **Unlimited seats**: Within organization
- **Offline support**: Air-gapped environment compatible
- **Custom terms**: Extended support and SLAs
- **Advanced features**: Integration APIs, custom branding

## Consequences

### Positive
- **Revenue Protection**: Prevents casual piracy of commercial reflectors
- **Marketplace Viability**: Encourages 3rd-party developer participation
- **Flexible Licensing**: Supports various business models
- **User Experience**: Minimal friction for legitimate users
- **Offline Support**: Works in restricted network environments

### Negative
- **Complexity**: Adds significant complexity to CLI and infrastructure
- **Single Point of Failure**: License server outage affects validation
- **Privacy Concerns**: Machine fingerprinting may raise privacy issues
- **Support Overhead**: License issues require customer support
- **Development Cost**: Substantial implementation and maintenance effort

### Neutral
- **Performance Impact**: License validation adds slight startup delay
- **Storage Requirements**: License cache increases local storage usage
- **Network Dependency**: Online validation requires internet connectivity

## Implementation Details

### Phase 1: Core License System (3 weeks)
- Implement license key generation and validation
- Build machine fingerprinting system
- Create license cache and offline handling
- Add basic CLI integration

### Phase 2: Marketplace Integration (2 weeks)
- Build license purchase workflow
- Implement team license distribution
- Create license management UI
- Add usage tracking and analytics

### Phase 3: Security Hardening (2 weeks)
- Implement code obfuscation for commercial reflectors
- Add tamper detection and runtime integrity checks
- Create license revocation system
- Build fraud detection mechanisms

### Phase 4: Enterprise Features (2 weeks)
- Add offline license generation
- Implement enterprise management console
- Create usage reporting and analytics
- Build custom licensing terms support

### Security Considerations

#### Cryptographic Protection
- **License Signing**: Use RSA-4096 or ECDSA P-384 for license signatures
- **Communication**: TLS 1.3 for all license server communication
- **Key Storage**: Hardware security modules (HSM) for signing keys
- **Rotation**: Regular rotation of signing keys with backward compatibility

#### Anti-Circumvention Measures
- **Code Obfuscation**: Multiple layers of obfuscation for commercial reflectors
- **Runtime Checks**: Regular integrity verification during execution
- **Server-Side Validation**: Critical operations require server confirmation
- **Behavior Analysis**: Detect and flag suspicious usage patterns

#### Privacy Protection
- **Minimal Data**: Collect only necessary information for fingerprinting
- **Anonymization**: Hash sensitive system information
- **Data Retention**: Automatic cleanup of old validation records
- **User Consent**: Clear disclosure of data collection practices

## Alternative Approaches Considered

### 1. Hardware Dongles
**Rejected**: Too cumbersome for software distribution and not compatible with cloud/remote development.

### 2. Always-Online DRM
**Rejected**: Would prevent offline usage, which is critical for enterprise customers.

### 3. Code Signing Only
**Rejected**: Provides authenticity but no licensing enforcement or revenue protection.

### 4. Subscription-Only Model
**Considered**: Could simplify licensing but limits business model flexibility for vendors.

### 5. Blockchain-Based Licensing
**Rejected**: Too complex and energy-intensive for this use case.

## Metrics for Success

### Security Metrics
- **Piracy Detection**: < 5% of commercial reflector usage through invalid licenses
- **False Positives**: < 1% legitimate users denied access due to validation errors
- **Circumvention Time**: > 6 months average time to crack protection
- **License Server Uptime**: 99.9% availability for validation services

### User Experience Metrics
- **Validation Speed**: < 2 seconds for online license validation
- **Offline Grace Period**: 30 days minimum offline usage without degradation
- **Installation Success**: > 95% success rate for legitimate license installations
- **Support Tickets**: < 2% of users require support for license issues

### Business Metrics
- **Vendor Participation**: 80% of commercial vendors use license protection
- **Revenue Protection**: 95% of commercial reflector revenue through valid licenses
- **Market Growth**: 50% increase in commercial reflector submissions
- **Customer Satisfaction**: 4.0+ rating for licensing experience

---

**Author**: AI + Human Collaboration
**Reviewers**: [To be assigned]
**Implementation**: Pending approval