# Supabase Persistence Readiness Audit

## Scope

This audit covers the current EstateMind app in `estatemind/` and compares it against the target SaaS persistence model:

- `profiles`
- `organizations`
- `organization_members`
- `property_opportunities`
- `deal_analyses`

Reference target schema source:

- `recovery-baseline/db/migrations/002_core_supabase_schema.sql`

## Executive Summary

The current app is not Supabase persistence ready.

The codebase contains a Supabase service layer, but the runtime app is still driven by mock data and browser-local KV state. The current service layer also targets a different schema than the target SaaS model. The highest-risk gaps are:

1. No real Supabase client bootstrap in the app runtime.
2. No public Supabase environment variables in `.env.local.example`.
3. No auth UI or session wiring.
4. Current opportunity persistence code expects `opportunities`, not `property_opportunities`.
5. Current opportunity service shape does not match the target relational model.
6. AI analyses are generated but not persisted in the current app.

## Files Inspected

### Supabase service files

- `src/services/supabase/client.ts`
- `src/services/supabase/auth.service.ts`
- `src/services/supabase/opportunities.service.ts`
- `src/services/supabase/portfolio.service.ts`
- `src/services/supabase/storage.service.ts`
- `src/services/supabase/index.ts`
- `src/services/config.ts`

### Env file

- `.env.local.example`

### Current app state flow

- `src/App.tsx`
- `src/components/DealAnalyzer.tsx`
- `src/components/OpportunityTracker.tsx`
- `src/components/InvestmentPipeline.tsx`
- `src/components/Dashboard.tsx`
- `src/services/api/dealAnalysis.service.ts`
- `vite.config.ts`

### Target schema reference

- `recovery-baseline/db/migrations/002_core_supabase_schema.sql`

## Current Runtime State Flow

### 1. Top-level app state

`src/App.tsx` keeps only two meaningful pieces of top-level state:

- `currentPage`
- `currentAnalysis`

`handleAnalyze()` calls `generateDealAnalysis(property)` and stores the returned analysis only in React state before navigating to the report page.

Result: generated analyses are view-state only unless some other persistence path exists.

### 2. Opportunity state

`src/components/OpportunityTracker.tsx` does not use the Supabase service layer.

It uses:

- `useKV<Opportunity[]>('opportunities', mockOpportunities)`
- `useKV<Opportunity[]>('archived-opportunities', [])`

Bulk archive, bulk tag, delete, and status updates mutate browser-local KV state only.

### 3. Pipeline state

`src/components/InvestmentPipeline.tsx` also uses:

- `useKV<Opportunity[]>('opportunities', mockOpportunities)`

Drag-and-drop stage changes are browser-local only.

### 4. Dashboard state

`src/components/Dashboard.tsx` reads directly from `mockOpportunities` and `mockDashboardMetrics`, not from Supabase-backed queries.

### 5. AI analysis flow

Current analysis request path:

1. `DealAnalyzer` collects property form input.
2. `App.handleAnalyze()` calls `src/services/api/dealAnalysis.service.ts`.
3. The client sends `POST /api/deal-analysis` with `{ property }`.
4. `vite.config.ts` handles that request in a Vite dev-server middleware.
5. The middleware returns `{ ok: true, analysis }`.
6. `App.tsx` stores the result in `currentAnalysis` only.

Important: the current handler does not write analysis data to Supabase.

## Supabase Environment Readiness

Current `.env.local.example` contains only server-side AI values:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

It does not include:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

That is a readiness blocker because `src/services/config.ts` checks for those exact public browser-side variables.

## Supabase Client Readiness

`src/services/supabase/client.ts` is a thin interface wrapper, not a real initialized client.

Observed behavior:

- If Supabase env vars are missing, `getSupabaseClient()` returns `null` and the app falls back to mock mode.
- If env vars exist but no client was initialized through `initSupabase(...)`, `getSupabaseClient()` throws.

There is no current app runtime usage of:

- `createClient(...)` from `@supabase/supabase-js`
- `initSupabase(...)`

Also, `package.json` does not currently include `@supabase/supabase-js`.

Result: even the existing service layer cannot function end to end in the current app.

## Current Tables Expected By Code

The current app and service layer expect these persistence objects:

### Tables

- `opportunities`
- `portfolio_properties`
- `portfolio_metrics`

### Storage bucket

- `estate-mind-files`

### Auth

The auth service expects Supabase Auth APIs but does not reference:

- `profiles`
- `organizations`
- `organization_members`

