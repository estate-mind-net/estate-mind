# Rent Hunter — Manual Smoke Test

**Purpose**: Verify the full Rent Hunter flow works end-to-end without breaking existing functionality.

**Prerequisites**:
- EstateMind app running locally (`npm run dev`)
- Supabase project configured with `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env.local`
- At least one organization created (or use the default from auth)
- Database tables: `investment_search_briefs`, `opportunity_sources`, `opportunity_matches`, `raw_opportunities`, `opportunities`

---

## Test Steps

### 1. Login

- Navigate to `/login`
- Enter valid credentials
- Verify redirect to `/dashboard`
- **Expected**: Dashboard loads without errors

### 2. Open Rent Hunter Dashboard

- Navigate to `/rent/hunter`
- **Expected**: Page loads with "Rent Hunter" heading
- **Expected**: "No Rent Demo Source" card is visible (if no demo source exists yet)
- **Expected**: "No rent briefs yet" card is visible (if no rent briefs exist yet)

### 3. Create Demo Rent Source

- Click **"Create Demo Rent Source"** button
- **Expected**: Button shows "Creating..." during operation
- **Expected**: Toast "Rent Demo Source created." appears
- **Expected**: "No Rent Demo Source" card disappears
- **Verify**: Refresh page — button should not reappear

### 4. Create Rent Brief

- Click **"New Rent Brief"** button
- **Expected**: Redirect to `/rent/hunter/new`
- Fill in the form:
  - **Title**: `2BR Liman under €600`
  - **City**: `Novi Sad`
  - **Currency**: `EUR`
  - **Preferred Districts**: `Liman, Liman 4, Grbavica`
  - **Bedrooms**: `2`
  - **Max Monthly Rent**: `600`
  - **Min Monthly Rent**: `300`
  - **Min Size**: `40`
  - **Max Size**: `80`
  - Toggle on: **Furnished required**, **Balcony preferred**, **Quiet area important**
  - Toggle off: **Active brief** (leave ON)
- Click **"Create Rent Brief"**
- **Expected**: Toast "Rent search brief created." appears
- **Expected**: Redirect to `/rent/hunter/:id` (brief detail page)

### 5. Run Rent Discovery

- On the brief detail page, click **"Run Rent Discovery"**
- **Expected**: Button shows "Running Discovery..." during operation
- **Expected**: Toast "Discovery complete: X matches." appears (X ≥ 0)
- **Expected**: Matches section updates with listing cards

### 6. Verify Raw Opportunities & Matches

- **Expected**: Each match card shows:
  - Title (e.g., "Liman 2 · 55m² · 2 bed · €520/mo")
  - District, monthly rent, size, bedrooms
  - Match score (0–100) with color coding
  - Match reasons (green badges)
  - Mismatch reasons (red badges, if any)
- **Expected**: Scores are reasonable (brief criteria are reflected in scoring)
- **Expected**: Listings mention districts from the brief (Liman, Liman 4, Grbavica)

### 7. Save One Match to Rent

- On a match card with a good score, click **"Save to Rent"**
- **Expected**: Button shows "Saving..." during operation
- **Expected**: Toast "Saved to Rent." appears
- **Expected**: Redirect to `/rent/:id` (Rent opportunity detail page)
- **Expected**: Page shows the apartment with correct title, district, rent, size

### 8. Open Rent Dashboard

- Navigate to `/rent`
- **Expected**: Rent dashboard loads with apartment cards
- **Expected**: The saved apartment from step 7 appears in the listing
- **Expected**: "Rent Hunter" button is visible in the toolbar

### 9. Verify Saved Apartment

- Find the saved apartment card in the grid
- **Expected**: Title, district, rent, size, bedrooms are correct
- **Expected**: Status shows "New"
- **Expected**: Score/recommendation is calculated

### 10. Open Apartment Detail

- Click on the saved apartment card
- **Expected**: Detail page loads at `/rent/:id`
- **Expected**: All fields are populated correctly
- **Expected**: Edit functionality works

### 11. Generate Rent Analysis

- On the apartment detail page, click **"Generate Analysis"** (or equivalent)
- **Expected**: AI analysis completes (or mock analysis if AI is unavailable)
- **Expected**: Investment score, recommendation, and analysis details are displayed
- **Expected**: No errors in console

