# NxtStps Coding Context

This file makes the Notion Coding Context pages readable by Claude Code.
Claude Code cannot read Notion — this file is the bridge.

**Source of truth:** NxtStps Vibe Coding OS → 01 — NxtStps 2.0 → Coding Context
**Update this file** whenever the Notion Coding Context pages change.
**Read this file** on every session before running any domain prompt.

---

## PART 1 — TRAUMA-INFORMED UI RULES

These are **hard architectural constraints** on every applicant-facing surface.
Not style guidelines. Every rule below is enforced on every applicant-facing page.

Source: Master Doc Section 3 (Trauma-Informed Guidance System),
Section 12 (Risk 8 — Victim Distrust of Technology), `.cursor/rules/` files.

---

### Rule 1 — Exit Safely is always visible without scrolling

Every applicant-facing page must have the Exit Safely button visible in the
viewport at all times. It cannot be below the fold. It cannot require scrolling.

```typescript
// Required on every applicant-facing layout
<ExitSafelyButton /> // always fixed position, always visible
```

Verification: visual test — shrink viewport to mobile, confirm button visible
without scrolling.

---

### Rule 2 — One question at a time in intake

Intake does not show multiple questions on a single screen.
One question, one screen, one action. This is not a preference — it is how
the system is built and must remain so.

If a feature requires showing multiple fields simultaneously, flag to human
for design review before implementing.

---

### Rule 3 — Every sensitive question has a skip option

Sensitive questions (crime details, relationship to victim, contributory conduct,
anything trauma-adjacent) must include a visible skip option.

Skipped responses are tracked distinctly from empty responses in `fieldState`.
Never treat a skipped field the same as an unanswered field.

```typescript
// Correct
<SkipButton onClick={() => setFieldState(field, makeSkippedEntry())} />

// Wrong — no skip option, or skip treated as empty
```

---

### Rule 4 — No countdown timers or time pressure on sensitive sections

No progress bars showing "you have X minutes left."
No session expiration warnings on sensitive question screens.
No urgency language on any applicant-facing screen.

Session expiration warnings, if needed, appear on a neutral interstitial
screen — not on a question screen.

---

### Rule 5 — Safe-mode presentation for high-sensitivity sections

Sections covering: crime details, relationship to deceased, contributory conduct,
immigration status, domestic violence circumstances — must activate
`<GroundingPauseBanner />` and remove time-pressure elements from the viewport.

```typescript
// Required for high-sensitivity intake steps
{isSensitiveStep && <GroundingPauseBanner />}
```

---

### Rule 6 — Autosave every 800ms on all intake steps

No applicant loses progress. Autosave is debounced at 800ms.
Save indicator is calm and unobtrusive (no flashing spinner).
On reconnect after network loss, last saved state is restored.

This is already built in `lib/intake/autosave.ts`.
**DO NOT change the 800ms debounce interval without explicit human approval.**

---

### Rule 7 — No red for non-errors

Red is reserved for actual errors and critical alerts only. Do not use red for:

- Progress indicators
- Step completion status
- "Incomplete" field states
- Navigation elements

Use amber/yellow for warnings. Use `var(--color-error)` only for genuine errors.

---

### Rule 8 — Plain language at sixth-to-eighth grade reading level

All applicant-facing copy — labels, help text, error messages, status updates —
targets sixth-to-eighth grade reading level.

Examples of correct rewrites:

- "Submit your application" → "Send your application"
- "Authentication failed" → "We couldn't sign you in. Try again."
- "Eligibility determination" → "Whether you qualify"
- Bureaucratic status codes → plain English explanation

Do not use technical jargon on any applicant-facing surface.

---

### Rule 9 — Safety mode suppresses external notifications

When `safetyModeEnabled = true` on a user's AuthContext:

- Email notifications must use neutral subject lines
  ("Update from NxtStps" not "Your compensation claim status")
- SMS notifications must not include case details
- Push notifications must not include sensitive content
- Communications route through the advocate, not directly to the victim

Every notification template must check `safetyModeEnabled`.
Enforced in Domain 7.2 Notifications.

---

### Rule 10 — Advocate-assisted workflow is a first-class path, not a fallback

Victims are never required to interact with the platform directly.
Every intake flow, every document upload, every application step must work
when an advocate operates on the victim's behalf.

Implementation implication: any feature requiring victim's direct interaction
(biometrics, device-specific features, etc.) must have an advocate-operated
equivalent path.

---

### Trauma Rules — Domain Implications

| Domain | Specific constraint |
|--------|---------------------|
| 2.1 Intake | One question per screen, skip options, GroundingPauseBanner on sensitive steps, 800ms autosave |
| 1.3 Messaging | No notification content leaks case details when safety mode is on |
| 1.4 Documents | Upload flow is operable by advocate on behalf of victim |
| 3.1 Applicant | Safety preferences page must be first thing visible in applicant settings |
| 3.4 Discovery | No urgency language in provider availability ("Only 2 spots left" — forbidden) |
| 7.2 Notifications | Every template must handle safetyModeEnabled = true with neutral content |
| 7.3 AI Chatbot | Escalation path to human/crisis resources always visible; no clinical claims |

