# Existing Supabase Mapping Audit

## Scope

This audit compares the current EstateMind codebase against the already-created Supabase tables:

- `documents`
- `notes`
- `opportunities`
- `organizations`
- `profiles`
- `properties`
- `tasks`

Constraints for this audit:

- no code changes
- no SQL changes
- no migrations
- no table renames

## Executive Summary

The current frontend code only directly expects one of the listed existing tables: `opportunities`.

The current service layer also expects two tables that are not in the existing schema list:

- `portfolio_properties`
- `portfolio_metrics`

For the Deal Analyzer workflow, the best fit is to use both `properties` and `opportunities`.

- `properties` should hold the canonical property/listing facts entered in the analyzer.
- `opportunities` should hold investor workflow state and the organization-scoped decision to track that property.

Because there is no existing dedicated analysis table in the listed schema, a new `deal_analyses` table is still the correct long-term design for structured, versioned AI persistence. For a no-schema-change interim design, analysis can only be stored in a less ideal form, most likely via `notes`, if that table already has a generic content/body field and an opportunity relationship.

`organizations` and `profiles` appear sufficient for minimal auth ownership and single-organization context, but they are not enough for full multi-member organization modeling unless there is already an unseen membership mechanism outside the listed tables.

## Files Inspected

### Supabase service files

- `src/services/supabase/client.ts`
- `src/services/supabase/auth.service.ts`
- `src/services/supabase/opportunities.service.ts`
- `src/services/supabase/portfolio.service.ts`
- `src/services/supabase/storage.service.ts`
- `src/services/supabase/index.ts`
- `src/services/config.ts`

### Current app flow files

- `src/App.tsx`
- `src/components/DealAnalyzer.tsx`
- `src/components/OpportunityTracker.tsx`
- `src/components/InvestmentPipeline.tsx`
- `src/services/api/dealAnalysis.service.ts`

### Domain shape references

- `src/lib/types/property.ts`
- `src/lib/types/opportunity.ts`
- `MIGRATION_NOTES.md`

## 1. Existing Supabase Service Files

### `src/services/supabase/client.ts`

Current state:

- defines a handwritten client interface rather than using the real Supabase SDK directly
- returns `null` when Supabase config is missing
- throws if config exists but no client was initialized through `initSupabase(...)`

Meaning for this audit:

- the code has a service boundary, but not a working runtime integration by default

### `src/services/supabase/auth.service.ts`

Current state:

- wraps Supabase Auth methods: sign-up, sign-in, sign-out, get user, get session, auth state listener
- does not query `profiles` or `organizations`
- is not wired into the app UI

Meaning for this audit:

- auth service exists, but profile/org bootstrap is not implemented in the current app

### `src/services/supabase/opportunities.service.ts`

Current state:

- directly targets `opportunities`
- assumes a denormalized row shape that can be cast straight to the frontend `Opportunity` type
- filters on fields like `status`, `country`, `score`, `createdAt`, `title`

Meaning for this audit:

- this is the only current service already pointed at one of the listed existing tables
- it is still structurally mismatched to a normalized `properties + opportunities` design

### `src/services/supabase/portfolio.service.ts`

Current state:

- expects `portfolio_properties`
- expects `portfolio_metrics`

Meaning for this audit:

- this service does not map to the listed existing tables
- it is outside the current existing-schema fit for this audit

### `src/services/supabase/storage.service.ts`

Current state:

- expects a storage bucket named `estate-mind-files`
- does not use the `documents` table

Meaning for this audit:

- document metadata persistence is not currently mapped to the existing `documents` table

## 2. Which Existing Tables The Current Code Already Expects

### Direct table expectations in current code

Directly referenced by current Supabase services:

- `opportunities`

Indirectly relevant but not queried by current code:

- `organizations`
- `profiles`

Not currently expected by code, even though they exist:

- `documents`
- `notes`
- `properties`
- `tasks`

Expected by code but not present in the listed existing schema:

- `portfolio_properties`
- `portfolio_metrics`

Non-table dependency also referenced by code:

- storage bucket `estate-mind-files`

## 3. Code Expectations vs Actual Existing Tables

| Object | Current code expects it? | Exists in provided schema? | Notes |
| --- | --- | --- | --- |
| `opportunities` | Yes | Yes | Best current schema match for existing opportunity service |
| `properties` | No | Yes | Exists but unused; should be brought into analyzer persistence design |
| `organizations` | Not directly | Yes | Useful for ownership and tenant scope, but unused in current UI flow |
| `profiles` | Not directly | Yes | Useful for user metadata and ownership, but unused in current UI flow |
| `documents` | No | Yes | Current storage service uses a bucket only, not this table |
| `notes` | No | Yes | Could serve as a temporary analysis snapshot store if schema allows |
| `tasks` | No | Yes | Not used by current analyzer/opportunity flow |
| `portfolio_properties` | Yes | No | Current portfolio service is mismatched to existing schema |
| `portfolio_metrics` | Yes | No | Current portfolio service is mismatched to existing schema |

