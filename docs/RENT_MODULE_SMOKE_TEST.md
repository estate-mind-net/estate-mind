# Rent Module Smoke Test

Manual test procedure for validating the Rent module convergence with Supabase.

## Prerequisites

- Supabase migration `009_module_aware_schema.sql` has been applied
- User has a valid organization in Supabase
- App is running locally (`npm run dev`)

## Test Steps

### 1. Login and Navigate to Rent

- [ ] Login to the app
- [ ] Navigate to `/rent`
- [ ] Verify the page loads without errors
- [ ] Verify sample/demo apartments are displayed
- [ ] Verify the data source badge shows "Cloud data" or "Demo data"

### 2. Create New Rent Listing

- [ ] Click "New Listing" button
- [ ] Fill in required fields: Title, City, District, Monthly Rent, Size, Bedrooms
- [ ] Toggle some features (Furnished, Parking, Balcony)
- [ ] Add contact name and phone
- [ ] Click "Save Listing"
- [ ] Verify toast says "Saved to cloud" (if logged in with org) or "Saved locally"
- [ ] Verify redirect to the new listing's detail page

### 3. Verify Listing Appears on Dashboard

- [ ] Navigate back to `/rent`
- [ ] Verify the new listing appears in the apartment grid
- [ ] Verify the data source badge matches what was shown on save
- [ ] Verify the listing has a score and recommendation

### 4. View Detail Page

- [ ] Click on the new listing
- [ ] Verify all fields are displayed correctly (title, district, rent, size, features)
- [ ] Verify source badge shows "Cloud" or "Local"
- [ ] Verify contact card shows contact name and phone
- [ ] Verify status controls are visible

### 5. Change Status

- [ ] Change status to "Favorite" using the Favorite button
- [ ] Verify toast says "Status updated to Favorite"
- [ ] Refresh the page
- [ ] Verify status is still "Favorite"
- [ ] Change status back to "New" using the status dropdown
- [ ] Verify it persists after refresh

### 6. Edit Listing

- [ ] Click "Edit" button on the detail page
- [ ] Verify the edit form loads with current values
- [ ] Change the title and monthly rent
- [ ] Click "Save Changes"
- [ ] Verify toast says "Listing updated in cloud" or "Listing updated"
- [ ] Verify redirect to detail page with updated values
- [ ] Verify changes persist after browser refresh

### 7. Compare Apartments

- [ ] Navigate to `/rent/compare`
- [ ] Verify apartment list loads (samples + user listings)
- [ ] Verify data source badge is correct
- [ ] Select 3 apartments using checkboxes
- [ ] Verify comparison table appears with all fields
- [ ] Verify Score, Recommendation, Status, District, Rent, Size, Features are shown
- [ ] Verify Contact and Next Action columns are populated for user listings

### 8. Browser Refresh Test

- [ ] Hard refresh the browser (Ctrl+Shift+R)
- [ ] Navigate to `/rent`
- [ ] Verify cloud listings reappear (if cloud-backed)
- [ ] Verify local listings reappear (if local-backed)
- [ ] Verify no data loss

### 9. Fallback Behavior

- [ ] Open browser DevTools → Network tab
- [ ] Block requests to Supabase URL (or go offline)
- [ ] Navigate to `/rent`
- [ ] Verify page still loads with localStorage data
- [ ] Create a new listing → verify it saves to localStorage
- [ ] Re-enable network
- [ ] Refresh → verify cloud data loads again

### 10. Existing Pages Unaffected

- [ ] Navigate to `/dashboard`
- [ ] Verify existing opportunity dashboard loads correctly
- [ ] Verify no errors in console
- [ ] Navigate to `/opportunities` (MyOpportunities / Kanban)
- [ ] Verify existing opportunity list/kanban loads correctly
- [ ] Navigate to any existing opportunity detail
- [ ] Verify AI analysis and stage history still work

### 11. Delete Behavior

- [ ] On a cloud-backed listing detail page
- [ ] Verify Delete button is disabled with tooltip "Cloud delete not supported yet"
- [ ] On a local-backed listing detail page
- [ ] Verify Delete button works (prompts confirmation, deletes, redirects)

