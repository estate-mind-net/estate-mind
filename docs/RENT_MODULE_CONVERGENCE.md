# Rent Module Convergence — Architecture Documentation

## Overview

The Rent module has been migrated from a pure localStorage architecture to a hybrid cloud/local model using EstateMind's shared Supabase infrastructure. All Rent pages now attempt cloud storage first, falling back gracefully to localStorage when Supabase is unavailable or the user has no organization context.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Rent Pages (5 total)                           │
│  RentDashboardPage                              │
│  NewRentOpportunityPage                         │
│  RentOpportunityDetailPage                      │
│  EditRentOpportunityPage                        │
│  RentComparisonPage                             │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│  rentSupabaseAdapter.ts                         │
│  Maps RentalApartment ↔ Property + Opportunity  │
│  Stage ↔ Status translation                     │
│  module_data extraction/creation                │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│  OpportunityWorkspaceService                    │
│  Module-aware methods:                          │
│  - getOpportunitiesByModule('rent')             │
│  - getOpportunityByIdForModule(id, 'rent')      │
│  - createOpportunityForModule('rent', ...)      │
│  - updateOpportunityModuleData(...)             │
│  - updateOpportunityWorkflowFields(...)         │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│  Supabase (properties + opportunities tables)   │
│  Both tables have module_type = 'rent'          │
│  module_data JSONB stores rent-specific fields  │
└─────────────────────────────────────────────────┘
```

Fallback chain: Supabase → localStorage (`rentStorage.ts`) → sample data (`sampleApartments.ts`)

## Database Changes (Migration 009)

Migration `db/migrations/009_module_aware_schema.sql` adds the following to the shared tables:

### `properties` table
| Column | Type | Default | Purpose |
|---|---|---|---|
| `module_type` | `text NOT NULL` | `'invest'` | Which module owns this property |
| `module_data` | `jsonb NOT NULL` | `'{}'` | Module-specific data |

### `opportunities` table
| Column | Type | Default | Purpose |
|---|---|---|---|
| `module_type` | `text NOT NULL` | `'invest'` | Which module owns this opportunity |
| `module_data` | `jsonb NOT NULL` | `'{}'` | Module-specific data |
| `contact_name` | `text` | `null` | Contact person (landlord, agent) |
| `contact_phone` | `text` | `null` | Contact phone number |
| `next_action` | `text` | `null` | Next planned action |
| `viewed_at` | `timestamptz` | `null` | When the property was physically viewed |

### Indexes
- `idx_properties_module_type` on `(organization_id, module_type)`
- `idx_opportunities_module_type` on `(organization_id, module_type)`
- `idx_opportunities_module_stage` on `(organization_id, module_type, stage)`

### Constraint
Both `module_type` columns have a CHECK constraint allowing:
`'invest', 'rent', 'buy', 'build', 'renovate', 'airbnb', 'due-diligence', 'energy', 'portfolio'`

## How Rent Maps to Shared Tables

### Property fields
| RentalApartment field | Database column |
|---|---|
| `title` | `properties.title` |
| `city` | `properties.city` |
| `district` | `properties.address` |
| `currency` | `properties.currency` |
| `sizeM2` | `properties.area_sqm` |
| `bedrooms` | `properties.bedrooms` |
| `listingUrl` | `properties.listing_url` |
| `notes` | `properties.description` |
| — | `properties.module_type = 'rent'` |
| — | `properties.module_data = {}` |

### Opportunity fields
| RentalApartment field | Database column |
|---|---|
| `title` | `opportunities.title` |
| `status` | `opportunities.stage` (mapped) |
| `monthlyRent` | `opportunities.expected_monthly_rent` + `module_data.monthlyRent` |
| `contactName` | `opportunities.contact_name` |
| `contactPhone` | `opportunities.contact_phone` |
| `nextAction` | `opportunities.next_action` |
| `viewedAt` | `opportunities.viewed_at` |
| — | `opportunities.module_type = 'rent'` |
| — | `opportunities.module_data` (see below) |

## module_data Structure

```json
{
  "monthlyRent": 650,
  "furnished": true,
  "parking": false,
  "balcony": true,
  "elevator": true,
  "petsAllowed": false,
  "floor": 3,
  "score": 78,
  "recommendation": "Good Fit"
}
```

Stored on both `properties.module_data` and `opportunities.module_data`. The adapter reads from the opportunity row.

## Status ↔ Stage Mapping

| RentalStatus | Opportunity Stage | UI Label |
|---|---|---|
| `new` | `lead` | New |
| `shortlisted` | `interested` | Shortlisted |
| `viewing_scheduled` | `negotiating` | Viewing Scheduled |
| `viewed` | `due-diligence` | Viewed |
| `favorite` | `offer-made` | Favorite |
| `rejected` | `rejected` | Rejected |

Reverse mapping for stages not in the table defaults to `new`.

## localStorage Fallback Behavior

Each Rent page follows this pattern:

1. **Check for Supabase context** (`organization.id` and `user.id` from `useAuth()`)
2. **Try Supabase adapter** (`rentSupabaseAdapter.method(...)`)
3. **On failure**: fall back to `rentStorage` (localStorage)
4. **On no data at all**: show sample/demo data

| Scenario | Data Source | Badge |
|---|---|---|
| Supabase succeeds with data | `cloud` | ☁️ Cloud |
| Supabase fails or empty, localStorage has data | `local` | 🗄 Local |
| No user data anywhere | `demo` | Demo |

## File Structure

```
src/modules/rent/
├── components/
│   ├── RentAnalysisReport.tsx
│   ├── RentOpportunityCard.tsx
│   └── RentPreferencesPanel.tsx
├── data/
│   └── sampleApartments.ts          # Demo/sample data (unchanged)
├── pages/
│   ├── RentDashboardPage.tsx         # ✅ Cloud-aware
│   ├── NewRentOpportunityPage.tsx    # ✅ Cloud-aware
│   ├── RentOpportunityDetailPage.tsx # ✅ Cloud-aware
│   ├── EditRentOpportunityPage.tsx   # ✅ Cloud-aware
│   └── RentComparisonPage.tsx        # ✅ Cloud-aware
├── services/
│   ├── rentAnalysis.ts              # Deterministic local analysis (unchanged)
│   ├── rentScoring.ts               # Preference-based scoring (unchanged)
│   ├── rentStorage.ts               # localStorage fallback (unchanged)
│   └── rentSupabaseAdapter.ts       # ✅ New — maps to shared service
└── types.ts                         # RentalApartment, RentalStatus, etc.
```

## Known Limitations

1. **Cloud delete not supported**: `deleteRentApartment()` returns a placeholder error. The Delete button is disabled with a tooltip for cloud-backed apartments.

2. **Country defaults to 'Serbia'**: `createRentApartment()` hardcodes `country: 'Serbia'`. Should be made configurable.

3. **Deterministic analysis not persisted**: The rent analysis (`rentAnalysis.ts`) generates results client-side and does not save them to Supabase. Analysis results are lost on page refresh.

4. **Edit limited by source**: Editing a demo apartment shows "Demo apartments cannot be edited". Cloud and local apartments can be edited normally.

5. **No real-time sync**: Data is loaded once on page mount. Changes made in another tab/device are not reflected until page refresh.

6. **Scoring recomputed on each view**: `scoreRentalApartment` runs client-side on each render using `DEFAULT_RENT_PREFERENCES`. Custom preferences are not persisted.

## Test Checklist

See [RENT_MODULE_SMOKE_TEST.md](./RENT_MODULE_SMOKE_TEST.md) for the manual smoke test procedure.