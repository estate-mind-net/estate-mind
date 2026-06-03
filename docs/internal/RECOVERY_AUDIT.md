# EstateMind Technical Recovery Audit

Date: 2026-06-02  
Repository: estatemind

## 1. Current folder structure

High-level structure observed:

- `src/`
- `src/components/` (11 feature components)
- `src/components/ui/` (45 shadcn/Radix-style UI primitives)
- `src/hooks/`
- `src/lib/`
- `src/lib/constants/`
- `src/lib/types/`
- `src/lib/utils/`
- `src/services/`
- `src/services/ai/`
- `src/services/supabase/`
- `src/styles/`
- Root docs/config: `README.md`, `PRD.md`, `MIGRATION_NOTES.md`, `PRODUCTION-READY.md`, `SECURITY.md`, `runtime.config.json`, `vite.config.ts`, `tsconfig.json`, etc.

Notable repo state details:

- `dist/` exists in workspace (previous build artifacts present).
- `node_modules/` exists in workspace.
- `package-lock.json` exists (npm lockfile).

## 2. Framework and package manager

### Framework/runtime stack

- Frontend framework: React 19 + TypeScript
- Bundler/dev server: Vite 7
- Styling: Tailwind CSS v4
- UI primitives: Radix UI + shadcn-style component set
- Motion/charts/forms: Framer Motion, Recharts, React Hook Form, Zod
- Spark runtime dependencies:
  - `@github/spark` imported in app bootstrapping
  - Spark Vite plugin enabled
  - `@github/spark/hooks` used for `useKV`

### Package manager

- Active package manager: npm (confirmed by `package-lock.json`)
- Scripts are npm-oriented (`npm run dev`, `npm run build`, etc.)

## 3. Existing routes/pages

No React Router setup is present. Navigation is implemented as in-memory state switching in `src/App.tsx` via:

- `type Page = 'landing' | 'dashboard' | 'analyzer' | 'report' | 'opportunities' | 'pricing' | 'analytics' | 'pipeline'`
- `const [currentPage, setCurrentPage] = useState<Page>('landing')`

Current views/pages:

- Landing page (`LandingPage`)
- Pricing page (`PricingPage`)
- Dashboard (`Dashboard`)
- Deal analyzer (`DealAnalyzer`)
- Investment report (`InvestmentReport`)
- Opportunity tracker (`OpportunityTracker`)
- Investment pipeline (`InvestmentPipeline`)
- Portfolio analytics (`PortfolioAnalytics`)

Implication:

- Deep linking, browser history, and URL-based routing are not implemented.

## 4. Existing components

### Feature components (`src/components/`)

- `AIInsightCard.tsx`
- `Dashboard.tsx`
- `DealAnalyzer.tsx`
- `InvestmentPipeline.tsx`
- `InvestmentReport.tsx`
- `LandingPage.tsx`
- `MetricCard.tsx`
- `OpportunityTracker.tsx`
- `PortfolioAnalytics.tsx`
- `PricingPage.tsx`
- `ScoreGauge.tsx`

### UI components (`src/components/ui/`)

45 reusable UI primitives are present (`button`, `card`, `tabs`, `dialog`, `table`, etc.), indicating a robust component foundation.

## 5. Current data handling approach

Data handling is hybrid and currently mock-first:

- UI state management: React hooks (`useState`, `useMemo`).
- Persistent local state (browser-level): Spark `useKV` in:
  - `OpportunityTracker.tsx` (`opportunities`, `archived-opportunities`)
  - `InvestmentPipeline.tsx` (`opportunities`)
- Analysis generation: local mock engine (`generateMockAnalysis`) in `src/lib/analyzerEngine.ts`.
- Service layer exists (`src/services/**`) but is largely not wired into page components.

Observed usage pattern in UI:

- Most pages directly import mock data or use inline static arrays.
- Service modules are present as architecture scaffolding, not the primary runtime data path.

## 6. Current mock/demo data

### Central mock data (`src/lib/mockData.ts`)

Defined exports:

- `mockProperties` (4 properties)
- `mockAnalyses` (2 analyses)
- `mockOpportunities` (4 opportunities)
- `mockDashboardMetrics`
- `mockAIInsights`

### Additional demo/static data outside central mock file

- `PortfolioAnalytics.tsx` contains large inline demo datasets (`performanceData`, `cashFlowData`, composition/yield arrays).
- `DealAnalyzer.tsx` uses `setTimeout` to simulate analysis delay before showing report.
- `analyzerEngine.ts` generates randomized analysis values (non-deterministic mock behavior).

## 7. Current Supabase integration status

Supabase integration is partial/scaffolded, not production-active:

What exists:

- Config gates in `src/services/config.ts` (`hasSupabaseConfig`).
- Supabase-like client abstraction in `src/services/supabase/client.ts`.
- Service classes for auth/opportunities/portfolio/storage.
- Mock fallback behavior when Supabase config/client is unavailable.

