import { deriveDeterministicEstimates } from '@/lib/utils/deterministicEstimates'
import type { AirbnbPoint, AirbnbProvider, MarketDataPropertyContext } from '../types'

export class MockAirbnbProvider implements AirbnbProvider {
  readonly name = 'mock-airbnb'

  async getAirbnbData(context: MarketDataPropertyContext): Promise<AirbnbPoint> {
    const estimates = deriveDeterministicEstimates({
      askingPrice: context.askingPrice,
      sizeSqm: context.sizeSqm,
      city: context.city,
      country: context.country,
      bedrooms: context.bedrooms,
      condition: context.condition,
      currency: context.currency,
      expectedRent: context.expectedRent,
    })

    return {
      dailyRate: estimates.airbnbDailyRate,
      occupancyPct: estimates.airbnbOccupancyPct,
      monthlyRevenue: estimates.airbnbMonthlyRevenue,
      annualRevenue: estimates.airbnbAnnualRevenue,
      yieldPct: estimates.airbnbYieldPct,
      confidence: 'low',
      source: this.name,
      asOf: new Date().toISOString(),
    }
  }
}