### 12. Confirm Investment Hunter Still Works

- Navigate to `/opportunity-hunter`
- **Expected**: Investment Hunter dashboard loads normally
- **Expected**: Existing invest briefs are listed (not rent briefs)
- **Expected**: "New Brief" button works
- Click on an existing invest brief (if any)
- **Expected**: Brief detail loads with invest-specific fields
- **Expected**: "Run Discovery" works for invest briefs
- Navigate to `/opportunity-hunter/new`
- **Expected**: Form loads with invest-specific fields (countries, rental_strategy, target_yield, etc.)
- **Expected**: No rent-specific fields appear

---

## Regression Checks

| Check | Expected |
|---|---|
| `/dashboard` loads | ✅ No errors |
| `/opportunities` loads | ✅ Existing opportunities shown |
| `/opportunities/new` loads | ✅ Form works |
| `/opportunity-hunter` loads | ✅ Invest briefs shown |
| `/opportunity-hunter/new` loads | ✅ Invest form shown |
| `/rent` loads | ✅ Rent dashboard shown |
| `/rent/new` loads | ✅ Manual rent form works |
| `/rent/compare` loads | ✅ Comparison page works |
| `/settings` loads | ✅ Settings page works |
| Browser console | ✅ No new errors |

---

## Manual URL Import Test

### 13. Import Listing URL

- Navigate to `/rent/hunter`
- Click **"Import Listing URL"** button
- **Expected**: Redirect to `/rent/hunter/import-url`
- **Expected**: Form shows URL input and Notes field

### 14. Submit URL

- Enter a valid URL: `https://example.com/apartment/123`
- Optionally add notes: `Found via recommendation`
- Click **"Add URL"**
- **Expected**: Button shows "Processing..."
- **Expected**: Toast "URL imported. Fill in the details on the next screen."
- **Expected**: Redirect to `/rent/hunter/manual-completion/:rawId`
- **Expected**: Page shows "Complete Listing Details" heading
- **Expected**: Listing URL is displayed as a clickable link
- **Expected**: Note: "We do not scrape this site. Please confirm listing details manually." is visible

### 15. Validation — Empty Fields

- Without filling anything, click **"Save & Match"**
- **Expected**: Validation errors appear:
  - "City is required."
  - "Monthly rent is required and must be greater than 0."
  - "Size (m²) is required and must be greater than 0."
  - "Bedrooms is required and must be 0 or more."

### 16. Validation — Invalid Values

- Enter rent as `0`, size as `-5`, bedrooms as `-1`
- Click **"Save & Match"**
- **Expected**: Validation errors for rent and size

### 17. Complete Details & Match

- Fill in:
  - **City**: `Novi Sad`
  - **District**: `Liman`
  - **Monthly Rent**: `520`
  - **Size**: `55`
  - **Bedrooms**: `2`
  - Check: **Furnished**, **Balcony**
- Click **"Save & Match"**
- **Expected**: Button shows "Saving..." then "Matching..."
- **Expected**: Toast "Listing completed and matched."
- **Expected**: Match Result card appears with:
  - Score (0-100)
  - Match reasons (green badges)
  - Mismatch reasons (red badges, if any)
- **Expected**: "Save to Rent" button is now visible

### 18. Save to Rent

- Click **"Save to Rent"**
- **Expected**: Button shows "Saving..."
- **Expected**: Toast "Saved to Rent."
- **Expected**: Redirect to `/rent/:id`

### 19. Verify in Rent Dashboard

- Navigate to `/rent`
- **Expected**: The imported apartment appears in the listing
- **Expected**: Title, city, rent, size are correct
- **Expected**: Listing URL is preserved

### 20. Generate Analysis

- Open the saved apartment detail
- Click **"Generate Analysis"**
- **Expected**: Analysis completes (or mock analysis)
- **Expected**: No errors

---

## 4zida Text Extraction Test

### 25. Import 4zida URL

- Navigate to `/rent/hunter/import-url`
- Enter a 4zida URL: `https://www.4zida.rs/izdavanje-stanova/novi-sad/liman/dvosoban/12345`
- Click **"Add URL"**
- **Expected**: Redirect to `/rent/hunter/manual-completion/:rawId`
- **Expected**: 4zida helper panel visible: "Paste listing text from 4zida to auto-fill fields"

