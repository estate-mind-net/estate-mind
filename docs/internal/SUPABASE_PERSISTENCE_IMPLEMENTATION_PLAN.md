# Supabase Persistence Implementation Plan

## Scope

This plan uses the actual live EstateMind Supabase schema exactly as it exists today.

No code changes are included here.
No migrations are included here.
No table renames are included here.

Live tables in scope:

- `documents`
- `notes`
- `opportunities`
- `organizations`
- `profiles`
- `properties`
- `tasks`

## Executive Summary

The most practical incremental path is:

1. Save Deal Analyzer property facts into `properties`.
2. Create a linked deal-tracking row in `opportunities`.
3. Run AI analysis after those rows exist.
4. Temporarily save the latest analysis snapshot in `notes` only if needed for short-term continuity.
5. Add a dedicated `deal_analyses` table in the next schema step if AI history is a real product requirement.

The live schema is already good enough to start persistence for:

- user ownership via `profiles`
- organization scoping via `organizations`
- canonical asset data via `properties`
- deal workflow via `opportunities`
- temporary text-based analysis storage via `notes`

It is not yet sufficient for production-grade structured AI analysis history.

## 1. Current Live Schema Roles

### `organizations`

Use as the tenant boundary.

Relevant live columns:

- `id`
- `name`
- `type`
- `investment_focus`
- `country`
- `currency`
- `created_at`

### `profiles`

Use as the application profile and user-to-organization link.

Relevant live columns:

- `id`
- `organization_id`
- `full_name`
- `role`
- `created_at`

This is enough for a minimal single-organization or one-primary-organization auth model.

### `properties`

Use as the canonical property/listing record.

Relevant live columns:

- `id`
- `organization_id`
- `title`
- `city`
- `country`
- `address`
- `property_type`
- `status`
- `asking_price`
- `estimated_value`
- `area_sqm`
- `bedrooms`
- `bathrooms`
- `noi`
- `occupancy_pct`
- `created_at`

### `opportunities`

Use as the deal-tracking and investment workflow record.

Relevant live columns:

- `id`
- `organization_id`
- `property_id`
- `title`
- `stage`
- `priority`
- `estimated_roi`
- `expected_monthly_rent`
- `renovation_budget`
- `notes`
- `created_at`

### `notes`

Use for temporary narrative or serialized analysis snapshots only.

Relevant live columns:

- `id`
- `organization_id`
- `opportunity_id`
- `content`
- `created_at`

### `documents`

Use for uploaded files and document metadata, not as the primary AI analysis store.

Relevant live columns:

- `id`
- `organization_id`
- `property_id`
- `title`
- `file_url`
- `document_type`
- `created_at`

### `tasks`

Use later for due diligence and follow-up work tied to opportunities.

Relevant live columns:

- `id`
- `organization_id`
- `opportunity_id`
- `title`
- `status`
- `due_date`
- `created_at`

## 2. Recommended Domain Model Using The Live Schema

Recommended runtime model:

- User -> `profiles`
- Organization -> `organizations`
- Property -> `properties`
- Opportunity -> `opportunities`
- Temporary analysis snapshot -> `notes`

This gives the requested flow:

User -> Organization -> Opportunity -> Analysis

with one important refinement:

- the AI analysis is generated from a `property`
- but product workflow attaches it to an `opportunity`

So the operational flow should be:

User -> Organization -> Property -> Opportunity -> Analysis

## 3. DealAnalyzer Form Mapping To `properties` And `opportunities`

Current Deal Analyzer form fields:

- `title`
- `country`
- `city`
- `district`
- `propertyType`
- `askingPrice`
- `currency`
- `sizeSqm`
- `bedrooms`
- `condition`
- `listingUrl`
- `description`
- `expectedRent`
- `airbnbAssumptions`
- `renovationNotes`
- `legalNotes`

### A. Map to `properties`

Recommended direct mapping:

| DealAnalyzer field | Live `properties` column | Mapping note |
| --- | --- | --- |
| `title` | `title` | direct |
| `city` | `city` | direct |
| `country` | `country` | direct |
| `district` | `address` | temporary approximation until a dedicated district/address split exists |
| `propertyType` | `property_type` | direct |
| `askingPrice` | `asking_price` | direct |
| `sizeSqm` | `area_sqm` | direct |
| `bedrooms` | `bedrooms` | direct |
| `expectedRent` | `noi` or none | do not map directly to `noi`; store derived economics on opportunity instead |
| initial lifecycle state | `status` | set to a default such as `analyzing` or `prospect` only if already consistent with live usage |