What is missing/incomplete:

- `@supabase/supabase-js` is not installed in dependencies.
- No concrete client initialization in app bootstrap (`initSupabase` is not called in app startup).
- Service typing/query interfaces are incomplete vs actual chaining used in services (seen in strict TS errors).
- Some service code references non-existent domain types/data (`PortfolioProperty`, `mockPortfolioData`).

Practical status:

- App currently runs without Supabase; data is mock/local.

## 8. Current AI integration status

AI integration is also scaffolded and environment-dependent:

What exists:

- `src/services/ai/analysis.service.ts`
- `src/services/ai/document.service.ts`
- Env gate `hasAIConfig()` with fallback to mock behavior.

Current behavior:

- If AI env key is absent, service returns mocks/fallbacks.
- UI currently primarily uses local mock analysis flow (`generateMockAnalysis`) from `App.tsx` rather than service-driven AI.

Key compatibility risk:

- AI services reference global `spark` APIs (`spark.llm`, `spark.llmPrompt`) that fail strict TypeScript checks and are Spark-runtime-specific.
- No direct OpenAI/Anthropic SDK integration is implemented.

## 9. Build/runtime issues

### Build status (as configured)

Command run: `npm run build`  
Result: succeeds.

However, build script uses:

- `tsc -b --noCheck && vite build`

So type errors are explicitly bypassed.

### Strict type-check status

Command run: `npx tsc -b`  
Result: fails with 31 TypeScript errors.

High-impact error groups:

1. Spark globals unresolved in services
- Multiple `Cannot find name 'spark'` in AI services.

2. Type/model mismatches
- `Property` fields mismatched in AI prompt builder (`type`, `price`, `size` used; model defines `propertyType`, `askingPrice`, `sizeSqm`).
- `Opportunity` and `InvestmentAnalysis` property mismatches in Supabase services (`opp.title`, `analysis.investmentScore` vs actual schema).

3. Missing exports/types/data
- `PortfolioProperty` not exported from `@/lib/types`.
- `mockPortfolioData` not exported from `@/lib/mockData`.

4. Query abstraction/interface mismatch
- `.select()` chained on types that do not expose it in declared interfaces.

5. Nullability errors
- Multiple TS18047 (`data` possibly null) in auth/storage services.

### Build output warnings

From `vite build`:

- CSS optimization warnings tied to media query token parsing.
- Large chunk warnings (bundle includes ~1MB JS + ~1.5MB proxy asset), indicating optimization/code-splitting need.

### Runtime architecture risks

- State-based pseudo-routing means no URL persistence/deep links.
- Spark coupling (`useKV`, Spark plugin, `spark` global usage) may break in non-Spark execution contexts unless fully replaced.

## 10. Recommended next safe steps

Ordered for low risk and fast recovery signal:

1. Freeze and baseline
- Keep current app behavior unchanged.
- Add a dedicated `npm run typecheck` script (`tsc -b`) without replacing existing build yet.

2. Eliminate hidden build risk
- Update CI (or local checklist) to run both `npm run build` and `npm run typecheck`.
- Treat typecheck failure as blocker before feature work.

3. Resolve type model drift first (safe, internal)
- Align service code with canonical `src/lib/types/**` contracts.
- Remove/replace references to non-existent fields and types.
- Fix nullability checks in auth/storage flows.

4. Decide Spark dependency strategy explicitly
- Path A: stay on Spark runtime for now and add proper type declarations for `spark`.
- Path B: migrate off Spark APIs (`useKV`, `spark.llm`) to standard alternatives (local storage hook + API SDK).
- Do this decision before wiring more features.

5. Wire service layer incrementally behind existing UI
- Keep existing pages and UX intact.
- Start with read-only integration (dashboard/opportunities fetch) and retain fallback toggles.
- Introduce feature flags per service area.

6. Supabase hardening (if selected)
- Install and initialize `@supabase/supabase-js` in app bootstrap.
- Add explicit mapping layer between DB rows and domain types.
- Validate table schemas match existing domain types.

7. AI integration hardening
- Replace direct global `spark` calls with adapter pattern.
- Implement provider-specific client module with strict response parsing/validation.
- Keep mock fallback for non-configured environments.

8. Routing safety upgrade
- Plan migration from page-state navigation to React Router (or equivalent) with parity routes.
- Preserve current navigation behavior while adding URL mapping.

9. Performance hygiene
- Add lazy loading for heavyweight pages/charts.
- Split bundles and re-check chunk warnings.

10. Recovery checklist artifact
- After steps 1-3, produce a short “type-safe baseline” report (errors = 0, build = pass, runtime smoke test = pass) before new feature development.

---

## Quick status summary

- App is functional in mock/demo mode.
- Production-readiness is blocked by hidden type failures and incomplete service wiring.
- Safest immediate recovery move: enforce strict typecheck and align service/domain contracts before integration expansion.
