# Contributing to NxtStps 2.0

## Branch Convention

All PRs target `NXTSTPS2.0-V1`, not `main`.
Branch naming: `domain/{X.Y}-{slug}` e.g. `domain/3.2-organization`

## Before Opening a PR

- `rm -rf .next && npx tsc --noEmit` — must show 0 errors
- `npm test -- --passWithNoTests` — must not decrease test count
- `npm run build` — must succeed

## Test Requirements

New domain code requires:
- At least 1 policy test (ALLOW + DENY cases)
- At least 1 serializer safety test (assert sensitive field NOT in output)
- At least 1 service test

## Pipeline Trigger Phrases (for Claude Code)

- `start domain X.Y` — runs full 7-step pipeline for that domain
- `run validation` — runs TSC + tests + build

## The 5-Layer Pattern

See docs/ARCHITECTURE.md for the canonical pattern all new domains must follow.