Recommended controlled defaults in `properties` where the form has no field:

| Live `properties` column | Recommended initial value |
| --- | --- |
| `organization_id` | current profile organization |
| `estimated_value` | `asking_price` initially |
| `bathrooms` | `NULL` |
| `noi` | `NULL` unless calculated server-side |
| `occupancy_pct` | `NULL` |
| `created_at` | database default |

### B. Fields not represented cleanly in `properties`

These current Deal Analyzer inputs do not have a clean home in the live `properties` table:

- `currency`
- `condition`
- `listingUrl`
- `description`
- `airbnbAssumptions`
- `renovationNotes`
- `legalNotes`

Short-term recommendation:

- do not force these into wrong columns
- preserve them in a structured temporary note if needed for continuity
- prioritize only the fields the live table can store correctly

### C. Map to `opportunities`

Recommended direct mapping:

| Source field/value | Live `opportunities` column | Mapping note |
| --- | --- | --- |
| created property id | `property_id` | required linkage |
| current profile organization | `organization_id` | required linkage |
| `title` | `title` | usually copy from property title |
| default workflow state | `stage` | set to `new-opportunity` or `initial-analysis` depending on flow |
| default business urgency | `priority` | set a default such as `medium` |
| AI-derived ROI later | `estimated_roi` | populate after analysis |
| `expectedRent` | `expected_monthly_rent` | direct if provided |
| user renovation input | `renovation_budget` | only if you parse or estimate a number; otherwise leave null |
| freeform user notes | `notes` | store concise narrative context |

### D. Fields not represented cleanly in `opportunities`

These current UI concepts have no obvious live columns in `opportunities`:

- tags
- archive flag
- favorite flag
- updated timestamp
- analysis snapshot id

Those remain gaps between the live schema and the current frontend model.

## 4. Recommended Save Flow

Recommended implementation sequence for a single analyzer submission:

### Step 1. Resolve user and organization context

Before saving anything:

1. Resolve the signed-in Supabase Auth user.
2. Load the `profiles` row by `profiles.id = auth.user.id`.
3. Read `profiles.organization_id`.
4. Load the organization row.

If no valid `organization_id` exists, stop before property creation.

### Step 2. Create property

Insert one row into `properties` with the canonical property facts that map cleanly to the live schema.

Minimum recommended payload:

- `organization_id`
- `title`
- `city`
- `country`
- `address`
- `property_type`
- `status`
- `asking_price`
- `estimated_value`
- `area_sqm`
- `bedrooms`

Optional values when available and trustworthy:

- `bathrooms`
- `noi`
- `occupancy_pct`

### Step 3. Create opportunity

Insert one row into `opportunities` linked to the new property.

Minimum recommended payload:

- `organization_id`
- `property_id`
- `title`
- `stage`
- `priority`
- `expected_monthly_rent`
- `notes`

Leave these null until analysis exists:

- `estimated_roi`
- `renovation_budget`

### Step 4. Run AI analysis

Only after the property and opportunity exist:

1. call AI analysis endpoint
2. send both `property` data and `opportunityId`
3. use persisted ids as the source of truth

This removes the current transient-only behavior.

### Step 5A. Temporary save using `notes`

If no schema changes are allowed yet, save one analysis snapshot to `notes`.

Recommended note structure:

- `organization_id`
- `opportunity_id`
- `content`

Recommended `content` format:

- JSON string with a version prefix, or
- a markdown block with a short summary plus serialized payload

Best temporary convention:

```text
[analysis:v1]{json-payload}
```

This allows parsing later while keeping the current schema unchanged.

### Step 5B. Preferred future save using `deal_analyses`

Once schema work is allowed, write AI output to a dedicated `deal_analyses` table instead of `notes`.

## 5. Temporary `notes` Strategy vs Dedicated `deal_analyses`

### When `notes` is acceptable temporarily

Use `notes` temporarily if all of these are true:

- you only need the latest analysis snapshot
- filtering and sorting by AI score are not yet required in SQL
- full analysis history is not yet a product requirement
- human notes and machine notes can be distinguished by a content prefix or convention

### Why `notes` is not production-grade for AI history

`notes` has only:

- `id`
- `organization_id`
- `opportunity_id`
- `content`
- `created_at`

That means it lacks explicit typed fields for:

- recommendation
- score values
- model name
- payload version
- confidence
- status of generation
- generated by

It is fine as a bridge, not as the final design.

## 6. Exact Missing Columns For Production-Grade AI Analysis History

If the product needs reliable structured analysis history, the current live schema is missing a dedicated analysis record with at least the following fields.

