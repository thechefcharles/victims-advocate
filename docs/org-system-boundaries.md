# Org system — scope and boundaries

Internal reference for engineers. This document describes what the **current** org system is designed to do, what is **intentionally deferred**, and where to find shared logic.

## What the org system includes (now)

- **Simple org roles (product-facing)**  
  Normalized to `owner` | `supervisor` | `advocate` at the auth boundary (`lib/auth/simpleOrgRole.ts`). The database may still store the full `org_membership_role` enum; mapping is conservative.

- **Profile stages**  
  `created` → `searchable` → `enriched`, computed from profile fields (`lib/organizations/profileStage.ts`). **Searchable** is the minimum bar before an org is considered for matching lists.

- **Matching eligibility (org row)**  
  Same default bar as org loaders and advocate internal search: active organization, active `profile_status`, `profile_stage` in `searchable` | `enriched`. Implemented as `isOrganizationMatchingEligible()` in `lib/organizations/profileStage.ts`.

- **Fit-first matching**  
  Service/coverage fit dominates; designation is a small, capped boost (`lib/server/matching/`).

- **Designation**  
  Plain-language tiers and confidence; not a public score (`lib/server/designations/`, `lib/trustDisplay.ts`).

- **Org signals**  
  Derived, internal-only aggregates for confidence and admin debug (`lib/server/orgSignals/`).

- **Internal discovery**  
  Advocate `/advocate/org-search` and admin `/admin/orgs`, `/admin/ecosystem` — operational tooling, not a public directory.

- **Operational follow-up cues**  
  Single short line per row where useful (`lib/organizations/internalFollowupCues.ts`) — not recommendations or rankings.

## Philosophy (keep explicit)

- Matching answers **who may fit this case**, not **who is the best org overall**.
- Designation is **secondary trust context**, not the primary ranker.
- Sparse data → **honest confidence** and calm copy, not punitive labels.

## Intentionally deferred (“not now”)

- Public org browsing / **directory** product
- **Map-first** discovery (separate map flows may exist for other purposes; not the org-system pillar)
- **Advanced RBAC** or fine-grained permission matrix in the live path  
  Legacy matrix code may remain in-repo but is **deprecated** — see `lib/server/auth/orgMatrix.ts`, `orgCaseAccess.ts`.
- **Credential / training / certification** tracking
- **Public ranking**, leaderboard, or **public quality scores**
- Heavy **ecosystem BI** or analytics dashboards

## Deprecated / legacy (do not extend for live access)

- `lib/server/auth/orgMatrix.ts` — permission matrix; not used on the live access path.
- `lib/server/auth/orgCaseAccess.ts` — re-exports only; prefer `simpleAccess` / `simpleOrgRole`.

## Related files

| Concern | Location |
|--------|----------|
| Profile stage computation | `lib/organizations/profileStage.ts` |
| Matching eligibility (row) | `isOrganizationMatchingEligible` in same file |
| Internal follow-up copy | `lib/organizations/internalFollowupCues.ts` |
| Simple product roles | `lib/auth/simpleOrgRole.ts` |
| DB enum / leadership helpers | `lib/server/auth/orgRoles.ts` |
| Designation explanations | `lib/server/designations/explain.ts` |
| Trust labels / badges (UI) | `lib/trustDisplay.ts` |

When adding features, extend these modules or add a **single** well-named module rather than duplicating gates or labels.
