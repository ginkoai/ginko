# EPIC-008 Launch Checklist: Team Collaboration & Billing

**Status:** Ready for Launch
**Last Verified:** 2026-01-05
**Sprint:** e008_s04 (Billing & Seats)

---

## Summary

This document validates the EPIC-008 Team Collaboration feature set is production-ready. All core functionality has been implemented and verified through code review.

---

## 1. Team Invitation Flow

### API Endpoints
| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/v1/team/invite` | POST | ✅ Ready | Create invitation (owners only) |
| `/api/v1/team/invite` | GET | ✅ Ready | List pending invitations |
| `/api/v1/team/invite` | DELETE | ✅ Ready | Revoke invitation |
| `/api/v1/team/join` | GET | ✅ Ready | Validate invite code |
| `/api/v1/team/join` | POST | ✅ Ready | Accept invitation |

### Verification Checklist
- [x] Invite codes generated securely (12-char hex from crypto.randomBytes)
- [x] Only team owners can create/revoke invitations
- [x] Invitation expiration handled (default 7 days)
- [x] Duplicate invitation prevention (same email + team)
- [x] Already-member detection with helpful error
- [x] Expired invitations auto-marked on access

### Files Verified
- `dashboard/src/app/api/v1/team/invite/route.ts`
- `dashboard/src/app/api/v1/team/join/route.ts`

---

## 2. Team Member Management

### API Endpoints
| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/v1/teams/[id]/members` | GET | ✅ Ready | List team members |
| `/api/v1/teams/[id]/members` | POST | ✅ Ready | Add member (owners only) |
| `/api/v1/teams/[id]/members/[userId]` | DELETE | ✅ Ready | Remove member |

### Verification Checklist
- [x] Only owners can add members directly
- [x] Members can remove themselves
- [x] Owners can remove any member
- [x] Last owner cannot be removed (team protection)
- [x] User profile data resolved with OAuth fallback
- [x] GitHub avatars constructed from username

### Files Verified
- `dashboard/src/app/api/v1/teams/[id]/members/route.ts`
- `dashboard/src/app/api/v1/teams/[id]/members/[userId]/route.ts`

---

## 3. Billing & Seat Management