### 12. Generate Rent Analysis (Cloud-backed)

- [ ] Open a cloud-backed listing's detail page
- [ ] Verify button text says "Generate Rent Analysis"
- [ ] Click "Generate Rent Analysis"
- [ ] Verify toast says "Analysis generated and saved to cloud"
- [ ] Verify "Saved to cloud" badge appears above the analysis report
- [ ] Verify analysis report displays: Executive Summary, Price Assessment, Location, Couple Suitability, Remote Work, Comfort Risks, Pros, Cons, Missing Info
- [ ] Verify Fit Score and Recommendation are shown

### 13. Analysis Persistence on Refresh

- [ ] After generating analysis in step 12, hard refresh the page (Ctrl+Shift+R)
- [ ] Verify the analysis report loads automatically without clicking Generate
- [ ] Verify "Previously saved" badge appears above the report
- [ ] Verify button text now says "Regenerate Rent Analysis"
- [ ] Verify the analysis content is identical to what was generated in step 12

### 14. Regenerate Analysis

- [ ] Click "Regenerate Rent Analysis"
- [ ] Verify toast says "Analysis generated and saved to cloud"
- [ ] Verify "Saved to cloud" badge updates
- [ ] Refresh the page
- [ ] Verify the regenerated analysis loads (not the old one)

### 15. Analysis for Local/Demo Apartments

- [ ] Open a local-backed listing's detail page
- [ ] Click "Generate Rent Analysis"
- [ ] Verify toast says "Analysis generated" (no "saved to cloud")
- [ ] Verify no "Saved to cloud" or "Previously saved" badge
- [ ] Refresh the page
- [ ] Verify analysis is NOT persisted (button shows "Generate Rent Analysis" again)
- [ ] Repeat for a demo listing — same behavior expected

### 16. AI Findings Verification

- [ ] After generating analysis for a cloud-backed listing
- [ ] Open Supabase dashboard → `ai_findings` table
- [ ] Filter by the opportunity_id of the listing
- [ ] Verify rows exist with `finding_type` = `opportunity` (for keyPros)
- [ ] Verify rows exist with `finding_type` = `risk` (for keyCons + comfortRisks)
- [ ] Verify rows exist with `finding_type` = `missing_evidence` (for missingInformation)
- [ ] Verify all rows have `source_type` = `listing`
- [ ] Verify `organization_id` matches the logged-in org
- [ ] Regenerate analysis and verify findings are replaced (count may change)

## Expected Results Summary

| Feature | Cloud-backed | Local-backed | Demo |
|---|---|---|---|
| Dashboard list | ✅ Shows cloud data | ✅ Shows localStorage | ✅ Shows samples |
| Create | ✅ Saves to Supabase | ✅ Saves to localStorage | N/A |
| Detail view | ✅ Full fields from module_data | ✅ Full fields | ✅ Read-only |
| Status update | ✅ Persists to Supabase | ✅ Persists to localStorage | ❌ No status controls |
| Edit | ✅ Updates via adapter | ✅ Updates localStorage | ❌ "Cannot edit" |
| Delete | ❌ Disabled | ✅ Works | ❌ No delete |
| Compare | ✅ Includes cloud data | ✅ Includes local data | ✅ Samples only |
| Analysis generate | ✅ Saved to notes + ai_findings | ✅ Display only | ✅ Display only |
| Analysis on refresh | ✅ Loads from notes | ❌ Not persisted | ❌ Not persisted |
| Analysis regenerate | ✅ Replaces note + findings | ✅ Display only | ✅ Display only |
| Source badge | ☁️ Cloud | 🗄 Local | Demo |

## Failure Criteria

If any of the following occur, the smoke test **fails**:

- Page crashes or shows blank
- Console errors related to Supabase queries
- Data loss after refresh
- Existing `/dashboard` or `/opportunities` pages broken
- Status changes don't persist
- Edit form shows wrong data
- Comparison table missing fields for cloud listings
- Analysis generates but save toast shows error
- Analysis doesn't reload after refresh for cloud-backed listings
- Regenerated analysis not reflected after refresh
- AI findings not replaced on regenerate
