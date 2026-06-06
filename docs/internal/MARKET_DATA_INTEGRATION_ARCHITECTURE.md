# Market Data Integration Architecture

## Objective
Move EstateMind from deterministic-only estimate generation to a provider-based market data architecture that can ingest external feeds and gracefully fallback when unavailable.

## New Module
- `src/services/marketData/types.ts`
  - `PropertyPriceProvider`
  - `RentalProvider`
  - `AirbnbProvider`
  - shared context and result contracts
- `src/services/marketData/providers/mockPropertyPrice.provider.ts`
- `src/services/marketData/providers/mockRental.provider.ts`
- `src/services/marketData/providers/mockAirbnb.provider.ts`
- `src/services/marketData/factory.ts`
  - provider mode resolution from configuration
  - provider factory and market data collection orchestration
- `src/services/marketData/index.ts`

## Provider Selection
Provider mode is configuration-driven:
- `VITE_MARKET_DATA_PROVIDER=mock` (default)
- `VITE_MARKET_DATA_PROVIDER=disabled`

The resolver also reads `MARKET_DATA_PROVIDER` for server contexts.

## Analysis Flow Changes
`api/deal-analysis.ts` now:
1. Validates incoming property payload.
2. Resolves market data bundle through provider factory.
3. Injects market data JSON into AI prompt context.
4. Normalizes AI output with fallback precedence:
   - AI explicit metric values
   - provider-supplied market data
   - deterministic estimates
5. Adds market-data disclosures in assumptions and facts when available.

## Fallback Strategy
If provider data is unavailable or disabled:
- deterministic model remains the final fallback.
- analysis remains complete and stable.
- fallback disclosure is included when deterministic estimates are applied.

## Extensibility
To add live providers:
1. Implement interfaces in `src/services/marketData/types.ts`.
2. Add provider classes under `src/services/marketData/providers/`.
3. Register new provider mode/selection logic in `src/services/marketData/factory.ts`.
4. Set provider mode via environment variables.

No API contract break is required for the frontend consumer.