---

### The Crisis Strip

Every applicant-facing page must include the crisis strip component.
It is not optional. It is not dismissible on sensitive pages.

The crisis strip contains:

- National Domestic Violence Hotline: 1-800-799-7233
- Crisis Text Line: Text HOME to 741741
- Local emergency: 911

The crisis strip is part of the applicant layout shell.
It is never removed by individual page components.

---

## PART 2 — COMPLIANCE BUILD GATES

These are **hard deadlines** that affect domain build priority.
This page tells you what must be built when and why it gates other work.

Source: Master Doc Section 6 (Technical Architecture),
Section 10 (Security, Privacy & Data Governance), SOC 2 roadmap.

---

### SOC 2 Timeline

SOC 2 certification is a prerequisite for most state government contracts.

| Milestone | Target | What it gates |
|-----------|--------|---------------|
| SOC 2 readiness assessment | Month 2–3 post-funding | Identifies architecture gaps |
| Controls documentation complete | Month 4–6 | Access control, audit logging, encryption, incident response |
| Internal controls testing | Month 6–8 | Verify controls operate as documented |
| **SOC 2 Type I audit** | **Month 9** | **First statewide contract conversation** |
| SOC 2 Type II observation | Month 9–18 | Ongoing — controls must operate consistently |
| **SOC 2 Type II certification** | **Month 18** | **First statewide contract close** |

### Domains required before Month 9 Type I audit

These domains must be locked before the SOC 2 Type I audit can proceed:

- **0.2 Auth / Identity** — session hardening, rate limiting, MFA consideration
- **0.3 Permissions / Policy Engine** — access control documentation
- **0.5 Trust Signal Infrastructure** — audit logging
- **1.4 Documents + Consent** — encrypted storage, signed URLs, access logging
- **7.1 Governance / ChangeRequest** — change control documentation

---

### VOCA / VAWA Confidentiality

Applies to: all applicant data, all case data, all communications.

What it requires in code:

- Victim-identifying information may not be disclosed without prior written
  informed consent
- Consent must be collected, versioned, and logged at point of first use (Domain 1.4)
- Disclosure workflows require explicit authorization — no defaulting to open
- The `ConsentGrant` table is the enforcement mechanism

Domains affected: 0.2, 1.2, 1.4, 3.1, 7.2

---

### HIPAA-Adjacent Standards

Applies to: medical bills, provider records, injury documentation, counseling
records uploaded to the platform. NxtStps is not a covered entity, but
government procurement reviewers evaluate against HIPAA standards.

What it requires in code:

- Access controls on health-related documents
- Audit logging on every document view/download
- Data use limitations — health data used only for the case it belongs to
- Encryption at rest (AES-256) and in transit (TLS 1.3)
- **Signed URL access only — no persistent public URLs for any document**

Domains affected: 1.4, 0.2, 7.1

---

### CJIS (Criminal Justice Information Services)

Applies to: police reports, court records, case numbers, offender information.

What it requires in code:

- Encryption standards meet CJIS policy
- Access management: only explicitly authorized roles can view CJIS-adjacent data
- Audit trail: every access to criminal justice information logged

Domains affected: 1.4, 0.3, 7.1

---

### US-Only Data Residency

This is an **architectural constraint, not a policy**.

What it requires in code:

- Supabase project must be on US-region hosting
- Any third-party API calls (OCR, AI) must use US-region endpoints where available
- No client-side data processing routing sensitive data through non-US CDN nodes

Applies to: all domains.

---

### Data Classification

Every domain spec has a "Data class" field. Use these definitions consistently:

| Class | Description | Examples |
|-------|-------------|----------|
| **Class A — Restricted** | Strict RLS, server-side policy, serializer minimization, audit logging, no public caching | Applicant identity, case data, documents, consent, messages, safety settings, AI chat |
| **Class B — Sensitive Operational** | Access controls, audit logging | Provider internal notes, audit logs, admin data, draft outputs |
| **Class C — Controlled Business** | Role-based access | Org profiles, programs, non-public events, templates |
| **Class D — Public** | Can be cached | Public provider profiles, public trust indicators, public resources |

---

### Required Security Tests Per Domain (Class A or B)

Every domain touching Class A or B data must include tests for ALL 10 categories:

```
1. Unauthenticated denial        — no token → AUTH_REQUIRED
2. Cross-tenant denial           — different org → FORBIDDEN
3. Assignment/ownership denial   — not assigned → FORBIDDEN
4. Consent-gated denial          — no ConsentGrant → CONSENT_REQUIRED
5. Serializer non-leakage        — provider-internal fields absent from applicant output
6. Secure file access            — signed URL only; expired URL denied
7. Notification safe content     — safety mode on → neutral content only
8. Audit event creation          — every state transition creates audit record
9. Revoked/expired access        — revoked membership → access denied
10. Admin/support access audited — admin action creates audit event
```

These are not optional. They map directly to the lock checklist.

---

### Encryption Requirements

| Layer | Standard | Implementation |
|-------|----------|----------------|
| Data at rest | AES-256 | Supabase — verify project settings |
| Data in transit | TLS 1.3 | Vercel + Supabase — verify settings |
| File storage | Encrypted buckets | Supabase Storage — private buckets only |
| File access | Signed URLs, time-limited | `app/api/documents/access-url/route.ts` pattern |
| Ultra-sensitive fields | Field-level encryption | Trauma narratives, financial accounts, immigration info |

Note: field-level encryption is not yet implemented. It is a Domain 1.4 deliverable.

---

## PART 3 — PILOT SUCCESS METRICS

These are the five specific, measurable outcomes the platform is being built to achieve.
These metrics close the first statewide contract.

Source: Master Doc Section 7 (Traction), Section 13 (Illinois Financial Model).

---

### Metric 1 — Application Completeness at Submission

**Baseline:** 45–55% of IL applications complete at submission
**Target: 85–90% complete at submission**

Domains: 2.1 Intake, 1.4 Documents, 2.3 CVC Alignment Engine, 1.2 Case

**Code implication:** The completeness check is a **workflow gate**, not a UI warning.
A case cannot advance to `submitted` status unless completeness passes threshold.
This must be enforced in the Case state machine.

---

### Metric 2 — Advocate Administrative Time Reduction

**Baseline:** Advocates spend 55–65% of working hours on administrative functions
**Target: 25–40% reduction in administrative time**

Domains: 2.1 Intake, 2.3 CVC Alignment, 1.4 Documents, 6.2 Agency Reporting, 7.3 AI Chatbot

**Code implication:** Every feature requiring an advocate to manually re-enter data
that already exists in the system is a regression against this metric.
If intake has the data, the PDF should be auto-populated.
If the case has the data, the compliance report should be auto-generated.
No manual re-entry.

---

### Metric 3 — Processing Time Improvement

**Baseline:** 281-day median from filing to payment. 73% take over 1 year.
**Target: 140–180 days for applications submitted through the platform**

Domains: 1.2 Case, 2.3 CVC Alignment, 6.2 Agency Reporting

**Code implication:** The case timeline must capture accurate timestamps at every
state transition. Processing time is calculated from `intake_submitted_at` to
`determination_received_at`. Both must be stored. No approximations.

---

### Metric 4 — Preventable Denial Reduction

**Baseline:** ~800–1,000 preventable denials per year in Illinois
**Target: 40–50% reduction = 320–500 fewer preventable denials per year**

Domains: 1.4 Documents, 2.3 CVC Alignment, 2.1 Intake

**Code implication:** The OCR consistency check is the primary mechanism.
When a medical bill date predates the crime date — flag it.
When an amount doesn't match what was reported — flag it.
When a required signature field is blank — flag it.
These checks are what the product is being built around.

---

### Metric 5 — Pilot-to-Paid Conversion

**Target: 50–70% of pilot organizations convert to paid within 90 days**

Domains: All of them.

**Code implication:** Reliability matters more than features at the pilot stage.
A platform that crashes or loses data during a pilot has zero chance of conversion.
The validation gates (TypeScript, tests, build, Vercel preview) exist because of
this metric.

---

### Illinois Baseline Data (for test data parameters)

| Data point | Value | Source |
|------------|-------|--------|
| Annual CVC claims filed | ~3,677 | 2025 peer-reviewed study |
| Current award rate | 36.7% | Same study |
| Median processing time | 281 days | Same study |
| Claims taking over 1 year | 73% | DOJ OIG Audit 2024 |
| IL FY2025 VOCA allocation | $8,024,000 | Official VOCA data |
| Annual admin spend (estimated) | $6.74M | Master Doc bottom-up model |
| Questioned costs in 2024 OIG audit | $125,165 | DOJ OIG Audit |

---

## QUICK REFERENCE — What Claude Code must do with this file

1. **Read this file in full** at the start of every session (before domain prompts)
2. **Check trauma rules** whenever writing any applicant-facing component or layout
3. **Check compliance gates** when speccing security tests or data classification
4. **Reference pilot metrics** when writing domain implementation notes to confirm
   the domain's metric contribution is correctly captured
5. **Never change Rule 6** (800ms autosave) without explicit human approval
6. **Never remove the crisis strip** from any applicant-facing layout
7. **Always use signed URLs** for document access — never persistent public URLs