## 4. Should Deal Analyzer Use `opportunities`, `properties`, Or Both?

Recommendation: use both.

### Why not `properties` only

`properties` is the right place for listing facts, but it is not enough for the investor workflow.

The app also needs:

- deal stage/status
- investor notes
- tags
- archive state
- organization ownership
- later analysis linkage

Those belong to an opportunity or deal-tracking record, not to the canonical property row.

### Why not `opportunities` only

Using only `opportunities` would keep the current code closer to its existing assumptions, but it would mix two different concerns:

- property facts
- pipeline/workflow state

That becomes hard to maintain if the same property is re-analyzed, shared, revisited, or used in multiple investor workflows.

### Why `properties + opportunities` is the best fit

This split matches both the repo’s earlier migration intent and the current frontend domain model:

- `Property` is a standalone object in `src/lib/types/property.ts`
- `Opportunity` wraps a `property`, plus status, notes, tags, and optional analysis in `src/lib/types/opportunity.ts`

Best mapping:

- `properties`: canonical property/listing facts entered by the user or extracted from a document
- `opportunities`: the tracked deal record referencing that property and carrying workflow state

## 5. Minimal Persistence Design Using Existing Schema

Target flow requested:

`User -> Organization -> Opportunity -> Analysis`

Using the existing schema as much as possible, the minimal design should be:

### A. User

Source of identity:

- Supabase Auth user

App-owned profile row:

- `profiles`

Use:

- store user metadata
- map authenticated user to application profile data

### B. Organization

Source of tenant scope:

- `organizations`

Minimal usage:

- each user operates in one active organization context
- ownership of opportunities should be organization-scoped where existing columns allow it

If `profiles` already has a current/default org reference, that is enough for a minimal first pass. If not, the relationship has to be derived by ownership conventions already present in your existing data model.

### C. Property

Store analyzer input in:

- `properties`

Fields that clearly belong here:

- title
- country
- city
- district
- property type
- asking price
- currency
- size
- bedrooms
- condition
- listing URL
- description
- expected rent
- renovation notes
- legal notes

This should be the canonical row created from `DealAnalyzer` input.

### D. Opportunity

Store tracking/workflow state in:

- `opportunities`

Fields that should live here if the existing schema supports them:

- property reference
- organization reference
- created-by/profile reference
- status/stage
- tags
- notes
- archived flag
- saved/updated timestamps

This becomes the tracked investment record shown in Opportunity Tracker and Pipeline.

### E. Analysis

There is no listed dedicated analysis table.

Minimal no-schema-change options:

1. Preferred temporary option: store latest analysis snapshot in `notes`
2. Less preferred temporary option: store a compact analysis summary directly on `opportunities` if such columns already exist
3. Do not use `documents` for analysis payloads unless the existing `documents` table is already intended for generated artifacts rather than uploaded files

Practical temporary design:

- create property row
- create opportunity row linked to that property
- generate analysis
- store one latest serialized analysis snapshot in `notes`, linked to the opportunity if the existing schema allows that
- hydrate UI by loading property + opportunity + latest analysis note

Why `notes` is only temporary:

- analysis is structured, versioned, and query-worthy data
- freeform notes are a poor long-term fit for numeric scores and JSON payloads

## 6. Is A New `deal_analyses` Table Still Needed?

Short answer: yes, most likely still needed.

### Why it is still needed

The current product behavior and UI expect structured analysis data:

- nested score object
- recommendation
- executive summary
- rental yield estimates
- airbnb potential
- renovation ROI
- appreciation potential
- arrays of risks, opportunities, assumptions, missing data

That data is not a natural long-term fit for:

- `notes`
- `documents`
- generic columns on `opportunities`

### When it is not immediately required

It is not required for the immediate audit or for the first no-migration persistence step.

Interim answer:

- for now, use existing tables only
- for production-quality structured persistence, a dedicated `deal_analyses` table is still the right target

### Best decision framing

- `deal_analyses` is not needed today to start integrating existing tables
- `deal_analyses` is still needed later if AI outputs must be durable, queryable, and versioned cleanly

## 7. Are `organizations` And `profiles` Already Sufficient For Auth?

Short answer: sufficient for minimal auth ownership, not necessarily sufficient for full SaaS membership modeling.

### Sufficient for minimal auth flow

If the immediate goal is just:

- user signs in with Supabase Auth
- app resolves a profile
- app resolves one organization context
- user creates properties and opportunities under that organization

Then `profiles` and `organizations` are likely enough as a minimal ownership model.

### Not sufficient for richer team/org access by themselves

If the goal is:

