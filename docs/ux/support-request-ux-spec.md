# SupportRequest — UX Behavior Spec

**Domain:** 1.1 SupportRequest
**Generated:** 2026-04-15
**Status:** Backend complete; **no UI exists** — this spec is the contract for building one.
**PM decisions locked:** 2026-04-15 (see §7).

Every claim below cites `file:line` for existing behavior. Sections marked **[LOCKED 2026-04-15]** describe decisions not yet in code — they are the build contract. If the code changes, update this spec. If Figma disagrees with this spec, Figma is wrong.

---

## 1. States & Transitions

### States (9 — **post-lock**)

Source: `lib/server/supportRequests/supportRequestStateMachine.ts:22–38` for the 8 existing states. `transfer_pending_consent` is **[LOCKED 2026-04-15]** and not yet in code.

| State | Kind | Meaning |
|---|---|---|
| `draft` | active | Applicant creating; not yet submitted |
| `submitted` | active | Applicant finished; awaiting provider pickup |
| `pending_review` | active | Provider actively reviewing |
| `transfer_pending_consent` | active | **[LOCKED]** Provider initiated transfer; awaiting applicant consent to share data with target org |
| `accepted` | active | Provider accepted; Case created (Domain 1.2) |
| `declined` | terminal | Provider or system rejected; carries `decline_category` + optional provider-only `decline_note` |
| `transferred` | terminal | Applicant consented; request moved to target org (original org retains record via `transferred_from_organization_id`) |
| `withdrawn` | terminal | Applicant cancelled before decision |
| `closed` | true-terminal | Final; no outbound edges |

### Allowed Transitions

Existing edges source: `lib/server/workflow/transitions.ts:95–107`.
Edges marked **[LOCKED]** are new per 2026-04-15 decisions, not yet in code.

```
draft                     → submitted                   (applicant: submit)
submitted                 → pending_review              (provider: begin review)
pending_review            → accepted                    (provider: accept)
pending_review            → declined                    (provider: decline + category [+ optional note])
pending_review            → declined                    [LOCKED] (system: Day-7 SLA auto-decline, category=no_response)
pending_review            → transfer_pending_consent    [LOCKED] (provider: initiate transfer + target + reason)
transfer_pending_consent  → transferred                 [LOCKED] (applicant: consent to share with target org)
transfer_pending_consent  → pending_review              [LOCKED] (applicant: declines consent → falls back to original org)
transfer_pending_consent  → withdrawn                   [LOCKED] (applicant: withdraws instead of deciding)
draft                     → withdrawn                   (applicant: withdraw)
submitted                 → withdrawn                   (applicant: withdraw)
accepted                  → closed                      (provider: close)
declined                  → closed                      (provider: close)
transferred               → closed                      (provider: close — at target org)
withdrawn                 → closed                      (provider: close)
```

**No reverse edges from terminal states.** No un-submit, no un-decline, no un-accept. The `transfer_pending_consent → pending_review` edge is not a reverse of a terminal — it's the declined-consent fallback.

### Guards & Invariants

1. **One active request per applicant.** Active set now includes `transfer_pending_consent`. Enforced at service + DB partial index.
   `lib/server/supportRequests/supportRequestService.ts:99–107`
2. **Decline requires `decline_category`** (one of 6 enum values). Optional `decline_note` (free text, **provider/admin/audit only — never serialized to applicant view**). **[LOCKED]** Replaces the current free-text `decline_reason`.
3. **Transfer requires `target_organization_id` + `transfer_reason`.** `app/api/support-requests/[id]/transfer/route.ts:25–31` (current). **[LOCKED]** Transfer now enters `transfer_pending_consent`, not `transferred`.
4. **Withdraw allowed from `draft`, `submitted`, or `transfer_pending_consent`.** `supportRequestService.ts:435–442` (current covers first two; `transfer_pending_consent` is **[LOCKED]** addition).
5. **Optimistic concurrency** via `expectedFromStatus` on every update. `supportRequestRepository.ts:148–164`
6. **[LOCKED] SLA auto-decline.** A daily cron (modeled on `dispute-sla-escalations`) decides the Day-3/Day-5/Day-7 fan-out per `organizations.sla_response_days` (default 7).

---

## 2. Role × Action Matrix

Source: `lib/server/policy/policyEngine.ts` (`evalSupportRequest`); verified by `tests/policy/support_request.policy.test.ts:97–282`

Role sets:
- **ACCEPT_LEADERSHIP** = {org_owner, program_manager, supervisor} — **victim_advocate is explicitly excluded** (read-only)
- **CASE_STAFF** = ACCEPT_LEADERSHIP + {victim_advocate, intake_specialist}

