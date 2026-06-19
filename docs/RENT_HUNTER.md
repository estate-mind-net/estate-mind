# Rent Hunter — Architecture & Design

## Overview

Rent Hunter is a module within EstateMind's modular architecture that discovers rental apartment listings matching user-defined criteria. It follows the same pattern as the Investment Opportunity Hunter but is specialized for long-term rental use cases.

## Architecture

```
src/modules/rent/hunter/
├── matchingEngine.ts          # Rent-specific matching logic
├── rentMatchingEngine.ts      # Core matching: criteria → score + reasons
└── pages/
    ├── RentHunterDashboardPage.tsx   # /rent/hunter — list briefs, create demo source
    ├── RentHunterFormPage.tsx        # /rent/hunter/new — create rent brief
    └── RentHunterDetailPage.tsx      # /rent/hunter/:id — view matches, save to rent

src/services/opportunityHunter/
├── connectors/
│   └── RentDemoConnector.ts    # Generates realistic demo apartment data
├── connectorRegistry.ts        # Maps connector_type → connector implementation
└── discovery.service.ts        # Orchestration: brief → connector → matching → persist
```

### Data Flow

```
Rent Brief (module_type='rent')
        ↓
   Discovery Run
        ↓
   RentDemoConnector.fetchOpportunities()
        ↓
   Raw Opportunities (stored in raw_opportunities)
        ↓
   Rent Matching Engine (criteria vs. listing)
        ↓
   Opportunity Matches (score, reasons, mismatches)
        ↓
   Save to Rent → RentSupabaseAdapter.createRentApartment()
        ↓
   Rent Module (/rent/:id)
```

## module_type Strategy

The `module_type` field is a discriminator used to scope resources to a specific module:

| Table | Field | Values | Purpose |
|---|---|---|---|
| `investment_search_briefs` | `module_type` | `'rent'`, `'buy'`, `'invest'`, etc. | Scope briefs to module |
| `opportunity_sources` | `module_type` | `'rent'`, `'buy'`, `'invest'`, etc. | Scope sources to module |
| `opportunity_matches` | *(scoped via brief)* | — | Inherited from brief's module_type |

**Backward compatibility**: `module_type` is optional. Existing invest briefs/sources without `module_type` are unaffected. The Investment Opportunity Hunter (`/opportunity-hunter`) continues to work as before.

**Filtering**: Each module dashboard filters by `module_type`:
- `/rent/hunter` shows only briefs with `module_type='rent'`
- `/opportunity-hunter` shows briefs without `module_type` (or `module_type='invest'`)

## Brief module_data Shape

Rent briefs store rent-specific criteria in the `module_data` JSONB column:

```typescript
interface RentModuleData {
  furnished_required: boolean       // Apartment must be furnished
  parking_required: boolean         // Parking space required
  balcony_required: boolean         // Balcony preferred
  elevator_required: boolean        // Elevator preferred
  pets_allowed_required: boolean    // Pets must be allowed
  remote_work_important: boolean    // Quiet area, good internet important
  quiet_important: boolean          // Quiet neighborhood important
  max_floor: number | null          // Maximum floor preference
  preferred_districts: string[]     // Preferred neighborhoods/districts
  bedrooms: number | null           // Number of bedrooms
}
```

**Shared fields** (on `investment_search_briefs`):
- `title`, `cities`, `districts`, `min_price`, `max_price`, `currency`
- `min_size_m2`, `max_size_m2`, `property_types`
- `notes`, `is_active`

## RentDemoConnector

**Connector type**: `rent_demo`

Generates realistic apartment listings for Novi Sad, Serbia without external API calls.

| Property | Range | Notes |
|---|---|---|
| Districts | Liman, Liman 4, Grbavica, Sajmište, Detelinara, Bistrica, Podbara, Adamovićevo Naselje, Rotkvarija, Banatić, Novo Naselje, Satelit, Telep, Avijatičarsko Naselje | 14 Novi Sad neighborhoods |
| Price | 350–850 EUR | Log-normal distribution |
| Size | 30–110 m² | Uniform + noise |
| Bedrooms | 0–3 | Weighted: studio 10%, 1BR 25%, 2BR 45%, 3BR 20% |
| Furnished | 60% probability | |
| Parking | 40% probability | |
| Balcony | 50% probability | |
| Elevator | 70% probability | |
| Pets Allowed | 45% probability | |

**Configuration** (stored in `connector_config`):
```json
{
  "demo_count": 10,
  "default_city": "Novi Sad",
  "price_range": [300, 900],
  "size_range": [30, 120],
  "strategy": "long_term"
}
```

## Rent Matching Engine

**File**: `src/modules/rent/hunter/rentMatchingEngine.ts`

### Scoring Algorithm

