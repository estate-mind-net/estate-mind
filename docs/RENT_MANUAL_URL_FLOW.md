# Rent Manual URL Flow — Architecture & Design

## Why This Is Not Scraping

The Manual URL flow does **not** scrape, crawl, or extract data from any website. When a user provides a listing URL:

1. We store the URL as-is in `raw_opportunities.source_url`
2. We create a placeholder `RawOpportunity` with `needs_manual_completion=true`
3. The user must **manually fill in all property details** (city, rent, size, bedrooms, amenities)
4. No HTTP requests are made to the listing URL
5. No content is parsed, extracted, or cached from the source site
6. No robots.txt or terms of service are relevant — we never contact the site

This is a **manual data entry** flow that happens to store a reference URL for the user's convenience.

## Flow Diagram

```
User pastes listing URL
        ↓
RentImportUrlPage (/rent/hunter/import-url)
        ↓
Create/Find manual_url source (module_type='rent')
        ↓
Create source_connector_run (status: succeeded)
        ↓
Create raw_opportunity (needs_manual_completion=true)
        ↓
Navigate to /rent/hunter/manual-completion/:rawId
        ↓
RentManualCompletionPage
  ┌─ User fills in: city, district, rent, size, bedrooms, amenities
  │
  ├─ [Validation]
  │  - city required
  │  - rent > 0
  │  - size > 0
  │  - bedrooms >= 0
  │
  ├─ [Save & Match]
  │  - Update raw_opportunity with completed data
  │  - Run evaluateRentMatch() against active rent briefs
  │  - Store opportunity_matches
  │  - Show match score + reasons
  │
  └─ [Save to Rent]
     - Create opportunity via rentSupabaseAdapter
     - Navigate to /rent/:id
```

## Tables Used

| Table | Record Created | Purpose |
|---|---|---|
| `opportunity_sources` | `manual_url` source with `module_type='rent'` | Identifies manual URL imports |
| `source_connector_runs` | 1 run per import (status: succeeded) | Tracks the import action |
| `raw_opportunities` | 1 per URL | Stores the user-completed listing data |
| `opportunity_matches` | 1+ per active rent brief | Match scores against brief criteria |
| `opportunities` | 1 (when "Save to Rent" clicked) | The saved rent apartment |

## Manual Completion Fields

| Field | Required | Type | Validation |
|---|---|---|---|
| Title | No | string | — |
| City | Yes | string | Non-empty |
| District | No | string | — |
| Monthly Rent | Yes | number | > 0 |
| Currency | No | string | Default: EUR |
| Size (m²) | Yes | number | > 0 |
| Bedrooms | Yes | number | >= 0 |
| Floor | No | number | — |
| Furnished | No | boolean | — |
| Parking | No | boolean | — |
| Balcony | No | boolean | — |
| Elevator | No | boolean | — |
| Pets Allowed | No | boolean | — |

## Save-to-Rent Mapping

When the user clicks "Save to Rent", the data is mapped through `rentSupabaseAdapter.createRentApartment()`:

```
RawOpportunity fields          → RentalApartment fields
─────────────────────────────────────────────────────────
title                          → title
city                           → city
district                       → district
price                          → monthlyRent
currency                       → currency
size_m2                        → sizeM2
bedrooms                       → bedrooms
raw_payload.furnished          → furnished
raw_payload.parking            → parking
raw_payload.balcony            → balcony
raw_payload.elevator           → elevator
raw_payload.petsAllowed        → petsAllowed
raw_payload.floor              → floor
source_url                     → listingUrl
—                              → status: 'new'
```

The adapter creates:
1. An `opportunities` entry with `module_type='rent'`
2. A `rent_module_data` entry with amenity details
3. A `workflow_fields` entry with `stage='lead'`

## Routes

| Route | Component | Purpose |
|---|---|---|
| `/rent/hunter/import-url` | `RentImportUrlPage` | URL input form |
| `/rent/hunter/manual-completion/:rawId` | `RentManualCompletionPage` | Detail completion + match + save |

## Files

| File | Purpose |
|---|---|
| `src/modules/rent/hunter/services/manualUrlRentExtractor.ts` | Creates placeholder RawOpportunity from URL |
| `src/modules/rent/hunter/components/RentManualUrlForm.tsx` | URL input form component |
| `src/modules/rent/hunter/pages/RentImportUrlPage.tsx` | Import URL page (creates source, run, raw opp) |
| `src/modules/rent/hunter/pages/RentManualCompletionPage.tsx` | Manual completion page (fill, match, save) |

## Duplicate URL Detection

Before creating a new `raw_opportunity`, the import flow checks for existing entries with the same URL.

### URL Normalization

URLs are normalized before comparison:

| Rule | Example |
|---|---|
| Trim whitespace | `  https://...  ` → `https://...` |
| Lowercase protocol + host | `HTTPS://Example.COM/...` → `https://example.com/...` |
| Remove trailing slash | `https://example.com/listing/123/` → `https://example.com/listing/123` |
| Remove hash fragments | `https://example.com/listing/123#comments` → `https://example.com/listing/123` |
| Remove tracking params | `?id=1&utm_source=fb&utm_medium=cpc` → `?id=1` |

**Removed tracking params**: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `fbclid`, `gclid`

### Duplicate Detection Flow

1. User enters URL → normalized to canonical form
2. Query `raw_opportunities` where `organization_id` matches and `property_type='rental'`
3. Compare normalized URL against:
   - `raw_payload.normalizedUrl` (stored on new imports)
   - `source_url` (normalized on-the-fly for older entries)
4. If match found:
   - Toast: "This listing URL was already imported."
   - Redirect to `/rent/hunter/manual-completion/:existingRawId`
   - No new raw_opportunity or source_connector_run created
5. If no match: continue with normal import

### Storage

The normalized URL is stored in `raw_payload.normalizedUrl` on every new import, enabling fast lookups for future duplicate checks.

## Limitations

1. **No automation**: Every field must be entered manually by the user
2. **No bulk import**: One URL at a time
3. **Single source per org**: Reuses the same `manual_url` source for all imports
4. **Duplicate detection is best-effort**: Scans up to 200 recent rent raw_opportunities per org

## Future AI Extraction Path

When ready to add AI-assisted extraction:

1. Create a new service: `src/modules/rent/hunter/services/aiListingExtractor.ts`
2. Accept the listing URL + HTML content (if user provides it)
3. Call an LLM to extract structured data from the listing text
4. Pre-fill the manual completion form with extracted values
5. User reviews and confirms the extracted data
6. Same save-to-rent flow applies

Key constraints for future AI extraction:
- User must explicitly opt-in to sending URL content to AI
- Extracted data must be shown to user for review before saving
- No automatic scraping — user provides the content
- All existing tables and flows are reused