### AI persistence

No current runtime code in `estatemind/` reads or writes `deal_analyses`.

## Comparison Against Target SaaS Model

| Target object | Expected by current app? | Current status |
| --- | --- | --- |
| `profiles` | No | Missing from runtime usage and service layer |
| `organizations` | No | Missing from runtime usage and service layer |
| `organization_members` | No | Missing from runtime usage and service layer |
| `property_opportunities` | No | Current code expects `opportunities` instead |
| `deal_analyses` | No | Current app generates analyses but does not persist them |

## Naming And Schema Mismatches

### Table mismatch

The largest naming mismatch is:

- current service layer: `opportunities`
- target model: `property_opportunities`

### Field mismatch

The mismatch is not just naming. The shape is also different.

Current `src/services/supabase/opportunities.service.ts` assumes a row that can be cast directly to the UI `Opportunity` type. That implies a mostly denormalized shape with nested objects living in one record.

The target model is relational and flattened:

- `property_opportunities` stores top-level property fields directly on the row
- `deal_analyses` stores analysis payload separately
- `organization_id` is required
- `created_by` and `generated_by` are part of the model

### Specific current-vs-target mismatches

| Current expectation | Target model |
| --- | --- |
| `opportunities` | `property_opportunities` |
| `status` | `stage` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
| nested `property` object | flattened property columns |
| optional embedded `analysis` on opportunity row | separate `deal_analyses.analysis_payload` |
| no tenant key | required `organization_id` |
| no user ownership fields | `created_by`, `generated_by` |

### Service logic mismatch

Current opportunity filters and sorting assume fields such as:

- `status`
- `score`
- `createdAt`
- `title`
- `country`

The target schema uses different naming and different placement of analysis data. The existing service cannot be pointed at `property_opportunities` by table rename alone.

## Auth Wiring Status

Auth is not currently wired to the UI.

What exists:

- `src/services/supabase/auth.service.ts`

What is missing in the running app:

- no sign-in screen
- no sign-up screen
- no auth provider or session context
- no route guard
- no current-user bootstrap
- no use of `authService` outside the service file and docs
- no org selection or membership resolution

Result: Supabase Auth exists only as a service stub, not as an active app feature.

## AI Analysis Persistence Status

AI analyses are not persisted in the current app.

Current behavior:

- `src/services/api/dealAnalysis.service.ts` sends `{ property }` to `/api/deal-analysis`
- `vite.config.ts` generates and returns analysis JSON
- `src/App.tsx` stores the result in `currentAnalysis`

Missing behavior:

- no `opportunityId` in the current request payload
- no Supabase write in the current API handler
- no insert into `deal_analyses`
- no update path that attaches latest analysis to an opportunity record

Additional product gap:

- the current `DealAnalyzer` flow analyzes a property and shows a report, but it does not create or save a `property_opportunities` record first

## Readiness Verdict

Current readiness level: low.

The app has useful directionally correct pieces, but persistence is still mostly conceptual in the current runtime:

- service layer exists
- target schema exists in the recovery baseline
- runtime app still uses mock and browser-local state
- auth and multi-tenancy are not yet integrated
- AI persistence is not implemented

## Smallest Safe Implementation Plan

The safest path is to avoid rewriting UI types first. Introduce adapters so the current UI can keep using its existing `Opportunity` shape while persistence is moved behind a repository boundary.

### Phase 1: Bootstrap Supabase Without Changing User Flows

Goal: make Supabase available to the app safely before switching any major screens.

Steps:

1. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local.example`.
2. Add `@supabase/supabase-js` to the app.
3. Initialize the client once during app bootstrap and pass it through `initSupabase(...)`.
4. Add one small runtime health check that confirms config presence and client initialization.

Why this is the smallest safe step:

- no UI behavior changes yet
- removes the current throw-on-config-without-init failure mode
- makes later feature work testable

### Phase 2: Wire Authentication Before Tenant Data

Goal: establish authenticated user identity before introducing organization-scoped reads and writes.

Steps:

1. Add a minimal auth context that exposes session, user, loading, sign-in, sign-out.
2. Add a simple sign-in and sign-up UI entry point.
3. Subscribe to `onAuthStateChange` and hydrate the current session on app load.
4. Keep opportunity screens read-only or mock-backed until session state is reliable.

Why before data migration:

- the target schema is multi-tenant
- `profiles` and org membership depend on authenticated users

### Phase 3: Provision `profiles`, `organizations`, And `organization_members`

Goal: create a valid tenant context for all future opportunity and analysis writes.

Steps:

1. On first successful sign-up or first login, ensure a `profiles` row exists.
2. Create a default `organizations` row for first-time solo users.
3. Create one `organization_members` row linking the user to that org.
4. Store or derive `default_org_id` so the frontend can resolve one active org.

Smallest safe rule:

- support exactly one active organization first
- defer org switching UI until persistence is stable

### Phase 4: Introduce A Repository Adapter For Opportunities

Goal: keep the current UI model stable while switching persistence to the target schema.

Steps:

1. Create a repository layer that maps between UI `Opportunity` and:
   - `property_opportunities`
   - latest `deal_analyses`
2. Read active records from `property_opportunities` filtered by `organization_id` and `is_archived = false`.
3. Join or enrich each opportunity with the most recent `deal_analyses.analysis_payload`.
4. Map `stage` to the UI `status` field.
5. Map snake_case DB fields to the current camelCase UI model.

Important constraint:

- do not rename the existing UI type first
- add the adapter boundary first so UI churn stays low

### Phase 5: Switch Opportunity Screens Off `useKV`

Goal: move the real source of truth from browser-local state to Supabase.

Steps:

1. Replace `useKV` in `OpportunityTracker` with repository-backed query and mutation methods.
2. Replace `useKV` in `InvestmentPipeline` with the same repository state source.
3. Stop reading `mockOpportunities` in `Dashboard`; load from the repository instead.
4. Keep mock fallback only behind explicit development guards, not as the default runtime path.

Why this phase matters:

- it converts the app from local-only behavior to multi-device persistence
- it removes split-brain state between tracker, pipeline, and dashboard

### Phase 6: Implement Opportunity CRUD Against `property_opportunities`

Goal: support real create, edit, archive, reject, and delete flows.

Steps:

1. Persist create and update actions to `property_opportunities`.
2. Persist archive through `is_archived` instead of moving items to a separate local collection.
3. Persist stage changes through `stage`.
4. Persist tags and notes in the relational table.
5. Add organization-scoped queries and row-level security validation.

Smallest safe change order:

1. read
2. update stage and archive
3. create
4. edit
5. delete

### Phase 7: Persist AI Analyses In `deal_analyses`

Goal: make AI output durable and tied to an opportunity.

Steps:

1. Change the analysis request contract to require `opportunityId` for saved analyses.
2. Ensure an opportunity exists before analysis is requested.
3. Save the generated analysis into `deal_analyses` with:
   - `organization_id`
   - `opportunity_id`
   - `generated_by`
   - `model_name`
   - `analysis_payload`
   - derived summary fields such as `recommendation`, `overall_score`, `confidence_score`
4. Read the latest analysis back into the UI through the repository adapter.

Smallest safe product behavior:

- if analysis generation succeeds but save fails, show that explicitly
- do not silently treat transient view-state as persisted state

### Phase 8: Clean Up Legacy Schema Assumptions

Goal: remove misleading persistence code and docs once the new model is live.

Steps:

1. Remove or deprecate the legacy `opportunities` table references.
2. Update `src/services/README.md` so it documents the actual schema.
3. Remove dead mock-first persistence assumptions from production paths.
4. Keep portfolio and storage work separate unless they are part of the immediate release scope.

## Recommended First Delivery Slice

If the goal is the smallest end-to-end increment, the best first delivery slice is:

1. Bootstrap real Supabase client.
2. Add auth context and minimal sign-in.
3. Provision one profile and one default org.
4. Read `property_opportunities` for the signed-in org.
5. Replace `useKV` in `OpportunityTracker` with read-only Supabase data.

This slice is small enough to validate the tenancy model and schema mapping before adding writes or AI persistence.

## Recommended Second Delivery Slice

1. Add stage update and archive mutations.
2. Add create/edit opportunity mutations.
3. Persist AI analyses to `deal_analyses`.
4. Update dashboard and pipeline to use the same repository source.

## Conclusion

The current app has Supabase-oriented scaffolding, but not Supabase-ready persistence.

The main issue is not only missing wiring. The current service contract and table assumptions are still aligned to a legacy `opportunities` model, while the target SaaS model is multi-tenant and relational. The safest path is to introduce a repository adapter against the target schema, switch the UI away from `useKV`, and only then add write paths and AI persistence.# Supabase Persistence Readiness Audit

## Executive Summary

Current readiness is low for production Supabase persistence.

The repository contains a Supabase service layer under `src/services/supabase`, but the current app does not use it for the main opportunity workflow. The live UI still stores opportunity state in browser-local KV storage and sends AI analysis requests to a dev server endpoint that returns analysis JSON without saving it. The existing service layer also targets a legacy flat `opportunities` table, which does not match the target SaaS schema centered on `organizations`, `profiles`, `organization_members`, `property_opportunities`, and `deal_analyses`.

The smallest safe path is to first align naming and schema expectations, then wire a real Supabase client and auth bootstrap, then move opportunity CRUD to `property_opportunities`, and only after that persist AI analyses into `deal_analyses`.

## Scope Inspected

### Supabase service files

- `src/services/supabase/client.ts`
- `src/services/supabase/auth.service.ts`
- `src/services/supabase/opportunities.service.ts`
- `src/services/supabase/portfolio.service.ts`
- `src/services/supabase/storage.service.ts`
- `src/services/supabase/index.ts`
- `src/services/config.ts`

### Environment template

- `.env.local.example`

### Current app state flow

- `src/App.tsx`
- `src/components/DealAnalyzer.tsx`
- `src/components/OpportunityTracker.tsx`
- `src/components/InvestmentPipeline.tsx`
- `src/components/Dashboard.tsx`
- `src/services/api/dealAnalysis.service.ts`
- `vite.config.ts`

### Target SaaS model reference

- `../recovery-baseline/db/migrations/002_core_supabase_schema.sql`

## Current Supabase Readiness

### 1. Supabase service files exist but are not end-to-end wired

The project has a service abstraction for auth, storage, portfolio, and opportunities. That is useful as an integration seam, but it is not enough for readiness because:

- `src/services/supabase/client.ts` defines a handwritten Supabase client interface instead of importing `@supabase/supabase-js`.
- `getSupabaseClient()` returns `null` when config is absent, and throws if config exists but no client was initialized.
- There is no current app bootstrap that calls `initSupabase(...)`.
- `package.json` does not include `@supabase/supabase-js`.

Conclusion: the service layer is a stubbed integration surface, not a functioning Supabase runtime.

### 2. `.env.local.example` does not prepare client-side Supabase

The current `.env.local.example` only contains:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

It does not include:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- any default organization or auth-related local setup notes

Conclusion: local environment guidance is currently AI-only, not Supabase-ready.

### 3. Current app state flow is local-first, not database-first

The controlling state flow today is:

1. `src/App.tsx` owns `currentPage` and `currentAnalysis` in component state.
2. `src/components/DealAnalyzer.tsx` builds a `Property` object from form input and calls `onAnalyze(property)`.
3. `src/App.tsx` calls `generateDealAnalysis(property)` from `src/services/api/dealAnalysis.service.ts`.
4. On success, `currentAnalysis` is set locally and the app navigates to the report page.
5. `src/components/OpportunityTracker.tsx` stores opportunities in `useKV('opportunities', mockOpportunities)` and archived items in `useKV('archived-opportunities', [])`.
6. `src/components/InvestmentPipeline.tsx` reads and mutates the same `useKV('opportunities', ...)` browser state.
7. `src/components/Dashboard.tsx` still reads `mockOpportunities` directly rather than a shared persistence-backed source.

Conclusion: the app currently has three parallel state sources:

- transient React state in `App.tsx`
- browser KV state in opportunity workflows
- static mock data in dashboard views

That is not persistence-ready and would produce inconsistent behavior even before adding Supabase.

## Table Names Currently Expected By Code

### Tables referenced directly by current `estatemind` code

- `opportunities`
- `portfolio_properties`
- `portfolio_metrics`

### Storage bucket referenced directly

- `estate-mind-files`

### Target SaaS tables expected by desired model

- `profiles`
- `organizations`
- `organization_members`
- `property_opportunities`
- `deal_analyses`

### Tables not currently referenced by the current app code

- `profiles`
- `organizations`
- `organization_members`
- `property_opportunities`
- `deal_analyses`

## Naming And Model Mismatches

### 1. `opportunities` vs `property_opportunities`

This is the main mismatch.

Current service code expects a legacy table:

- `src/services/supabase/opportunities.service.ts` uses `private tableName = 'opportunities'`

Target SaaS schema expects:

- `property_opportunities`

Impact:

- Current code will not read or write the target opportunity table.
- Any migration to the SaaS model requires either renaming the service target or introducing a compatibility adapter.

### 2. Flat JSON-like opportunity shape vs relational SaaS shape

Current `Opportunity` domain shape is nested around:

- `opportunity.property`
- optional `opportunity.analysis`
- `status`, `tags`, `notes`, `savedAt`, `updatedAt`

Current legacy service assumes a flat table row is directly castable to `Opportunity`, while the target SaaS model splits concerns across:

- `property_opportunities` for property and workflow metadata
- `deal_analyses` for generated AI outputs
- organization-scoped ownership columns

Impact:

- The current service implementation is not structurally aligned with the target database model.
- A mapping layer is required, not just a table rename.

### 3. `status` vs `stage`

Current domain code uses `Opportunity.status`.

Target SaaS schema stores workflow state in `property_opportunities.stage`.

Impact:

- The app domain can keep `status`, but persistence code must map `status <-> stage` consistently.

### 4. Missing organization scoping in current services

Target SaaS schema requires organization ownership on key rows:

- `organizations`
- `organization_members`
- `property_opportunities.organization_id`
- `deal_analyses.organization_id`

Current services do not pass or filter by:

- `organization_id`
- `created_by`
- membership or profile context

Impact:

- Current services are single-tenant in behavior.
- They are not ready for SaaS multi-tenancy or RLS-safe access patterns.

## Auth Wiring Status

Auth is not currently wired to the UI.

What exists:

- `src/services/supabase/auth.service.ts` provides sign-up, sign-in, sign-out, current-user, session, and auth-state-change helpers.

What is missing from the current app:

- no auth provider/context
- no login or signup screen
- no session bootstrap in `App.tsx` or `main.tsx`
- no `initSupabase(createClient(...))` runtime path
- no user/org selection flow
- no route guarding based on auth state

Conclusion: auth support exists only as an unused service abstraction.

## AI Analysis Persistence Status

AI analyses are not currently persisted in the `estatemind` app.

Current behavior:

- `src/services/api/dealAnalysis.service.ts` posts `{ property }` to `/api/deal-analysis`.
- The dev API handler in `vite.config.ts` calls OpenAI, normalizes the response, and returns `{ ok: true, analysis }`.
- The handler does not save to Supabase.
- `src/App.tsx` stores the returned analysis only in local React state as `currentAnalysis`.

Related gap:

- The current analyzer flow does not create or update an opportunity record before analysis.
- There is no persisted `opportunityId` associated with a generated analysis.
- There is no current write path to `deal_analyses`.

Conclusion: AI output is generated, displayed, and discarded unless the browser state happens to retain it elsewhere.

## Detailed Readiness Findings

### Ready enough to reuse

- Service directory structure gives a reasonable place to concentrate persistence logic.
- `auth.service.ts` and `storage.service.ts` are directionally useful once a real Supabase client is installed.
- `API_CONFIG` and `hasSupabaseConfig()` already define the intended env variable names.

### Not ready for production persistence

- No actual Supabase client dependency or bootstrap.
- No client env template for Supabase.
- Main opportunity workflow bypasses Supabase services entirely.
- Opportunity state is split across mock data, React state, and browser KV.
- Legacy `opportunities` table naming conflicts with target `property_opportunities`.
- No organization or profile scoping.
- No UI auth wiring.
- No persistence of AI analyses into `deal_analyses`.

## Recommended Smallest Safe Phased Plan

### Phase 0. Freeze the target persistence contract

Goal: remove ambiguity before runtime changes.

Steps:

1. Declare `recovery-baseline/db/migrations/002_core_supabase_schema.sql` as the target source of truth for persistence naming.
2. Confirm the app-domain mapping contract:
   - `Opportunity.status` maps to `property_opportunities.stage`
   - `Opportunity.property.*` maps to scalar columns on `property_opportunities`
   - `Opportunity.analysis` is loaded from the latest `deal_analyses.analysis_payload`
3. Explicitly deprecate the legacy `opportunities` table for the SaaS path.

Why this is the smallest safe first step:

- It prevents implementing against two conflicting schemas.

### Phase 1. Establish real Supabase runtime wiring without changing app behavior

Goal: make Supabase available as infrastructure before switching business flows.

Steps:

1. Add `@supabase/supabase-js`.
2. Replace the handwritten placeholder client bootstrap with a real client initializer.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local.example`.
4. Initialize Supabase once at app startup.
5. Keep UI behavior unchanged and still allow mock fallback while wiring is verified.