- multiple users in the same organization
- admin/member/viewer roles
- membership-based RLS

Then `profiles` and `organizations` alone are usually not enough unless your current schema already encodes membership some other way.

Because your listed tables do not include `organization_members`, the safest conclusion is:

- enough for minimal auth and ownership
- not enough for robust multi-user organization membership unless there is already an equivalent relation in the live schema

## 8. Recommended Existing-Schema Mapping

### Frontend domain to existing tables

| Frontend concept | Existing table | Recommendation |
| --- | --- | --- |
| Authenticated user | Supabase Auth + `profiles` | Use Auth for identity, `profiles` for app metadata |
| Active tenant/org | `organizations` | Resolve one active organization per user |
| Canonical property data | `properties` | Store analyzer input here first |
| Deal tracking record | `opportunities` | Store workflow state and property linkage here |
| Analysis snapshot | `notes` temporarily | Use only as interim storage if schema can attach note to opportunity |
| Uploaded files and generated reports | `documents` | Use for file metadata, not primary structured analysis storage |
| Follow-up diligence work | `tasks` | Future fit for due diligence, not required for initial analyzer persistence |

## 9. Minimal No-Schema-Change Deal Analyzer Flow

Recommended flow using existing tables only:

1. User signs in through Supabase Auth.
2. App resolves `profiles` and one active `organizations` record.
3. User submits Deal Analyzer form.
4. App creates or reuses a `properties` row for the listing facts.
5. App creates an `opportunities` row referencing that property and carrying workflow status such as `new-opportunity` or `initial-analysis`.
6. App calls the AI analysis endpoint.
7. App stores the latest analysis snapshot in `notes` if and only if the existing `notes` schema can safely link that record to the opportunity.
8. App hydrates tracker/report views by combining:
   - property row
   - opportunity row
   - latest stored analysis snapshot

## Note

This is the best existing-schema-only path. It is not the clean final design.

## 10. What To Reuse Immediately vs Later

### Reuse immediately

- `opportunities`
- `properties`
- `organizations`
- `profiles`

### Reuse later

- `documents` for upload/report metadata
- `tasks` for due diligence workflow

### Use only as an interim workaround

- `notes` for serialized AI analysis snapshots

## Bottom Line

Against the existing Supabase tables, the current code is only directly aligned with `opportunities`.

For the Deal Analyzer workflow, the correct minimal design is to use both `properties` and `opportunities`:

- `properties` for canonical listing facts
- `opportunities` for investor workflow state

For auth and ownership, `profiles` and `organizations` are likely sufficient for a minimal single-organization implementation.

For AI persistence, a dedicated `deal_analyses` table is still the correct long-term design. Until schema work is allowed, `notes` is the least-bad interim place to store a latest analysis snapshot, assuming the live `notes` schema can relate notes to opportunities.
- `Opportunity` wraps a `property` plus workflow metadata and optional analysis

That maps naturally to:

- `properties`: canonical property facts from the Deal Analyzer form
- `opportunities`: saved deal tracking record pointing to a property and carrying status, notes, tags, archive state, and ownership

### Recommended role split

Use `properties` for:

- title
- country
- city
- district
- property type
- asking price
- currency
- size
- bedrooms
- condition
- listing URL
- description
- expected rent
- renovation notes
- legal notes
- airbnb assumptions

Use `opportunities` for:

- ownership and visibility within the app
- save/unsave behavior
- pipeline status
- tags
- investor notes
- archive/favorite flags
- link to latest analysis snapshot if one already exists in schema

## 5. Minimal Persistence Design Using Existing Schema

Target path requested:

- User -> Organization -> Opportunity -> Analysis

### Minimal design using existing tables as much as possible

#### User

Use Supabase Auth as the identity layer:

- `auth.users` for authentication
- `profiles` for app profile data

#### Organization

Use `organizations` as the account boundary.

For the minimal first implementation, one user can belong to one active organization. The current audit does not assume a membership join table because it is not in the existing list.

#### Property

Persist the Deal Analyzer input first into `properties`.

This makes `properties` the canonical record for the listing or asset being analyzed.

#### Opportunity

Persist or upsert an `opportunities` row linked to the property.

This row should represent the investor's active deal record and pipeline state.

#### Analysis

Because there is no obvious analysis table in the existing schema list, there are two realistic options:

1. Minimal now: treat analysis as transient and return it to the UI without persistence.
2. Temporary bridge: serialize the latest analysis into `notes` if the existing `notes` table supports opportunity-linked structured payloads or large text blobs.

For long-term correctness, a dedicated analysis table is still the better design.

### Recommended minimal object flow

