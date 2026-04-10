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

25. Integration Branch Law: before issuing or executing a domain prompt (analysis OR execution), the previous domain's branch MUST be merged into `NXTSTPS2.0-V1`. Check with: `git log NXTSTPS2.0-V1..domain/<previous-domain> --oneline | wc -l`. If result > 0, merge the previous domain first, push `NXTSTPS2.0-V1`, then proceed.

    Enforcement: every analysis and execution prompt session begins with this check as Step 0. The check is the architect's responsibility at claude.ai (before issuing the prompt) AND Claude Code's responsibility (before running it). Failure to merge first has caused 4 friction events across Phase 2 (1.x→2.1, 2.1→2.2, 2.2→2.3, 2.3→2.4).

    As of Auto Pipeline 2.0, this check is automated by `scripts/preflight.js` — it walks every locked domain branch and merges any that have unmerged commits before creating the next domain branch.

---

## Automated Pipeline — Trigger Phrases

When told **"start domain X.Y"**:

1. Run: `node scripts/preflight.js --domain X.Y`
   If it fails, stop and report the error. Do not proceed.
2. Run: `node scripts/fetch-prompt.js --domain X.Y --stage analysis`
3. Read the analysis prompt. Run the full analysis AND implementation in one pass (no intermediate review step).
4. Run: `node scripts/validate.js --domain X.Y`
   If any gate fails: stop, post the failure summary to the implementation notes page, and escalate. Do not proceed.
5. Run: `node scripts/post-notion-output.js [implementationNotesPageId]` with the implementation notes
6. Run: `node scripts/commit-and-pr.js --domain X.Y`
7. Run: `node scripts/notion-closeout.js --domain X.Y`
   The PR URL is auto-read from `artifacts/domain-X.Y-pr.txt` if `--pr-url` is omitted.

When told **"start phase N"**:

1. Run: `node scripts/run-phase.js --phase N`
   This computes dependency waves, skips already-locked domains, and runs the
   full pipeline for each pending domain in the correct order (sequential waves,
   parallel within a wave when multiple domains share the same wave).
2. For AI-required steps (analysis, execution, implementation notes), Claude Code
   performs them inline when the phase runner emits an `ACTION REQUIRED` checkpoint.
3. If an escalation artifact is detected, the phase runner stops and prints the
   blocker. Resolve it, then re-run with `--resume`.

When told **"start phase N --resume"**:

1. Run: `node scripts/run-phase.js --phase N --resume`
   Same as above but explicitly skips any domains already marked "locked" in
   `config/domain-order.json` and continues from the first pending domain.

When told **"dry run phase N"** or **"phase N --dry-run"**:

1. Run: `node scripts/run-phase.js --phase N --dry-run`
   Prints the wave plan (which domains run in which order, sequential vs parallel)
   without executing anything.

When told **"escalate domain X.Y"**:

1. Write `artifacts/domain-X.Y-escalation.md` describing the blocker.
2. Post to the Notion escalation page.
3. Stop. Wait for human resolution.

When told **"continue domain X.Y with escalation resolved"**:

1. Read the resolution from Notion.
2. Continue from the stage that escalated.

### Pipeline Identity

You are the sole AI in a single-agent pipeline. Notion is your shared state; artifacts are your local state. All handoffs go through Notion pages and artifacts in `artifacts/`. Never proceed past a scope boundary — escalate instead.

### Pipeline scripts (all present as of this commit)

| Script | Purpose |
|---|---|
| `scripts/preflight.js` | Branch setup + Rule 25 enforcement (auto-merges any locked-domain branches that aren't yet on `NXTSTPS2.0-V1`) |
| `scripts/fetch-prompt.js` | Reads the analysis prompt from Notion directly (no copy-paste) |
| `scripts/post-notion-output.js` | Stdin → Notion page (used for analysis output and implementation notes) |
| `scripts/validate.js` | Runs all validation gates: clears `.next`, TSC, tests, build, and per-domain grepChecks from `config/domain-pages.json`. JSDoc/comment lines auto-excluded from grep matches to avoid false positives. |
| `scripts/commit-and-pr.js` | Stages, commits, pushes, opens GitHub PR via `gh`, writes PR URL to `artifacts/domain-X.Y-pr.txt` |
| `scripts/notion-closeout.js` | Runs the 13-item close-out: implementation-notes read, lock checklist write, domain-order.json status update, validation/PR confirmation, phase-complete check. Best-effort items are explicitly skipped with a clear reason rather than silently no-oping. |
| `scripts/run-phase.js` | Full-phase automation. Computes dependency waves, skips locked domains, runs each domain's complete pipeline (preflight → analysis → validate → commit → closeout), supports `--dry-run`, `--resume`, parallel waves, and escalation detection. |

### Required environment variables

| Variable | Used by |
|---|---|
| `NOTION_API_KEY` | `fetch-prompt.js`, `post-notion-output.js`, `notion-closeout.js` |
| `PATH` includes `/opt/homebrew/bin` | `commit-and-pr.js` (for `gh` CLI) |

---

## Base Truths (never change these files)

- `lib/pdfMaps/il_cvc_fieldMap.ts` — frozen, legal document
- `lib/pdfMaps/in_cvc_coords.ts` — frozen, legal document
- `lib/compensationSchema.ts` — frozen, legally significant
- `lib/eligibilitySchemaIN.ts` — frozen, legally significant
- `lib/eligibilitySchema.ts` — IL eligibility computation (163 lines). Legally significant. Seed into DB only. DO NOT modify under any circumstances.
- `lib/server/matching/evaluate.ts` — calibrated algorithm, preserve logic
- `lib/server/designations/evaluate.ts` — calibrated pipeline
- `lib/server/ocr/` — complete pipeline, do not rewrite
- `lib/intake/fieldConfig.ts` — correct field definitions
- All files in `supabase/migrations/` — never modify, only add
- All files in `.cursor/rules/` — always-on UX rules

---

## Naming Conventions

Service functions: `create*`, `get*`, `list*`, `update*`, `resolve*`
Repository functions: `insert*`, `get*ById`, `list*ForX`, `update*Record`
Policy evaluators: `eval*` (dispatched from policyEngine.ts)
Find functions: `find*` (conditional lookup, may return null)
Do not use `fetch*`, `load*`, `query*` for service/repository functions.
Do not mix `create*` (service) with `insert*` (repository) in the same layer.

---

## Required output format for every run

Every run must end with:

1. Files created (path + line count)
2. Files edited (path + what changed)
3. Files I wanted to touch but didn’t (scope boundary)
4. Deferred items (with reason)
5. Open questions (things the prompt didn’t cover)