Why this is safe:

- It limits initial risk to connectivity and configuration only.
- It does not yet change opportunity or analysis behavior.

### Phase 2. Wire auth before multi-tenant data writes

Goal: ensure every future write can be tied to a user and organization.

Steps:

1. Add an auth/session provider that subscribes to auth state.
2. Add minimal sign-in and sign-up UI or a guarded entry flow.
3. Load the current profile and default organization after login.
4. Block persistence-backed views until session and organization context are known.

Why this should come before opportunity persistence:

- The target schema is organization-scoped.
- Writing rows before auth and org context would create rework or orphaned data.

### Phase 3. Replace browser KV opportunity storage with `property_opportunities`

Goal: make the core CRM workflow use database persistence.

Steps:

1. Update `opportunities.service.ts` to target `property_opportunities` rather than `opportunities`.
2. Introduce explicit row-to-domain and domain-to-row mappers.
3. Map `stage <-> status` consistently in one place.
4. Include `organization_id` and `created_by` in write payloads.
5. Replace `useKV('opportunities')` and `useKV('archived-opportunities')` with a single shared data hook/provider backed by the service.
6. Update `OpportunityTracker`, `InvestmentPipeline`, and any related views to read from the shared provider instead of local KV.

Why this is the smallest safe functional cut:

