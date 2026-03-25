# Routes and page names

Canonical paths and product names live in **[`lib/routes/pageRegistry.ts`](../lib/routes/pageRegistry.ts)**:

- **`PAGE_REGISTRY`** — id, path, title, audience, notes (for tickets and design).
- **`ROUTES`** — use in React `Link`/`href` instead of hard-coded strings.

## Quick reference

| Area | Path | Name |
|------|------|------|
| Public marketing (demo video) | `/` | Marketing landing |
| CVC hub (nav label “Compensation”) | `/compensation` | Compensation hub |
| Guided application | `/compensation/intake` | Compensation intake |
| Logged-in home | varies | See `getDashboardPath` in `lib/dashboardRoutes.ts` |

Post-login “home” is **not** `/`; it is role-specific (`/victim/dashboard`, `/advocate` command center, etc.). Legacy `/advocate/dashboard` redirects to `/advocate`.

## Org system (internal)

Advocate and admin org tooling (`/advocate/org`, `/advocate/org-search`, `/admin/orgs`, …) is **not** public discovery. Scope and boundaries: **[`docs/org-system-boundaries.md`](org-system-boundaries.md)**.
