# Surface Inventory — NxtStps UI/UX Audit

**Generated:** 2026-04-15
**Scope:** App Router surfaces (`app/`); authenticated routes, API routes (summary), shared/public pages
**Auth pattern:** Middleware refreshes session on all requests; layout-level role guards enforce access per segment

This is the map for Phase 1 UI/UX work. Use it to prioritize surfaces by role-impact and to spot gaps between API and UI.

---

## Admin Surface

| Route | Guard | Purpose | File |
|---|---|---|---|
| `/admin/audit` | `RequirePlatformAdmin` | Platform audit logs | `app/admin/audit/page.tsx` |
| `/admin/cases` | `RequirePlatformAdmin` | Case management index | `app/admin/cases/page.tsx` |
| `/admin/cases/[id]` | `RequirePlatformAdmin` | Individual case review | `app/admin/cases/[id]/page.tsx` |
| `/admin/dashboard` | `RequirePlatformAdmin` | Admin home (KPIs, action queue) | `app/admin/dashboard/page.tsx` |
| `/admin/designation-reviews` | `RequirePlatformAdmin` | Review org designation requests | `app/admin/designation-reviews/page.tsx` |
| `/admin/designations` | `RequirePlatformAdmin` | Org designation configuration | `app/admin/designations/page.tsx` |
| `/admin/ecosystem` | `RequirePlatformAdmin` | Partner network health | `app/admin/ecosystem/page.tsx` |
| `/admin/grading` | `RequirePlatformAdmin` | Org grading / trust scoring | `app/admin/grading/page.tsx` |
| `/admin/knowledge` | `RequirePlatformAdmin` | Knowledge base admin | `app/admin/knowledge/page.tsx` |
| `/admin/orgs` | `RequirePlatformAdmin` | Organization management | `app/admin/orgs/page.tsx` |
| `/admin/policies` | `RequirePlatformAdmin` | Platform policy management | `app/admin/policies/page.tsx` |
| `/admin/programs` | `RequirePlatformAdmin` | Program catalog | `app/admin/programs/page.tsx` |
| `/admin/users` | `RequirePlatformAdmin` | Platform user administration | `app/admin/users/page.tsx` |

---

## Applicant Surface

**Legacy `/victim/*` routes deleted** (2026-04-15). `next.config.ts:15-21` retains permanent 308 redirects from `/victim/*` → `/applicant/*` as safety nets for old bookmarks.

**Trauma-informed shell verified:**
- ✅ Crisis strip (`ApplicantCrisisStrip` via `ApplicantPathChrome`) — 988 / 911
- ✅ Quick Exit (`TopNav` → `POST /api/safety/quick-exit`)
- ✅ Safety settings at `/settings/safety`
- ❌ No return-to-safety pathway after quick exit; no customizable safety words

### Applicant Routes

| Route | Guard | Purpose | File |
|---|---|---|---|
| `/applicant/case/[caseId]/advocate` | `RequireApplicantRole` | View assigned advocate | `app/applicant/case/[caseId]/advocate/page.tsx` |
| `/applicant/case/[caseId]/organization` | `RequireApplicantRole` | View connected org | `app/applicant/case/[caseId]/organization/page.tsx` |
| `/applicant/dashboard` | `RequireApplicantRole` | Home (cases, messages, next steps) | `app/applicant/dashboard/page.tsx` |
| `/applicant/find-organizations` | `RequireApplicantRole` | Find orgs (geo-map + search) | `app/applicant/find-organizations/page.tsx` |
| `/applicant/find-organizations/connect` | `RequireApplicantRole` | Select help needs before connection request | `app/applicant/find-organizations/connect/page.tsx` |
| `/applicant/messages` | `RequireApplicantRole` | Case-scoped message threads | `app/applicant/messages/page.tsx` |
| `/applicant/organizations/[orgId]` | `RequireApplicantRole` | Org profile (read-only) | `app/applicant/organizations/[orgId]/page.tsx` |