- It solves the most important persistence gap first: core opportunity CRUD.
- It also removes current cross-view inconsistency.

### Phase 4. Persist AI analyses into `deal_analyses`

Goal: make AI outputs durable and tied to opportunities.

Steps:

1. Require a persisted opportunity before analysis generation from the tracker workflow.
2. Send `opportunityId` with the analysis request.
3. Save analysis results into `deal_analyses` with:
   - `organization_id`
   - `opportunity_id`
   - `generated_by`
   - `model_name`
   - `analysis_payload`
   - extracted summary fields such as `recommendation`, `overall_score`, `confidence_score`
4. Load the most recent analysis per opportunity when hydrating the tracker and report views.
5. Keep `App.tsx` local `currentAnalysis` only as view state, not as the source of truth.

Why this is safer after Phase 3:

- `deal_analyses` depends on a real persisted opportunity row.
- It avoids inventing synthetic IDs or analysis-only records.

### Phase 5. Enforce multi-tenant policies and clean up legacy paths

Goal: move from working persistence to SaaS-safe persistence.

Steps:

1. Add or tighten RLS policies for organization membership.
2. Remove remaining legacy `opportunities` references.
3. Remove browser KV opportunity persistence from production paths.
4. Update dashboard views to consume the shared persisted opportunity source rather than `mockOpportunities`.
5. Decide whether portfolio tables stay legacy or also move under organization-scoped SaaS design.

