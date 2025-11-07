---
title: User Authentication System
status: in-progress
tags: [auth, security, feature, users]
created: 2025-09-10
updated: 2025-10-15
author: product@example.com
---

# PRD-001: User Authentication System

## Overview

TaskFlow needs a secure, user-friendly authentication system supporting:
- Email/password authentication
- OAuth providers (GitHub, Google)
- Session management
- Password reset
- Email verification

## Problem Statement

Users need a way to:
1. Create accounts and login securely
2. Maintain persistent sessions across devices
3. Recover forgotten passwords
4. Verify email ownership
5. Use existing OAuth accounts (GitHub, Google)

### User Pain Points

- **Friction:** Remembering yet another password
- **Security:** Password reuse across services
- **Recovery:** Forgotten passwords lock users out
- **Trust:** Concerns about data security

## Goals

### Primary Goals

1. **Security** - Industry-standard authentication
2. **Usability** - Frictionless signup/login
3. **Recovery** - Easy password reset flow
4. **Flexibility** - Multiple authentication methods

### Success Metrics

- **Signup Conversion:** >60% of visitors create account
- **Login Success Rate:** >95% first-attempt login
- **OAuth Adoption:** >40% use GitHub/Google login
- **Password Reset:** <5% of users need support
- **Security:** Zero credential leaks

## User Stories

### As a new user...

**US-001:** Sign up with email/password
```
GIVEN I'm a new visitor
WHEN I click "Sign Up"
  AND enter email and password
  AND click "Create Account"
THEN I receive a verification email
  AND can access the app after verifying
```

**US-002:** Sign up with GitHub OAuth
```
GIVEN I'm a new visitor
WHEN I click "Sign Up with GitHub"
  AND authorize TaskFlow in GitHub
THEN I'm automatically logged in
  AND my account is created
```

### As an existing user...

**US-003:** Login with email/password
```
GIVEN I have an account
WHEN I enter my email and password
  AND click "Login"
THEN I'm logged into my account
  AND see my dashboard
```

**US-004:** Reset forgotten password
```
GIVEN I forgot my password
WHEN I click "Forgot Password"
  AND enter my email
THEN I receive a password reset link
  AND can set a new password
```

**US-005:** Stay logged in across sessions
```
GIVEN I logged in previously
WHEN I close and reopen the app
THEN I'm still logged in
  AND don't need to re-enter credentials
```

## Requirements

### Functional Requirements

**FR-001:** Email/Password Authentication
- Minimum password length: 8 characters
- Password strength indicator
- Hash passwords with bcrypt (cost factor: 12)
- Store hashed passwords only (never plaintext)

**FR-002:** OAuth Authentication
- Support GitHub OAuth
- Support Google OAuth
- Auto-link accounts with same email
- Fetch avatar from OAuth provider

**FR-003:** Email Verification
- Send verification email on signup
- Include magic link (expires in 24 hours)
- Block unverified users from creating tasks
- Allow resending verification email

**FR-004:** Password Reset
- Send reset link to email
- Link expires in 1 hour
- Invalidate after use
- Rate limit to 3 attempts per hour

**FR-005:** Session Management
- JWT tokens for stateless auth
- Refresh tokens for long sessions
- Token expires after 30 days of inactivity
- Support logout from all devices

### Non-Functional Requirements

**NFR-001:** Security
- HTTPS only (enforce)
- CSRF protection
- Rate limiting on login attempts
- Audit log for authentication events

**NFR-002:** Performance
- Login response time: <500ms
- OAuth redirect: <2 seconds
- Session validation: <100ms

**NFR-003:** Availability
- 99.9% uptime SLA
- Graceful degradation if OAuth providers down

**NFR-004:** Compliance
- GDPR compliant (data export, deletion)
- SOC 2 Type II (future requirement)

## UI/UX Design

### Signup Flow