### API Endpoints
| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/v1/billing/seats` | GET | ✅ Ready | Get seat allocation |
| `/api/v1/billing/seats` | POST | ✅ Ready | Update seat count |
| `/api/v1/billing/seats/sync` | POST | ✅ Ready | Trigger seat sync |
| `/api/v1/billing/seats/reconcile` | POST | ✅ Ready | Reconcile seats for teams |
| `/api/v1/billing/overview` | GET | ✅ Ready | Billing dashboard data |
| `/api/v1/billing/portal` | GET | ✅ Ready | Stripe portal session |

### Verification Checklist
- [x] Seat count syncs automatically on member add/remove
- [x] Only team owners can modify seat allocation
- [x] Cannot reduce seats below current member count
- [x] Seat limits enforced (max 50 for team tier)
- [x] Stripe subscription quantity updated correctly

### Proration Strategy
| Action | Proration | Effective |
|--------|-----------|-----------|
| Add seats | ✅ Immediate charge | Immediately |
| Remove seats | ❌ No proration | Period end |
| Member joins | ✅ Prorated | Immediately |
| Member leaves | ❌ No credit | Period end |

### Files Verified
- `dashboard/src/lib/billing/seat-sync.ts`
- `dashboard/src/app/api/v1/billing/seats/route.ts`
- `dashboard/src/app/api/v1/billing/seats/sync/route.ts`
- `dashboard/src/app/api/v1/billing/seats/reconcile/route.ts`

---

## 4. Stripe Webhook Handling

### Webhook Endpoint
- **URL:** `/api/webhooks/stripe`
- **Signature Verification:** ✅ Using STRIPE_WEBHOOK_SECRET

### Events Handled
| Event Type | Status | Action |
|------------|--------|--------|
| `customer.subscription.updated` | ✅ Ready | Update org seats/status |
| `customer.subscription.deleted` | ✅ Ready | Downgrade to free tier |
| `invoice.payment_failed` | ✅ Ready | Record failure, track attempts |
| `invoice.payment_succeeded` | ✅ Ready | Clear failure status |
| `checkout.session.completed` | ✅ Ready | Link subscription to org |

### Verification Checklist
- [x] Signature verification before processing
- [x] Organization lookup by stripe_customer_id
- [x] Subscription status updates persisted
- [x] Seat count updates from Stripe sync
- [x] Payment failure tracking with attempt count
- [x] Billing events logged for audit trail

### Files Verified
- `dashboard/src/app/api/webhooks/stripe/route.ts`

---

## 5. Payment Failure Handling

### Verification Checklist
- [x] Payment failures update organization `payment_status`
- [x] Attempt count tracked (`payment_attempt_count`)
- [x] Failure timestamp recorded (`payment_failed_at`)
- [x] Successful payment clears failure status
- [x] Billing events logged for all payment activity
- [x] Past due subscriptions trigger status update
- [ ] **TODO:** Email notifications for payment failures (deferred to Phase 2)

---

## 6. Free Tier & Trial Configuration

### Tier Limits
| Tier | Max Seats | Max Projects | Sessions/Month |
|------|-----------|--------------|----------------|
| Free | 2 | 1 | 50 |
| Pro | 5 | 10 | 500 |
| Team | 50 | 100 | 5,000 |
| Enterprise | Unlimited | Unlimited | Unlimited |

### Trial & Grace Period
- **Trial Period:** 14 days (full team features)
- **Grace Period:** 3 days after trial ends
- **Effective Tier:** Free users get team features during trial

### Verification Checklist
- [x] Free tier allows 2 seats (owner + 1)
- [x] Trial status checking (`isTrialActive`)
- [x] Grace period handling (`isInGracePeriod`)
- [x] Effective tier calculation considers trial
- [x] Upgrade prompts with clear messaging
- [x] Days remaining calculations accurate

### Files Verified
- `dashboard/src/lib/subscription-limits.ts`
- `dashboard/src/components/billing/UpgradePrompt.tsx`
- `packages/mcp-server/src/entitlements-manager.ts`

---

## 7. Security Audit

### Authentication
- [x] All billing routes require authentication (`withAuth` middleware)
- [x] Bearer token validation on all endpoints
- [x] Service role client used only for admin operations

### Authorization
- [x] `isTeamOwner()` checks before privileged operations
- [x] Self-removal allowed for members
- [x] Member removal requires owner or self
- [x] Seat modification requires team ownership
- [x] Invitation management requires team ownership

### Input Validation
- [x] Email format validation on invites
- [x] Seat count minimum (1) and maximum (50) enforced
- [x] Required field validation with 400 responses
- [x] Team/user existence verification before operations

### Data Protection
- [x] Stripe webhook signature verification
- [x] No sensitive data in error responses
- [x] Billing events logged without PII
- [x] Invite codes cryptographically random

---

## 8. Dashboard UI Components

### Components Implemented
| Component | Status | Location |
|-----------|--------|----------|
| Billing Overview Page | ✅ Ready | `/dashboard/billing` |
| SeatUsageCard | ✅ Ready | `components/billing/` |
| BillingStatusCard | ✅ Ready | `components/billing/` |
| ManageSeats | ✅ Ready | `components/billing/` |
| UpgradePrompt | ✅ Ready | `components/billing/` |

### Files Verified
- `dashboard/src/app/dashboard/billing/page.tsx`
- `dashboard/src/components/billing/SeatUsageCard.tsx`
- `dashboard/src/components/billing/BillingStatusCard.tsx`
- `dashboard/src/components/billing/ManageSeats.tsx`
- `dashboard/src/components/billing/UpgradePrompt.tsx`

---

## 9. Environment Requirements

### Required Environment Variables
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_xxx        # Production Stripe key
STRIPE_WEBHOOK_SECRET=whsec_xxx      # Webhook signing secret
STRIPE_TEAM_PRICE_ID=price_xxx       # Team tier price ID

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx     # Service role for admin ops
```

### Stripe Webhook Configuration
1. Set webhook URL: `https://app.ginkoai.com/api/webhooks/stripe`
2. Subscribe to events:
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
   - `checkout.session.completed`

---

## 10. Known Limitations & Deferred Items

### Deferred to Phase 2
1. **Email Notifications**
   - Payment failure notifications
   - Trial expiration warnings
   - Invitation emails

2. **Advanced Features**
   - Subscription pause/resume
   - Custom enterprise pricing
   - Multi-team organizations

### Known Limitations
- Email for invitations not sent (user must share code manually)
- No webhook retry handling (relies on Stripe retries)
- Grace period enforcement is soft (UI warning only)

---

## Launch Readiness Summary

| Category | Status | Notes |
|----------|--------|-------|
| Team Invitations | ✅ Ready | Full flow implemented |
| Member Management | ✅ Ready | Add/remove with protections |
| Seat Billing | ✅ Ready | Stripe integration complete |
| Webhooks | ✅ Ready | 5 event types handled |
| Payment Errors | ✅ Ready | Tracking implemented |
| Free Tier/Trials | ✅ Ready | Limits enforced |
| Security | ✅ Ready | Auth/authz verified |
| Dashboard UI | ✅ Ready | All billing components |

### Final Status: **READY FOR LAUNCH** ✅

---

*Document generated: 2026-01-05*
*Sprint: EPIC-008 Sprint 4 (Billing & Seats)*
*Task: e008_s04_t08*