### 26. Expand 4zida Helper

- Click the 4zida helper panel
- **Expected**: Textarea and "Extract Fields" button appear
- **Expected**: Description: "Copy visible text from the 4zida listing page and paste it below."

### 27. Paste Listing Text

- Paste sample 4zida listing text:
  ```
  Dvosoban stan, Liman 2
  55m², 2. sprat
  550€ mesečno
  Namešten, terasa, parking, lift
  Novi Sad
  ```
- Click **"Extract Fields"**
- **Expected**: Results appear with:
  - Confidence ≥ 60%
  - Extracted fields: title, monthlyRent, currency, sizeM2, bedrooms, city, district, floor, furnished, parking, balcony, elevator
  - Warnings (if any)

### 28. Apply to Form

- Click **"Apply to Form"**
- **Expected**: Toast "Fields applied from 4zida text."
- **Expected**: Form fields updated:
  - City: Novi Sad
  - District: Liman 2
  - Monthly Rent: 550
  - Size: 55
  - Bedrooms: 2
  - Floor: 2
  - Furnished: checked
  - Parking: checked
  - Balcony: checked (terasa)
  - Elevator: checked

### 29. Save & Match

- Click **"Save & Match"**
- **Expected**: Validation passes (city, rent, size, bedrooms all filled)
- **Expected**: Match result card appears with score and reasons

### 30. Save to Rent

- Click **"Save to Rent"**
- **Expected**: Redirect to `/rent/:id`
- **Expected**: Apartment has correct details from 4zida text

### 31. Verify Non-4zida URL

- Import a non-4zida URL (e.g., `https://example.com/listing/123`)
- Navigate to manual completion page
- **Expected**: 4zida helper panel NOT visible

---

## Duplicate URL Detection Test

### 21. Import Same URL Twice

- Navigate to `/rent/hunter/import-url`
- Enter the **same URL** used in step 14: `https://example.com/apartment/123`
- Click **"Add URL"**
- **Expected**: Toast "This listing URL was already imported."
- **Expected**: Redirect to `/rent/hunter/manual-completion/:rawId` (the same rawId from step 14)
- **Expected**: No new raw_opportunity created
- **Expected**: No new source_connector_run created

### 22. Import URL Variant (with tracking params)

- Navigate to `/rent/hunter/import-url`
- Enter the same URL with tracking params: `https://example.com/apartment/123?utm_source=fb&utm_medium=cpc`
- Click **"Add URL"**
- **Expected**: Toast "This listing URL was already imported." (normalized URLs match)
- **Expected**: Redirect to the same manual-completion page

### 23. Import URL Variant (trailing slash)

- Navigate to `/rent/hunter/import-url`
- Enter: `https://example.com/apartment/123/`
- Click **"Add URL"**
- **Expected**: Toast "This listing URL was already imported."
- **Expected**: Redirect to the same manual-completion page

### 24. Import New URL (not duplicate)

- Navigate to `/rent/hunter/import-url`
- Enter a **new** URL: `https://example.com/apartment/456`
- Click **"Add URL"**
- **Expected**: Normal import flow (no duplicate toast)
- **Expected**: Redirect to a new manual-completion page

---

## Known Limitations

- `module_type` column on `investment_search_briefs` and `opportunity_sources` may not exist yet. The app handles this gracefully — insert attempts may silently ignore the field.
- Demo data is generated fresh each discovery run. Results may vary slightly.
- Commute and lifestyle scores in the matching engine are randomized (demo only).
- Only `RentDemoConnector` is registered. Portal connectors (4zida, CityExpert, Halo Oglasi) are not yet implemented.

---

## Test Data Cleanup

After testing, to clean up demo data:

```sql
-- Remove demo source
DELETE FROM opportunity_sources WHERE type = 'rent_demo';

-- Remove rent briefs
DELETE FROM investment_search_briefs WHERE module_type = 'rent';

-- Remove matches linked to rent briefs
DELETE FROM opportunity_matches WHERE brief_id IN (
  SELECT id FROM investment_search_briefs WHERE module_type = 'rent'
);