## Smallest Safe Implementation Order

If the goal is to start implementation with the least disruption, use this exact order:

1. Add Supabase env vars and real client bootstrap.
2. Add auth/session provider and minimal login flow.
3. Add current-profile and current-organization resolution.
4. Switch opportunity reads and writes from browser KV to `property_opportunities`.
5. Switch tracker and pipeline to the shared persisted data source.
6. Add analysis persistence to `deal_analyses` using persisted `opportunityId`.
7. Update dashboard and report hydration to read latest persisted analyses.
8. Remove legacy `opportunities` assumptions and mock-only production paths.

## Risks To Watch During Implementation

### Data-shape risk

The current UI expects nested `Opportunity.property` and inline optional `Opportunity.analysis`. The database model is split. A clean mapper layer is mandatory.

### State-source risk

If even one screen keeps using `mockOpportunities` or `useKV`, users will see inconsistent counts, statuses, and analyses.

### Auth sequencing risk

Adding persistence before auth and organization context will create ambiguous ownership and make RLS harder to retrofit.

### API boundary risk

The current AI route in `vite.config.ts` is a dev-server middleware endpoint, not a durable SaaS backend boundary. Analysis persistence should move behind a proper server-side API path once the persistence contract is active.

## Bottom Line

The current app is not yet Supabase persistence-ready for the target SaaS model.

The primary blockers are:

- no real Supabase runtime bootstrap
- no Supabase env template for the client
- no auth wiring
- opportunity data still stored in browser KV and mock state
- legacy `opportunities` naming instead of `property_opportunities`
- no persistence of AI analyses into `deal_analyses`

The smallest safe next milestone is not full persistence. It is schema alignment plus real Supabase bootstrap plus auth context. After that, move opportunity CRUD to `property_opportunities`, then persist analyses into `deal_analyses`.