| Action | Applicant | org_owner | program_mgr | supervisor | victim_advocate | intake_specialist | System (cron) | Admin |
|---|---|---|---|---|---|---|---|---|
| Create | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View | ✅ (own) | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Update (draft) | ✅ (own) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Submit | ✅ (own) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Accept | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Decline | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ *(SLA auto-decline only)* | ✅ |
| Initiate transfer | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Consent to transfer** *(new)* | ✅ (own) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Decline transfer consent** *(new)* | ✅ (own) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Withdraw | ✅ (own) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Close | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Assign | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Edit org SLA | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**Tenant scope:** create has no tenant check (applicant picks any org); all other actions require `assertSameTenant`. Cross-org access denied. `tests/policy/support_request.policy.test.ts:183–191`

**Consent gate:** every action runs `checkConsent(context)`. No ConsentGrant → all actions denied.

---

## 3. Current UI Surfaces

**None.** Grep of `app/**/*.tsx` finds zero imports of `supportRequest` or `/api/support-requests`.

Likely integration points once built:
- **Applicant:** `/applicant/find-organizations/connect` (entry), `/applicant/dashboard` (status display)
- **Provider:** `/organization/dashboard` (inbox), `/advocate/dashboard` (read-only awareness)
- **Admin:** none planned; leverage existing audit views

This is **greenfield** — no migration debt. Ideal first surface for a new Figma component system.

---

## 4. Copy Inventory (i18n)

Grep `lib/i18n/en.ts` for `support.*request` returns **zero matches** for SupportRequest UI copy.

The three hits that exist (`supportTeamPendingOrgConnectsTitle`, `supportTeamAdvocateMorePending`, `supportTeamAdvocateRequestPending`) are for a different feature (org-connection requests, not SupportRequest).

**Every user-facing string needs to be drafted**, including:
- Entry CTA ("Ask this organization for help")
- Submit confirmation + success states
- Status labels for 8 states (applicant + provider versions)
- Provider action buttons (Accept / Decline / Transfer / Close)
- Decline reason templates
- Transfer org picker
- Error states (one-active-request, invalid state, consent missing)
- Empty states (no requests, no queue)

Per `docs/CODING_CONTEXT.md` Rule 8: 6th–8th grade reading level, no jargon.
Per `feedback_spanish_no_machine_translate.md`: never auto-translate `lib/i18n/es.ts`; add dated FIXME for human review.

---

## 5. Known Friction & Gaps

1. **No UI exists.** Entire domain is invisible to users.
2. **Generic optimistic-concurrency errors** (`"Request was modified by another action."`) bubble up as `FORBIDDEN`. Not user-friendly. `supportRequestService.ts:156, 204, 266, 339, 413, 472, 520`
3. **No timeout / SLA.** `pending_review` can live forever. No cron ages requests out. (Contrast with `dispute-sla-escalations` cron that exists for disputes.)
4. **Decline reasons are raw free-text** and always shown to applicant verbatim via `status_reason`. `supportRequestSerializer.ts:38` — trauma-informed UX risk.
5. **Transfer mutates `organization_id` in place** rather than creating a new request at the target. Original org loses the record. `supportRequestService.ts:407` — audit only via `transfer_reason`.
6. **No withdraw after accept.** Applicant must manage via Case once accepted; no bridge in UI planned.
7. **`assign` action exists in policy but no service method and no API route.** `tests/policy/support_request.policy.test.ts:253–260` passes on stub.
8. **No bulk provider actions.** 1-to-1 accept/decline only.
9. **Case links back to SupportRequest one-way.** `supportRequestRepository.ts:169–180` — Case UI can't deep-link home.
10. **No document attachment wired.** `app/api/support-requests/[id]/documents/route.ts` exists but no UI.

---

## 6. Edge Cases Visible in Code