### Required identity and linkage

- `id uuid`
- `organization_id uuid`
- `opportunity_id uuid`
- `property_id uuid`
- `profile_id uuid` or `generated_by uuid`

### Required lifecycle metadata

- `created_at timestamptz`
- `updated_at timestamptz`
- `analysis_version text`
- `model_name text`
- `provider text`
- `status text`

### Required structured result fields

- `recommendation text`
- `overall_score numeric`
- `rental_yield_score numeric`
- `airbnb_potential_score numeric`
- `appreciation_score numeric`
- `renovation_score numeric`
- `legal_score numeric`
- `liquidity_score numeric`
- `energy_score numeric`

### Required narrative fields

- `executive_summary text`
- `risks jsonb` or `text[]`
- `opportunities jsonb` or `text[]`
- `assumptions jsonb` or `text[]`
- `missing_data jsonb` or `text[]`

### Required financial breakdown fields

- `rental_yield_estimate jsonb`
- `airbnb_potential jsonb`
- `renovation_roi jsonb`
- `appreciation_potential jsonb`

### Required raw payload retention

- `analysis_payload jsonb`

### Useful operational fields

- `prompt_version text`
- `latency_ms integer`
- `error_message text`
- `supersedes_analysis_id uuid`
- `is_latest boolean`

## 7. Recommendation: Add `deal_analyses` Now Or Later?

### Recommendation

Yes, add `deal_analyses` soon, but not as the very first coding step.

### Practical sequencing recommendation

Do this in two layers:

#### Layer 1. Start implementation now on existing schema only

Implement first:

1. resolve profile and organization
2. create `properties`
3. create `opportunities`
4. run AI analysis
5. store latest analysis snapshot in `notes`

This is the fastest path to real persistence without schema work.

#### Layer 2. Add `deal_analyses` as the first schema enhancement after that path works

Add `deal_analyses` next if any of these are true:

- you need repeat analyses over time
- you need report history
- you need SQL filtering by score or recommendation
- you need auditing of which model produced what
- you need to separate human notes from machine analysis

### Bottom-line recommendation

- do not block initial persistence on `deal_analyses`
- do plan `deal_analyses` as the next schema change after the first persistence slice is working

## 8. Incremental Implementation Plan

### Phase 1. Establish org-scoped persistence using existing tables only

Goal:

- save analyzer submissions into real Supabase rows without migrations

Work:

1. bootstrap real Supabase client runtime
2. resolve current auth user
3. load `profiles.organization_id`
4. create `properties` row from analyzer form
5. create `opportunities` row linked to that property

Success criteria:

- new analyzer submissions create one property and one opportunity in the live schema

### Phase 2. Attach AI output with temporary `notes`

Goal:

- preserve latest analysis without schema changes

Work:

1. update AI request to include persisted `opportunityId`
2. generate analysis after property and opportunity creation
3. store latest analysis snapshot in `notes.content`
4. hydrate report view from latest saved note when present

Success criteria:

- a saved opportunity can reopen its latest analysis

### Phase 3. Switch app reads from local KV to Supabase

Goal:

- use live opportunities as the application source of truth

Work:

1. replace browser KV state in tracker
2. replace browser KV state in pipeline
3. load related property data alongside opportunity rows
4. attach latest parsed note snapshot as temporary analysis data

Success criteria:

- tracker and pipeline reflect real persisted opportunities

### Phase 4. Add `deal_analyses`

Goal:

- make AI persistence structured, queryable, and historical

Work:

1. create `deal_analyses` schema in a later migration
2. migrate analysis persistence from `notes` to `deal_analyses`
3. keep `notes` for human-authored notes only

Success criteria:

- analysis history is typed, queryable, and separate from investor notes

## 9. Practical Mapping Decisions To Make Explicit Up Front

These decisions should be locked before implementation starts:

1. `profiles.organization_id` is the active organization source of truth.
2. `properties` is the canonical property record.
3. `opportunities` is the canonical deal workflow record.
4. `notes` is a temporary analysis bridge only, not the final AI store.
5. `tasks` and `documents` are not part of the first persistence slice.

## 10. Bottom Line

The live schema is already sufficient to start real persistence for Deal Analyzer submissions.

Recommended immediate path:

1. create property
2. create opportunity
3. run AI analysis
4. save latest analysis temporarily in `notes`

Recommended schema path after that:

1. add `deal_analyses`
2. move analysis persistence out of `notes`
3. keep `notes` for human notes only

That approach is practical, incremental, and uses the live EstateMind schema as it exists today.