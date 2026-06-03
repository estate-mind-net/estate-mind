# Supabase Audit

Date: 2026-06-03
Repository: EstateMind (estatemind)

## Executive Conclusion

The application is not currently connected to Supabase at runtime.

Why:
- No runtime Supabase SDK client creation is present in source code.
- Supabase service layer exists, but is not wired into the UI flow.
- Main UI screens use mock data, local state, or hard-coded datasets.
- Environment variable names in .env.local do not match the variable names expected by the app config.

## 1) Supabase Client Initialization

Primary initialization abstraction:
- [src/services/supabase/client.ts](src/services/supabase/client.ts#L69)

Key behavior:
- [getSupabaseClient](src/services/supabase/client.ts#L69) returns null when [hasSupabaseConfig](src/services/config.ts#L19) is false.
- If config exists but no client instance has been set, it throws an error at [src/services/supabase/client.ts](src/services/supabase/client.ts#L79).
- Client instance can only be set via [initSupabase](src/services/supabase/client.ts#L82).

Critical runtime finding:
- No source usage of initSupabase was found outside docs.
- No runtime import of @supabase/supabase-js was found in source (only in docs).

Evidence:
- [src/main.tsx](src/main.tsx)
- [src/App.tsx](src/App.tsx)
- [src/services/README.md](src/services/README.md#L54)

## 2) All Supabase Queries / Calls Located

### Data queries (from table)

Opportunities service:
- getAll: from opportunities, select, filters (in/gte/lte/ilike), order
  - [src/services/supabase/opportunities.service.ts](src/services/supabase/opportunities.service.ts#L32)
- getById: from opportunities, select, eq(id), single
  - [src/services/supabase/opportunities.service.ts](src/services/supabase/opportunities.service.ts#L79)
- create: from opportunities, insert, select, single
  - [src/services/supabase/opportunities.service.ts](src/services/supabase/opportunities.service.ts#L105)
- update: from opportunities, update, eq(id), select, single
  - [src/services/supabase/opportunities.service.ts](src/services/supabase/opportunities.service.ts#L131)
- delete: from opportunities, delete, eq(id)
  - [src/services/supabase/opportunities.service.ts](src/services/supabase/opportunities.service.ts#L158)
- bulkUpdate: from opportunities, update, in(id)
  - [src/services/supabase/opportunities.service.ts](src/services/supabase/opportunities.service.ts#L183)

Portfolio service:
- getMetrics: from portfolio_metrics, select, single
  - [src/services/supabase/portfolio.service.ts](src/services/supabase/portfolio.service.ts#L17)
- getProperties: from portfolio_properties, select, order(acquisitionDate)
  - [src/services/supabase/portfolio.service.ts](src/services/supabase/portfolio.service.ts#L42)
- addProperty: from portfolio_properties, insert, select, single
  - [src/services/supabase/portfolio.service.ts](src/services/supabase/portfolio.service.ts#L67)
- updateProperty: from portfolio_properties, update, eq(id), select, single
  - [src/services/supabase/portfolio.service.ts](src/services/supabase/portfolio.service.ts#L93)
- removeProperty: from portfolio_properties, delete, eq(id)
  - [src/services/supabase/portfolio.service.ts](src/services/supabase/portfolio.service.ts#L120)

### Auth calls

- signUp
  - [src/services/supabase/auth.service.ts](src/services/supabase/auth.service.ts#L40)
- signIn
  - [src/services/supabase/auth.service.ts](src/services/supabase/auth.service.ts#L72)
- signOut
  - [src/services/supabase/auth.service.ts](src/services/supabase/auth.service.ts#L101)
- getUser
  - [src/services/supabase/auth.service.ts](src/services/supabase/auth.service.ts#L123)
- getSession
  - [src/services/supabase/auth.service.ts](src/services/supabase/auth.service.ts#L144)
- onAuthStateChange
  - [src/services/supabase/auth.service.ts](src/services/supabase/auth.service.ts#L164)

### Storage calls

Bucket: estate-mind-files
- upload
  - [src/services/supabase/storage.service.ts](src/services/supabase/storage.service.ts#L28)
- getPublicUrl (after upload)
  - [src/services/supabase/storage.service.ts](src/services/supabase/storage.service.ts#L36)
- download
  - [src/services/supabase/storage.service.ts](src/services/supabase/storage.service.ts#L66)
- remove
  - [src/services/supabase/storage.service.ts](src/services/supabase/storage.service.ts#L93)
- getPublicUrl (helper)
  - [src/services/supabase/storage.service.ts](src/services/supabase/storage.service.ts#L116)

No rpc or SQL function calls were found in source.

## 3) Tables Referenced by Code

Tables referenced in Supabase queries:
- opportunities
  - [src/services/supabase/opportunities.service.ts](src/services/supabase/opportunities.service.ts#L19)
- portfolio_metrics
  - [src/services/supabase/portfolio.service.ts](src/services/supabase/portfolio.service.ts#L17)
- portfolio_properties
  - [src/services/supabase/portfolio.service.ts](src/services/supabase/portfolio.service.ts#L6)

Storage bucket referenced:
- estate-mind-files
  - [src/services/supabase/storage.service.ts](src/services/supabase/storage.service.ts#L28)

## 4) Authentication Implemented?

Partially implemented in service layer only.

Implemented:
- Auth service methods exist for sign-up/sign-in/sign-out/session/user/subscription.
  - [src/services/supabase/auth.service.ts](src/services/supabase/auth.service.ts)

Not implemented in app flow:
- No auth UI pages/components using authService were found.
- No session guard or route protection was found in [src/App.tsx](src/App.tsx).

Conclusion:
- Authentication logic exists, but is not integrated into the active UI.

## 5) Storage Implemented?

Partially implemented in service layer only.

Implemented:
- Storage service methods exist (upload/download/delete/public URL).
  - [src/services/supabase/storage.service.ts](src/services/supabase/storage.service.ts)

Not implemented in app flow:
- No component usage of storageService was found.

Conclusion:
- Storage logic exists, but is not integrated into the active UI.

## 6) Does Current UI Use Real Supabase Data or Mock/Demo Data?

Current UI uses mock/demo/local data, not live Supabase data.

Evidence:
- Dashboard imports and renders mock datasets directly.
  - [src/components/Dashboard.tsx](src/components/Dashboard.tsx#L8)
- Opportunity Tracker state is backed by useKV with mockOpportunities seed.
  - [src/components/OpportunityTracker.tsx](src/components/OpportunityTracker.tsx#L74)
- Investment Pipeline state is backed by useKV with mockOpportunities seed.
  - [src/components/InvestmentPipeline.tsx](src/components/InvestmentPipeline.tsx#L30)
- Investment Report falls back to mockAnalyses.
  - [src/components/InvestmentReport.tsx](src/components/InvestmentReport.tsx#L17)
- Deal Analyzer triggers local mock analysis flow via app handler.
  - [src/App.tsx](src/App.tsx#L28)
  - [src/components/DealAnalyzer.tsx](src/components/DealAnalyzer.tsx#L58)
- Portfolio Analytics is hard-coded chart/metric data.
  - [src/components/PortfolioAnalytics.tsx](src/components/PortfolioAnalytics.tsx#L16)

Additional config mismatch impacting connectivity:
- App expects VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
  - [src/services/config.ts](src/services/config.ts#L3)
- .env.local defines NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY instead.
  - [.env.local](.env.local#L1)

This mismatch makes hasSupabaseConfig false in normal Vite runtime, forcing mock mode path.

## 7) Overall Status

Supabase readiness: Service layer present, runtime integration incomplete.

Current operational status:
- Client initialization: not active in runtime.
- Queries: defined in services, not actively driving UI.
- Auth: implemented in service layer, not wired to UI.
- Storage: implemented in service layer, not wired to UI.
- UI data source: mock/demo/local.

## Risk Note (Observed During Audit)

Sensitive keys are present in [.env.local](.env.local). This is a security risk if this file is ever exposed or committed.
- Service role and provider keys should remain server-side only.
- Rotate exposed secrets if they have been shared beyond local machine context.