| Scenario | Current behavior | File:line |
|---|---|---|
| Provider never responds | Stays in `pending_review` forever (no expiry) | no code |
| Applicant cancels after accept | Blocked — must close Case instead | `supportRequestService.ts:435–442` |
| Duplicate simultaneous requests | Blocked by one-active constraint | `supportRequestService.ts:100–107` |
| New request after decline/withdraw | Allowed immediately (terminal states don't count as active) | `supportRequestRepository.ts:98–111` |
| Race: provider accept vs applicant withdraw | Optimistic concurrency — one wins, other gets generic FORBIDDEN | `supportRequestRepository.ts:158` |
| Transfer to non-existent org | **Not validated** — stale `organization_id` possible | `supportRequestService.ts:407` |
| Whitespace-only decline reason | Service trims, but output may still be empty to applicant | `supportRequestService.ts:298–300` |
| Submitted → pending_review | Atomic in `submit()` call; applicant never sees a pause between them | `supportRequestService.ts:180–196` |

---

## 7. Locked Decisions (2026-04-15) — formerly Open Questions

All Q1–Q10 below were originally open questions. Status now **RESOLVED** with PM decisions captured here, or **DEFERRED** with a working assumption noted. These are the build contract.

### Q1 — Submitted vs Pending Review → **DEFERRED**

Low-impact UX detail; decide during wireframing.
**Working assumption:** Collapse to a single applicant-visible label *"Received — awaiting review"* until a provider opens the request, then *"In review"*.

### Q2 — Decline reason display → **RESOLVED**

- 5 templated provider categories: **At Capacity**, **Outside Service Area**, **Program Mismatch**, **Eligibility**, **Other**.
- 6th system-only category: **`no_response`** (used by Day-7 SLA auto-decline).
- Storage: `decline_category` (enum) + optional `decline_note` (free text).
- **`decline_note` is provider/admin/audit only — never serialized to ApplicantView.**
- Applicant sees only the templated category copy at 6th–8th-grade reading level.
- "Other" requires the provider to fill `decline_note` (still hidden from applicant; reviewed by admin).

### Q3 — Withdraw after accept → **DEFERRED**

Current behavior preserved: applicant cannot withdraw from `accepted`; must close via Case (Domain 1.2). UI must clearly hand off: *"Once an organization accepts, your request becomes a Case. Manage it from your Cases tab."*

### Q4 — Transfer semantics → **RESOLVED**

- Transfer is **two-step with applicant consent.**
- Provider initiates → request enters `transfer_pending_consent` (new state).
- Applicant sees *"Share your info with [new org]?"* prompt.
  - **Approve** → `transferred`; `organization_id` updated to target; `transferred_from_organization_id` retains original.
  - **Decline** → falls back to `pending_review` at original org.
  - **Withdraw** → `withdrawn`.
- Original org keeps the record in a "transferred" history view (does not vanish from their queue).
- Per VOCA/VAWA confidentiality (CODING_CONTEXT Part 2), re-consent is required and logged via `ConsentGrant`.
- Conversation history carryover: **moot for v1** (no messaging exists at `pending_review`).

### Q5 — Assignment feature → **DEFERRED (v2 backlog)**

Policy allows; no service/API/UI. Add TODO comment in `policyEngine.ts` referencing this spec.

### Q6 — SLA / timeout → **RESOLVED**

- New column: `organizations.sla_response_days` (integer, default **7**, admin-editable).
- Daily cron (modeled on existing `dispute-sla-escalations` pattern):
  - **Day 3** (T+3 from `submitted_at`): provider reminder notification (internal, not applicant-visible).
  - **Day 5**: applicant-visible status update with warm copy + discovery CTA.
  - **Day 7** (or `sla_response_days`): auto-decline. Transition `pending_review → declined` with `decline_category = no_response`. Applicant copy: *"This organization wasn't able to respond in time. That's not about you — here are other organizations that may help."*
- Cron route to add: `app/api/cron/support-request-sla/route.ts`.

### Q7 — Declined-org visibility to applicant → **DEFERRED**

**Working assumption:** Show declined requests in a "History" tab on applicant dashboard, not in the active queue. Confirm during wireframing.

### Q8 — Connection to referral domain → **DEFERRED**

No cross-domain wiring in v1. Revisit when referral-from-decline becomes a use case.

### Q9 — Cooldown after decline → **DEFERRED**

No cooldown in v1. One-active-request invariant is sufficient. Revisit if abuse is observed.

### Q10 — Document attachment scope → **DEFERRED (v2)**

Backend has the route; v1 ships without document attachment on SupportRequest. Documents enter the picture once a Case exists (Domain 1.4).

### Q11 — Batch operations → **DEFERRED (v2)**

v1 ships 1-to-1. Revisit when a real provider has >20 in queue.

---

### Backend punch list derived from locked decisions

These are the concrete code changes required before SupportRequest UI can be built:

1. **State machine**: add `transfer_pending_consent` state and 4 new edges (see §1).
2. **Schema migration**:
   - `support_requests`: replace `decline_reason` with `decline_category` (enum, 6 values) + `decline_note` (text, nullable).
   - `support_requests`: add `transferred_from_organization_id` (uuid, nullable, FK organizations).
   - `organizations`: add `sla_response_days` (int, default 7, NOT NULL).
3. **Serializer**: ensure `decline_note` is **never** included in ApplicantView (`supportRequestSerializer.ts:38` area).
4. **Service**:
   - New actions: `consentToTransfer`, `declineTransferConsent` (applicant-only).
   - Modify `transfer()` to enter `transfer_pending_consent` instead of `transferred` directly.
   - Wire `ConsentGrant` creation on consent-to-transfer.
   - Add system path that sets `decline_category = "no_response"` for SLA auto-decline.
5. **Policy**: add `support_request:consent_transfer` and `support_request:decline_transfer_consent` actions (applicant-only, ownership-scoped not tenant-scoped).
6. **Cron**: new route `app/api/cron/support-request-sla/route.ts`; add to `vercel.json` daily schedule. Reuse `cronRunLogger`.
7. **i18n**: add `lib/i18n/en.ts` keys for 6 decline categories (applicant-facing) + transfer consent prompt + Day-5 warm copy + Day-7 auto-decline copy. Spanish flagged FIXME for human review (per memory rule).
8. **Admin UI** (Phase 2, not v1-blocking): `sla_response_days` editor on org admin page.

---

## 8. API Surface (Complete)

All require `requireAuth()` + `requireFullAccess(ctx, req)`.

| Method | Endpoint | Body | Returns | Policy action |
|---|---|---|---|---|
| GET | `/api/support-requests?status=` | — | `SupportRequestView[]` | view |
| POST | `/api/support-requests` | `organization_id, program_id?` | ApplicantView | create |
| GET | `/api/support-requests/:id` | — | View | view |
| PATCH | `/api/support-requests/:id` | `organization_id, program_id` | ApplicantView | update_self |
| POST | `/api/support-requests/:id/submit` | — | ApplicantView | submit |
| POST | `/api/support-requests/:id/accept` | — | ProviderView | accept |
| POST | `/api/support-requests/:id/decline` | `decline_reason` | ProviderView | decline |
| POST | `/api/support-requests/:id/transfer` | `target_organization_id, transfer_reason` | ProviderView | transfer |
| POST | `/api/support-requests/:id/withdraw` | — | ApplicantView | withdraw |
| POST | `/api/support-requests/:id/close` | — | ProviderView | close |
| GET | `/api/support-requests/:id/documents` | — | `WorkflowDocument[]` | (workflow doc) |

---

## 9. Data Model

`lib/server/supportRequests/supportRequestTypes.ts:19–37`

```ts
SupportRequestRecord {
  id, applicant_id, organization_id, program_id,
  status, created_at, updated_at,
  submitted_at, reviewed_at, accepted_at, declined_at,
  withdrawn_at, closed_at,
  decline_reason, transfer_reason,
  case_id, state_workflow_config_id
}
```

Serializer boundaries:
- **ApplicantView** (`:86–98`): hides `reviewed_at`, `transfer_reason`, `case_id`, `applicant_id`; exposes `status_reason` (= `decline_reason` iff status=`declined`)
- **ProviderView** (`:104–121`): all fields except `state_workflow_config_id`

---

## 10. Trust Signals Emitted

`supportRequestService.ts:206–217, 268–279, 341–352, 522–533`

- `support_request.submitted`
- `support_request.accepted`
- `support_request.declined`
- `support_request.closed`

UI should subscribe/display these via the notifications domain, not re-query status.

---

## 11. What to Build (Figma Scope for Phase 1)

### Applicant screens (by state, per CODING_CONTEXT Rule 2 — one question per screen applies to intake, not this domain, but trauma rules still hold)

1. **Entry** — "Ask this organization for help" CTA on org profile
2. **Draft** — review what applicant is asking for; edit / submit / withdraw
3. **Submitted** — "We sent your request" confirmation + next-step expectation
4. **Pending review** — "This organization is reviewing your request" (may collapse with submitted)
5. **Accepted** — celebratory but trauma-calm; link into Case
6. **Declined** — gentle framing; show templated reason; next steps (try another org)
7. **Transferred** — "Forwarded to [new org]"; explain why
8. **Withdrawn** — confirmation; offer to start new request
9. **Empty state** — no active request; discovery CTA

### Provider screens

1. **Inbox** — list of active requests for the org (submitted + pending_review), sortable by age
2. **Detail** — full applicant view + Accept / Decline / Transfer buttons
3. **Decline modal** — templated reasons + optional note
4. **Transfer modal** — org picker + reason (free text)
5. **Accepted view** — read-only with link to Case
6. **Closed/terminal view** — historical record

### Must reuse

- `ApplicantPathChrome` (crisis strip + quick exit) on every applicant screen
- Existing Tailwind tokens — don't create new colors/spacing
- `can()` / policy engine — never inline role checks in components

### Must follow

- Trauma Rules 1, 4, 7, 8, 9, 10 (CODING_CONTEXT Part 1)
- i18n keys in `lib/i18n/en.ts`; Spanish never auto-translated
- Audit log: every state transition already emits; UI should display timeline

---

End of spec. When Figma work begins, open questions in §7 must be answered first.
