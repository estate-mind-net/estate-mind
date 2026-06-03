# Branch Comparison

Date: 2026-06-02
Repository: estatemind
Compared branches:
- main
- phase-1-production-foundation
- phase-1-cleanup-safe
- phase-2b-opportunities-context

## 1. Commit differences

Branch graph summary (relative to origin/main):
- phase-1-production-foundation: +1 commit
- phase-1-cleanup-safe: +3 commits
- phase-2b-opportunities-context: +4 commits

Ahead/behind counts:
- main...phase-1-production-foundation = 0 behind, 1 ahead
- main...phase-1-cleanup-safe = 0 behind, 3 ahead
- main...phase-2b-opportunities-context = 0 behind, 4 ahead
- phase-1-production-foundation...phase-1-cleanup-safe = 0 behind, 2 ahead
- phase-1-cleanup-safe...phase-2b-opportunities-context = 0 behind, 1 ahead

Unique commit chain:
1. 0cd17d7 Monorepo restructure completed
2. 4897e2a phase-1: cleanup spark artifacts, dead code, and duplicate patterns
3. 4ad1690 Remove duplicate Spark source tree
4. 1115878 Replace Spark useKV with shared opportunities context

Interpretation:
- The branches are linear and additive, not competing rewrites.
- phase-2b-opportunities-context is the latest superset branch.

## 2. Feature differences

### main
- Single-package app at repository root.
- Spark runtime files present at root (runtime.config.json, spark.meta.json).
- Opportunity state uses Spark useKV directly in components.
- Supabase client remains custom typed abstraction in src/services/supabase/client.ts.

### phase-1-production-foundation
- Large monorepo move:
  - app moved to apps/web
  - docs moved to docs
  - db/migrations and prompts folders introduced
- Root package.json converted to workspace orchestrator shape.
- Significant packaging/layout churn.
- Also introduced accidental duplicate source tree under apps/web/src/src.

### phase-1-cleanup-safe
- Builds on phase-1-production-foundation.
- Removes duplicate source tree apps/web/src/src and related dead artifacts.
- Removes Spark metadata files in app package (apps/web/runtime.config.json, apps/web/spark.meta.json).
- Minor app refactors in App, Dashboard, InvestmentPipeline, OpportunityTracker, constants, main entry.
- Net effect: monorepo layout becomes cleaner and safer than phase-1-production-foundation.

### phase-2b-opportunities-context
- Builds on phase-1-cleanup-safe.
- Replaces component-level Spark useKV opportunity state with shared OpportunitiesProvider/useOpportunities hook.
- Wires provider at app root and updates OpportunityTracker + InvestmentPipeline to consume context actions.
- Adds archive/getAllArchived methods and data model corrections in opportunities service.
- Replaces custom Supabase client typing shim with @supabase/supabase-js client initialization.
- Adds db/migrations/001_opportunities.sql.
- Adds apps/web package-lock.json and app-level dependency @supabase/supabase-js.

## 3. Which branch appears most complete

Most complete: phase-2b-opportunities-context

Why:
- Contains all prior phase-1 restructuring and cleanup commits.
- Adds actual functional step toward production data flow (shared opportunities context + Supabase package + SQL migration).
- Reduces Spark useKV coupling in key opportunity workflows.

## 4. Which branch should become the new recovery baseline

Recommended new recovery baseline: phase-2b-opportunities-context

Reasoning:
- It is a strict superset of the other phase branches.
- It includes cleanup work that removes known structural duplication risk.
- It advances the highest-risk product area (opportunity state and persistence path) without requiring a full backend cutover.

Fallback baseline if phase-2b is deferred:
- phase-1-cleanup-safe, because it keeps the monorepo cleanup without introducing additional behavior changes.

## 5. Any risks before merging

Primary risks:
1. Monorepo migration blast radius
- The move from root app to apps/web changes scripts, paths, and tooling assumptions.
- Existing CI/CD, deployment, and developer commands may fail unless updated.

2. Spark runtime compatibility
- runtime.config.json and spark.meta.json are removed in cleanup branches.
- If current deployment still depends on Spark metadata at known locations, deployment/runtime behavior can regress.

3. Hidden type-safety debt remains
- Existing codebase has strict typecheck failures when running full tsc checks.
- Branches still use build flow that bypasses typechecking with noCheck.

4. Service contract mismatch risk
- phase-2b improves opportunities service, but broader service layer/schema consistency is still incomplete.
- Supabase table and model mapping assumptions need validation before production traffic.

5. Merge surface size
- phase-1-production-foundation and descendants include very large file moves/renames.
- Conflict risk is high if main has continued changes in moved files.

Pre-merge safety checklist:
1. Validate workspace scripts and CI commands for monorepo layout.
2. Confirm deployment target does not require removed Spark metadata files.
3. Run app build and full typecheck in merged candidate branch.
4. Run smoke tests for opportunities flows (list, status change, bulk archive/tag/delete).
5. Validate SQL migration against intended Supabase schema and RLS strategy.

## Bottom line

- If the goal is the strongest forward-moving recovery point, use phase-2b-opportunities-context.
- If the goal is minimal behavior change with structural cleanup only, use phase-1-cleanup-safe.
