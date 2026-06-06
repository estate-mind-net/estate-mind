import { deriveDeterministicEstimates } from '@/lib/utils/deterministicEstimates'
import type { MarketDataPropertyContext, RentalPoint, RentalProvider } from '../types'

export class MockRentalProvider implements RentalProvider {
  readonly name = 'mock-rental'

  async getRentalData(context: MarketDataPropertyContext): Promise<RentalPoint> {
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
      monthlyRent: estimates.rentalMonthly,
      annualRent: estimates.rentalAnnual,
      yieldPct: estimates.rentalYieldPct,
      confidence: 'low',
      source: this.name,
      asOf: new Date().toISOString(),
    }
  }
}