```
┌─────────────────────────┐
│  Sign Up                │
│                         │
│  Email: [_______]       │
│  Password: [_______]    │
│  [Create Account]       │
│                         │
│  Or sign up with:       │
│  [GitHub] [Google]      │
│                         │
│  Already have account?  │
│  [Login]                │
└─────────────────────────┘
```

### Login Flow

```
┌─────────────────────────┐
│  Welcome Back           │
│                         │
│  Email: [_______]       │
│  Password: [_______]    │
│  [Login]                │
│                         │
│  [Forgot password?]     │
│                         │
│  Or login with:         │
│  [GitHub] [Google]      │
│                         │
│  Don't have account?    │
│  [Sign Up]              │
└─────────────────────────┘
```

### Password Reset Flow

```
1. User clicks "Forgot Password"
2. Enter email → Receive reset link
3. Click link → Opens reset form
4. Enter new password → Confirmed
5. Redirect to login
```

## Technical Implementation

### Architecture

**Supabase Auth** - Managed authentication service
- Built-in OAuth providers
- Email/password support
- JWT token generation
- Row-level security (RLS)

See **ADR-004: Supabase for Authentication** for details.

### Database Schema

```sql
-- Users table (managed by Supabase)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  encrypted_password TEXT,  -- Only for email/password auth
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User profiles (our extension)
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  github_username TEXT,
  google_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log
CREATE TABLE auth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,  -- login, logout, reset_password, etc.
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### API Endpoints

**POST** `/api/auth/signup`
```json
{
  "email": "user@example.com",
  "password": "securepass123"
}
```

**POST** `/api/auth/login`
```json
{
  "email": "user@example.com",
  "password": "securepass123"
}
```

**POST** `/api/auth/logout`
```
Authorization: Bearer <token>
```

**POST** `/api/auth/reset-password`
```json
{
  "email": "user@example.com"
}
```

**GET** `/api/auth/oauth/github`
- Redirects to GitHub OAuth

**GET** `/api/auth/oauth/callback`
- Handles OAuth callback

## Acceptance Criteria

- [ ] User can sign up with email/password
- [ ] User can sign up with GitHub OAuth
- [ ] User can sign up with Google OAuth
- [ ] User receives verification email
- [ ] User can verify email via magic link
- [ ] User can login with verified account
- [ ] User can reset forgotten password
- [ ] User can logout
- [ ] Session persists across browser restarts
- [ ] Failed login attempts are rate-limited
- [ ] All authentication events are logged
- [ ] Passwords are securely hashed (bcrypt)

## Dependencies

- **Supabase Auth** - Authentication provider
- **Mailgun/SendGrid** - Email delivery
- **Next.js** - Frontend framework
- **PostgreSQL** - User data storage

## Risks & Mitigations

### Risk: OAuth Provider Outage
**Impact:** Users can't login with OAuth
**Mitigation:** Always support email/password as fallback

### Risk: Email Delivery Failure
**Impact:** Users can't verify email or reset password
**Mitigation:** Use reliable email service (Mailgun), monitor delivery rates

### Risk: Session Hijacking
**Impact:** Unauthorized access
**Mitigation:** HTTPS only, short token expiry, refresh token rotation

## Timeline

- **Week 1:** Supabase setup, email/password auth
- **Week 2:** OAuth integration (GitHub, Google)
- **Week 3:** Email verification, password reset
- **Week 4:** UI polish, security audit

**Target Launch:** 2025-10-01

## Related Documents

- **ADR-004: Supabase for Authentication** - Technical implementation
- **ADR-001: PostgreSQL Database** - User data storage
- **PRD-002: Task Management** - Requires authentication

## Open Questions

- [ ] Should we support magic link login (passwordless)?
- [ ] Do we need 2FA (two-factor authentication)?
- [ ] Should we support SSO for enterprise customers?

---

**Owner:** Product Team
**Implementation Status:** 🚧 In Progress (75% complete)
**Last Updated:** 2025-10-15