---

## Provider / Advocate Surface

| Route | Guard | Purpose | File |
|---|---|---|---|
| `/advocate` | `RequireAdvocateRole` | Command center dashboard (canonical) | `app/advocate/page.tsx` |
| `/advocate/connection-requests` | `RequireAdvocateRole` | Pending advocate-victim connection requests | `app/advocate/connection-requests/page.tsx` |
| `/advocate/dashboard` | — | **Redirect → `/advocate`** | `app/advocate/dashboard/page.tsx` |
| `/advocate/find-organizations` | `RequireAdvocateRole` | Partner org discovery | `app/advocate/find-organizations/page.tsx` |
| `/advocate/messages` | `RequireAdvocateRole` | Message triage by case | `app/advocate/messages/page.tsx` |
| `/advocate/org-search` | `RequireAdvocateRole` | Advanced org search | `app/advocate/org-search/page.tsx` |
| `/advocate/org` | `RequireAdvocateRole` | Affiliated org workspace | `app/advocate/org/page.tsx` |


---

## Organization / Agency Surface

| Route | Guard | Purpose | File |
|---|---|---|---|
| `/organization/dashboard` | `RequireOrgLeadership` | Leadership home | `app/organization/dashboard/page.tsx` |
| `/organization/settings` | `RequireOrgWorkspaceAccess` | Profile, members, trust scores | `app/organization/settings/page.tsx` |
| `/organization/setup` | `RequireOrganizationAccount` + `RequireAuth` | Onboarding | `app/organization/setup/page.tsx` |

---

## Shared / Public Surface

### Authentication & Onboarding

| Route | Guard | Purpose |
|---|---|---|
| `/` | public | Marketing landing |
| `/login` | public | Login |
| `/signup` | public | Role selector |
| `/signup/advocate` | public | Advocate signup |
| `/signup/organization` | public | Org signup |
| `/signup/consent/{beta,privacy,terms,waiver}` | token check | Consent steps |
| `/forgot-password`, `/reset-password` | public | Password reset |
| `/verify-email` | session | Email verify |
| `/invite/accept` | token | Accept invite |

### Knowledge & Resources

| Route | Purpose |
|---|---|
| `/help`, `/help/how-designations-work`, `/help/how-matching-works`, `/help/transparency` | Educational |
| `/knowledge`, `/knowledge/compensation` | KB browse |
| `/start` | First 72 hours guidance |

### Legal & Consent

`/consent`, `/privacy`, `/terms`, `/waiver`

### Account & Settings

| Route | Guard | Purpose |
|---|---|---|
| `/account` | `RequireAuth` | Profile + affiliations |
| `/account/delete` | `RequireAuth` | Deletion flow |
| `/account-disabled` | session | Suspension notice |
| `/notifications` | `RequireAuth` | Notification management |
| `/settings/safety` | `RequireAuth` | Safety (quick exit, resources) |

### Compensation Intake

All routes gated by `RequireAuth` (any authenticated role). Applicant-facing per `lib/applicant/isApplicantFacingPath.ts`.

| Route | Guard | Notes |
|---|---|---|
| `/compensation` | `RequireAuth` | Hub |
| `/compensation/connect-advocate` | `RequireAuth` | |
| `/compensation/documents` | `RequireAuth` | |
| `/compensation/eligibility/[id]` | `RequireAuth` | |
| `/compensation/intake` | — | **Redirect → `/compensation/intake-v2`** |
| `/compensation/intake-v2` | `RequireAuth` | Canonical intake (template-driven) |

### Dashboard Router

| Route | Guard | Purpose |
|---|---|---|
| `/dashboard` | session | Routes user to role-specific dashboard |
| `/dashboard/clients` | `RequireAuth` | Admin client list |
| `/dashboard/clients/[clientId]` | `RequireAuth` | Admin client detail |

### Debug / Misc

