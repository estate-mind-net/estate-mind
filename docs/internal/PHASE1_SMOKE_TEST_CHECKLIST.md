# EstateMind Phase 1 Smoke Test Checklist

Use this checklist before every demo and before Vercel deploys.

## Preconditions
- Vercel and local envs have valid Supabase config.
- OPENAI_API_KEY is set for OpenAI-path checks.
- App builds successfully with `npm run build`.

## Test Steps
1. Register a new account.
2. Login with the same account.
3. Open My Opportunities.
4. Click New Opportunity.
5. Click Fill Demo Data.
6. Click Create Opportunity.
7. Confirm immediate redirect to Opportunity Detail.
8. Confirm save success toast appears.
9. Confirm AI Snapshot card is visible at the top of detail page.
10. Wait up to 40 seconds for analysis poll completion.
11. Confirm Recommendation is one of BUY, WATCH, AVOID.
12. Confirm Investment Score is displayed.
13. Confirm Estimated Monthly Rent is non-zero.
14. Confirm Rental Yield is non-zero.
15. Confirm Airbnb Yield is non-zero.
16. Confirm ROI Estimate is displayed.
17. Confirm AI Notes section is visible and contains at least one entry after analysis persists.
18. Navigate to My Opportunities.
19. Confirm new opportunity is listed.
20. Open the opportunity and confirm AI snapshot values still render.
21. Logout.
22. Login again.
23. Confirm the same opportunity still exists and is accessible.

## API Checks
- GET `/api/deal-analysis` (Vercel function path): returns `200` and `{ ok: true, message: "deal-analysis function alive" }`.
- POST `/api/deal-analysis` with valid property: returns `200`, `ok: true`, and `analysis` object.
- With OPENAI_API_KEY absent or provider failure, POST still returns `200` with deterministic fallback metadata.

## Pass Criteria
- No uncaught console errors during the flow.
- No broken routes.
- No 404 API errors.
- No 500 API errors for valid property payloads.
