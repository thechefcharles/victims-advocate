# NxtStps 2.0 — Architecture Guide

## The 5-Layer Domain Pattern

Every domain built in Phase 4 and later follows this exact structure:

```
lib/server/{domain}/
	{domain}Types.ts        — enums, interfaces, status types
	{domain}Repository.ts   — DB access only (insert*, get*ById, list*ForX)
	{domain}Service.ts      — business logic (create*, get*, list*, update*, resolve*)
	{domain}Policy.ts       — evalX() function dispatched by policyEngine
	{domain}Serializer.ts   — surface-specific output (never shared across roles)
```

Examples that follow this pattern exactly:
- lib/server/referrals/
- lib/server/appointments/
- lib/server/trustedHelper/
- lib/server/trust/
- lib/server/agency/
- lib/server/governance/
- lib/server/notifications/
- lib/server/aiGuidance/
- lib/server/admin/

## Domains That Predate the Pattern (Phase 0-3)

These domains shipped before the layered pattern was established.
They work correctly but look different:

| Domain | Location | Why It's Different |
|--------|----------|---------------------|
| Organization | lib/server/organizations/ | 15 files sharded by concern (membership, profile, state). Normalization in progress. |
| Applicant | lib/server/applicant/ | Split between applicant profile and trusted helper (now moved to lib/server/trustedHelper/) |
| Search | lib/server/search/ | Infrastructure domain, not product domain — intentionally different |
| Auth | lib/server/auth/ | Phase 0 — predates the pattern |
| Matching | lib/server/matching/ | Frozen — serves advocate case-to-org matching, separate from recommendations |

## How a Request Flows

```
app/api/{route}/route.ts
	-> validateInput()
	-> can(action, actor, resource, context)  <- policyEngine.ts dispatches to eval*()
	-> service function
	-> repository function (DB access)
	-> serializer (surface-specific output)
	-> return ApiSuccess<T>
```

## Naming Conventions

**Service functions:** `create*`, `get*`, `list*`, `update*`, `resolve*`
- `createReferral()` — business operation with validation + side effects
- `getApplicantById()` — fetches single record by ID
- `listNotificationsForUser()` — filtered list query
- `resolveAIGuidanceContext()` — assembles runtime context object

**Repository functions:** `insert*`, `get*ById`, `list*ForX`, `update*Record`
- `insertNotificationRecord()` — raw DB insert
- `getAuditEventById()` — raw DB fetch by primary key
- `listReferralsForSourceOrg()` — scoped list query

**Policy evaluators:** `eval*`
- `evalReferral()`, `evalTrustedHelper()`, `evalGovernance()`
- All dispatched from lib/server/policy/policyEngine.ts

**Find functions:** `find*` — conditional lookup that may return null
- `findActiveGrantForPair(applicantId, helperUserId)`

## Key System Rules

**Search Law:** All provider discovery queries go through `provider_search_index`. Never query `organizations` or `programs` tables directly for search/discovery.

**Trust Law:** All trust scoring reads from `trust_signal_aggregates`. Never query raw `cases`, `cvc_applications`, or `programs` for scoring.

**Audit Law:** Every critical mutation calls `logAuditEvent()` from `lib/server/governance/auditService.ts`.

**Policy Law:** All access decisions go through `can(action, actor, resource, context)`. No inline role checks.

**Serializer Law:** Serializers are surface-specific. Never reuse the same serializer across applicant, provider, agency, and admin surfaces.

## Intentional Naming Distinctions (Not Typos)

| Name A | Name B | Why Both Exist |
|--------|--------|----------------|
| `lib/server/policy/` | `lib/server/policies/` | policy/ is the permission engine (can()). policies/ is the consent/legal policy framework (PolicyDocument, PolicyAcceptance). |
| `lib/server/orgSignals/` | `lib/server/trustSignal/` | orgSignals/ is a legacy pre-refactor module. trustSignal/ is the Phase 0.5 canonical trust signal infrastructure. Use trustSignal/. |

## Test Organization

Tests are organized by concern type, not by domain:

```
tests/
	policy/       — policy evaluator tests (one file per domain)
	service/      — service function tests
	serializer/   — serializer safety tests
	state/        — state machine transition tests
	cross-domain/ — multi-domain integration tests
	governance/   — audit hook and governance tests
	{domain}/     — domain-specific test suites (referrals, appointments, etc.)
```

To find all tests for a domain, search across all folders:
`grep -rn "referral" tests/ --include="*.test.ts" -l`

## Environment Setup

```
npm install
cp .env.example .env.local   # fill in Supabase + Anthropic keys
npx tsc --noEmit             # must show 0 errors
npm test -- --passWithNoTests # must show 1,120+ passing
npm run dev                  # starts local dev server
```