| Criterion | Weight | Scoring |
|---|---|---|
| Price fit | 25 | 25 if within budget, 15 if over by ≤20%, 5 if over by ≤50%, 0 otherwise |
| Size fit | 20 | 20 if within range, 10 if close, 0 otherwise |
| District match | 15 | 15 if preferred district, 8 if acceptable |
| Bedrooms | 10 | 10 if exact match, 5 if ±1 |
| Furnished | 10 | 10 if meets requirement, 0 if missing |
| Amenity score | 10 | Proportional to met amenities (parking, balcony, elevator, pets) |
| Commute proximity | 5 | Simulated (random for demo) |
| Lifestyle score | 5 | Simulated (random for demo) |

**Score range**: 0–100

### Match Reasons

Returned as string arrays on each match:
- `"Within budget"` / `"Slightly over budget"`
- `"Good size"` / `"Adequate size"`
- `"Preferred district"` / `"Acceptable district"`
- `"Furnished"` / `"Meets parking requirement"` / `"Balcony"` / etc.

### Mismatch Reasons

- `"Over budget"` / `"Significantly over budget"`
- `"Too small"` / `"Too large"`
- `"Unfurnished"`
- `"Missing parking"` / `"No balcony"` / `"Pets not allowed"`

## Save-to-Rent Flow

When a user clicks "Save to Rent" on a match in `/rent/hunter/:id`:

1. **Extract data** from `RawOpportunity` (raw_payload/normalized_payload)
2. **Map to `RentalApartment`**:
   - `title`, `city`, `district`, `monthlyRent`, `currency`
   - `sizeM2`, `bedrooms`, `floor`
   - `furnished`, `parking`, `balcony`, `elevator`, `petsAllowed`
   - `listingUrl`, `contactName`, `contactPhone`
   - `status: 'new'`
3. **Create via `RentSupabaseAdapter.createRentApartment()`**:
   - Creates entry in `opportunities` table
   - Sets `module_type='rent'`
   - Creates `rent_module_data` entry
   - Creates `workflow_fields` entry with `stage='lead'`
4. **Navigate** to `/rent/:id` (Rent detail page)

## Routes

| Route | Component | Purpose |
|---|---|---|
| `/rent` | `RentDashboardPage` | Rent overview, apartment listing, preferences |
| `/rent/hunter` | `RentHunterDashboardPage` | List rent briefs, create demo source |
| `/rent/hunter/new` | `RentHunterFormPage` | Create new rent search brief |
| `/rent/hunter/:id` | `RentHunterDetailPage` | View matches, run discovery, save to rent |
| `/rent/new` | `NewRentOpportunityPage` | Manual rent opportunity creation |
| `/rent/:id` | `RentOpportunityDetailPage` | View saved rent apartment |
| `/rent/compare` | `RentComparisonPage` | Compare rental apartments |

## Limitations (Current)

1. **Demo data only**: `RentDemoConnector` generates synthetic data. Real portal connectors not yet implemented.
2. **No automated scheduling**: Discovery runs are manual (button click). Cron/scheduled runs not yet wired for rent module.
3. **module_type column**: May not exist in database yet (migration 010 pending). Frontend handles missing column gracefully.
4. **Scoring is deterministic**: Commute and lifestyle scores are simulated with random values.
5. **Single-city focus**: Demo connector only generates Novi Sad data.

## Future Portal Connectors

### Planned Connectors

| Connector | Type | Source | Notes |
|---|---|---|---|
| **4zida** | `4zida` | [4zida.rs](https://www.4zida.rs) | Serbian rental portal, API or scraping |
| **CityExpert** | `cityexpert` | [cityexpert.rs](https://www.cityexpert.rs) | Real estate portal with rental listings |
| **Halo Oglasi** | `halo_oglasi` | [halooglasi.com](https://www.halooglasi.com) | General classifieds, rental section |

### Connector Interface

Each portal connector must implement `OpportunityConnector`:

```typescript
interface OpportunityConnector {
  type: string
  name: string
  fetchOpportunities(context: ConnectorContext): Promise<ConnectorResult>
}

interface ConnectorContext {
  organizationId: string
  sourceId: string
  connectorConfig: Record<string, unknown>
  supabaseClient: SupabaseClient
}

interface ConnectorResult {
  sourceId: string
  connectorRunId: string
  opportunities: Array<{
    externalId: string
    title: string
    description?: string
    city?: string
    price?: number
    currency?: string
    size_m2?: number
    bedrooms?: number
    rawData: Record<string, unknown>
  }>
}
```

### Registration

New connectors are registered in `src/services/opportunityHunter/connectorRegistry.ts`:

```typescript
registry.register(new FourZidaConnector())
registry.register(new CityExpertConnector())
registry.register(new HaloOglasiConnector())
```

### Terms & Rate Limiting

Each connector should:
- Respect the portal's `robots.txt` and terms of service
- Store `terms_checked` and `allowed_use_notes` on the source
- Respect `rate_limit_per_hour` from `connector_config`
- Use `contact_email` for identifying the API consumer