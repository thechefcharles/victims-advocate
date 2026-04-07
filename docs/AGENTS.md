# NxtStps Agent Rules

## READ THIS BEFORE DOING ANYTHING

---

## Shell Environment

Non-interactive shells (including Claude Code) may not include Homebrew on `PATH`, so `gh` and other CLI tools can be missing. Run this at the start of a session when needed (or ensure the host profile exports it):

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
```

---

## Universal Rules (apply to all projects)

1. Never skip the Analysis stage. No code without analysis first.
2. Never modify existing migration files. Only add new ones.
3. Never delete working code without explicit human approval in the prompt.
4. Never write business logic in route handlers or UI components.
5. Never expose raw database responses. Serializers required.
6. Never proceed past a scope boundary. If a fix requires touching files outside the domain, document it and stop.
7. Never guess at architectural decisions. Stop and flag if the prompt doesn’t cover a situation.
8. Always log deferred items explicitly in your output.
9. Always produce structured output matching the format specified in the prompt.
10. Always stay within the file list given. Do not touch unlisted files.

---

## NxtStps-Specific Rules

11. Trust Law: never query `cases`, `routing_runs`, `completeness_runs`, or `case_messages` from within `lib/server/grading/` or `lib/server/trust/`. Those domains consume signals only.

12. Search Law: never query the `organizations` table for discovery. Use `provider_search_index` only.

13. Migration timestamps: all new migrations must have timestamps after `20260501400000`.

14. Naming: use `applicant` not `victim` in all new code. Legacy `ProfileRole = "victim"` stays in existing files only.

15. Exit Safely button must be visible without scrolling on every applicant-facing page.

16. Transition Law: all entity status changes must go through transition() in
    lib/server/workflow/engine.ts. No direct .update({ status }) calls anywhere.
    Enforcement: grep -r ".update({" lib/server/ app/api/ | grep status | grep -v workflow
    must return zero hits outside workflow/engine.ts.

17. Policy Law: all authorization decisions must go through can() in
    lib/server/policye.ts. No inline role checks (ctx.role ===,
    ctx.isAdmin, ctx.accountType ===) as final authority in route handlers or services.
    Enforcement: grep -r "ctx\.role ===" app/api/ lib/server/ | grep -v policyEngine
    | grep -v test must return zero.

18. No countdown timers or time-pressure indicators on any applicant-facing screen.

19. Autosave in intake is 800ms debounce. Do not change this without explicit approval.

20. Safety mode (`safetyModeEnabled = true`) suppresses notification content on all channels. Every notification template must handle this.

21. Class A data (applicant identity, case data, documents, consent, messages) requires: strict RLS, server-side policy, serializer minimization, audit logging, no public caching, encrypted storage.

22. Every domain touching Class A or B data must include all 10 security test categories (see Compliance Build Gates page).

23. No persistent public URLs for any document. Signed URLs only, time-limited.

24. SOC 2 Type I target is Month 9 post-funding. Domains 0.2, 0.3, 0.5, 1.4, and 7.1 must be locked before that audit.

---

## Base Truths (never change these files)

- `lib/pdfMaps/il_cvc_fieldMap.ts` — frozen, legal document
- `lib/pdfMaps/in_cvc_coords.ts` — frozen, legal document
- `lib/compensationSchema.ts` — frozen, legally significant
- `lib/eligibilitySchemaIN.ts` — frozen, legally significant
- `lib/server/matching/evaluate.ts` — calibrated algorithm, preserve logic
- `lib/server/designations/evaluate.ts` — calibrated pipeline
- `lib/server/ocr/` — complete pipeline, do not rewrite
- `lib/intake/fieldConfig.ts` — correct field definitions
- All files in `supabase/migrations/` — never modify, only add
- All files in `.cursor/rules/` — always-on UX rules

---

## Required output format for every run

Every run must end with:

1. Files created (path + line count)
2. Files edited (path + what changed)
3. Files I wanted to touch but didn’t (scope boundary)
4. Deferred items (with reason)
5. Open questions (things the prompt didn’t cover)