`/coming-soon`, `/data-deletion`, `/debug-admin` — **review for production exposure.**

---

## API Routes (Summary)

Grouped by domain. ~315 routes total; see `app/api/` for full tree.

- **Auth/account** — login, lockout, verification, deletion-request
- **Applicant** — bookmarks, helpers, org-connect-request, profile, geocode, support-overview
- **Advocate** — cases, clients, command-center, org-join, org-search
- **Agency/Org** — analytics, submissions (accept/reject/revise), members, programs, referrals
- **Cases** — documents, notes, messages, referrals; submit/assign/close/appeal/generate-cvc
- **Documents** — download, ocr, share, replace, lock, access-url (signed)
- **Messaging** — threads, attachments, read/unread
- **Compensation** — completeness, match-orgs, routing, timeline, pdfs (IL/IN)
- **Intake (v1 + v2)** — start, submit, save-draft, lock, resume, amend, denial-check
- **Referrals** — accept/reject/cancel/close/send
- **Support Requests** — accept/decline/close/submit/transfer/withdraw *(backend complete, UI missing)*
- **Appointments** — reschedule/cancel/complete
- **Notifications** — read, mark-unread, dismiss, preferences
- **Admin** — designations, org lifecycle, user disable/enable, audit, health, knowledge, CVC templates, disputes, ecosystem, AI escalations
- **Governance** — policies (publish/accept), audit-events
- **AI/Guidance** — sessions, messages, escalations
- **Search** — programs, providers, resources, knowledge
- **Cron** — 7 scheduled jobs (analytics-aggregates, dispute-sla-escalations, intake-reminders, partnership-renewals, referrals-auto-cancel, score-review-expire, analytics-ecosystem)
- **i18n** — translate, mapping-sets, locale-preference
- **Misc** — me, policies, consents, safety (quick-exit), legal consent step, surveys, pilot feedback, newsletter, debug

---

## Key Findings (for UX prioritization)

1. **SupportRequest has no UI.** Full backend, zero frontend. Greenfield — ideal first Figma surface.
2. ~~`/applicant` and `/victim` duplicates~~ — **resolved 2026-04-15.** `app/victim/*` deleted; 308 redirects retained in `next.config.ts`. Canonical `FindOrganizationsMapSection` lives under `app/applicant/`.
3. ~~Two advocate dashboards~~ — **already resolved.** `/advocate/dashboard` is a redirect to `/advocate`.
4. ~~`/compensation/*` admin-gated~~ — **misread.** `RequireAdmin` was a misnamed auth-only guard. Deleted and replaced with `RequireAuth` (which already existed).
5. ~~Intake v1 / v2 coexistence~~ — **already resolved.** `/compensation/intake` redirects to `/compensation/intake-v2`.
6. **Debug routes** (`/debug-admin`) in the tree — confirm production posture.
7. **Trauma-informed shell is in place** for `/applicant/*`. New surfaces must reuse `ApplicantPathChrome`, not reinvent.

---

## Route Statistics

- UI pages (`page.tsx`): **~67** (after 2026-04-15 victim-route deletion)
- API routes (`route.ts`): **~310** (after /api/victim deletion)
- Role-gated surfaces: 4 (Admin, Applicant, Advocate, Organization)
- Guards in use: `RequirePlatformAdmin`, `RequireAdvocateRole`, `RequireApplicantRole`, `RequireOrgLeadership`, `RequireOrgWorkspaceAccess`, `RequireAuth`

---

## Suggested Phase 1 Surface Order

Based on inventory + user-pain heuristic:

1. **SupportRequest (new)** — greenfield, no UI to migrate, high leverage for applicant→org loop
2. **Applicant dashboard + case views** — first impression post-intake
3. **Advocate command center (`/advocate`)** — provider retention driver
4. **Organization dashboard + settings** — org-level operations
5. **Admin surfaces** — last (internal tolerance is highest)

End of inventory.