1. User signs in through Supabase Auth.
2. App resolves the user's `profiles` row.
3. App resolves the active `organizations` row for that user.
4. Deal Analyzer form saves property facts into `properties`.
5. App creates or updates an `opportunities` row for that property within the active organization context.
6. AI analysis runs for that property/opportunity.
7. UI displays the analysis immediately.
8. If the existing `notes` table can safely hold serialized analysis snapshots, store the latest analysis there as a temporary bridge. Otherwise leave analysis transient until a dedicated table is introduced.

## 6. Is A New `deal_analyses` Table Still Needed?

### Short answer

Yes, most likely yes.

### Why it is still needed

The existing table list does not include any clearly structured place for:

- full analysis JSON payloads
- repeated analyses over time
- latest-vs-history tracking
- score fields for filtering and sorting
- model metadata
- generated timestamp history

### Why `notes` is not a clean substitute

`notes` may be usable as a temporary bridge only if it already supports:

- linkage to opportunity or property
- sufficiently large content fields
- optional metadata or typed note categories

But even then, `notes` is a poor long-term store for structured AI analysis because:

- it mixes human notes and machine analysis
- it makes filtering by score or recommendation harder
- it makes versioning and report hydration harder

### Audit conclusion

For the no-schema-change phase, you can proceed without `deal_analyses` by keeping analysis transient or storing a temporary serialized snapshot in `notes`.

For the stable product architecture, a dedicated `deal_analyses` table is still warranted.

## 7. Are `organizations` And `profiles` Already Sufficient For Auth?

### For authentication itself

Yes.

Authentication is already primarily handled by Supabase Auth, not by custom tables. In that sense:

- `auth.users` provides identity
- `profiles` is enough to hold user-level app metadata
- `organizations` is enough to anchor a minimal single-organization ownership model

### For minimal single-user organization ownership

Probably yes.

If each user only needs one active organization context, `profiles` plus `organizations` is enough for a minimal first cut.

### For multi-user organization membership

No, not by itself.

If the product needs:

- multiple users in one organization
- role-based access
- invites
- team membership

then `organizations` and `profiles` alone are usually not sufficient without a membership join model.

### Audit conclusion

`organizations` and `profiles` are already sufficient for minimal auth and ownership context.

They are not sufficient for a complete multi-user SaaS membership model unless there is some existing linking structure outside the table list you provided.

## 8. Table-By-Table Recommendation Against The Existing Schema

### `profiles`

Use for:

- display name
- avatar
- app profile metadata
- active/default organization reference if already present

### `organizations`

Use for:

- tenant boundary
- ownership scope for saved opportunities
- future reporting and collaboration scope

### `properties`

Use for:

- canonical property facts submitted through Deal Analyzer
- property reuse across analyses and opportunity saves

### `opportunities`

Use for:

- saved deal records
- pipeline status
- notes and tags
- archive/favorite workflow
- primary record rendered by Opportunity Tracker and Pipeline views

### `notes`

Use for:

- investor-authored notes
- optional temporary storage for latest serialized AI analysis only if the schema already supports that safely

Do not treat it as the preferred long-term analysis store.

### `documents`

Use for:

- uploaded files
- due diligence artifacts
- legal and renovation documents

Not recommended for structured AI deal analysis payloads.

### `tasks`

Use for:

- due diligence tasks
- follow-ups
- negotiation and acquisition checklists

Not recommended for analysis persistence.

## 9. Current Integration Gaps To Resolve Without Schema Changes

These are the main code-to-existing-schema gaps:

1. The active UI still uses `useKV(...)` and mock data instead of `opportunities`.
2. The app does not currently save Deal Analyzer form data into `properties`.
3. The app does not currently connect `profiles` and `organizations` to runtime auth flow.
4. There is no current persistence path for analysis results.
5. The portfolio service expects tables that do not exist in the listed database.

## 10. Recommended Minimal Implementation Order Without Schema Changes

1. Wire real Supabase client bootstrap and auth session handling.
2. Resolve current user through Supabase Auth and hydrate `profiles` plus active `organizations` context.
3. Persist Deal Analyzer form submissions into `properties`.
4. Create or update `opportunities` rows linked to those properties.
5. Switch Opportunity Tracker and Pipeline to read from `opportunities` instead of browser KV.
6. Keep AI analysis transient at first, or store a temporary serialized snapshot in `notes` only if the existing table supports that safely.
7. Introduce a dedicated `deal_analyses` table later when schema changes are allowed.

## Bottom Line

Against the existing schema, the current code already aligns with `opportunities` but ignores most of the other useful tables.

For the Deal Analyzer workflow, the right minimal design is to use both `properties` and `opportunities`:

- `properties` as the canonical property record
- `opportunities` as the saved investment workflow record

`profiles` and `organizations` are sufficient for minimal auth and ownership context.

A dedicated `deal_analyses` table is still likely needed later for clean structured analysis persistence, but it is not required to complete the current audit or to define the no-schema-change first step.