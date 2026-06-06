import type { MarketDataPropertyContext, PropertyPricePoint, PropertyPriceProvider } from '../types'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const stableHash = (value: string): number => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }

  return hash
}

export class MockPropertyPriceProvider implements PropertyPriceProvider {
  readonly name = 'mock-property-price'

  async getPropertyPrice(context: MarketDataPropertyContext): Promise<PropertyPricePoint> {
    const pricePerSqmInput = Math.max(1, context.askingPrice) / Math.max(20, context.sizeSqm)
    const hash = stableHash(`${context.country}|${context.city}|${context.district}|${context.propertyType}`.toLowerCase())
    const swing = ((hash % 17) - 8) / 100
    const conditionBoost = context.condition === 'new' || context.condition === 'excellent' ? 0.03 : 0
    const multiplier = clamp(1 + swing + conditionBoost, 0.9, 1.14)

    const estimatedValue = Math.round(context.askingPrice * multiplier)
    const pricePerSqm = Math.round((estimatedValue / Math.max(20, context.sizeSqm)) * 100) / 100

    return {
      estimatedValue,
      pricePerSqm: pricePerSqm > 0 ? pricePerSqm : Math.round(pricePerSqmInput * 100) / 100,
      confidence: 'low',
      source: this.name,
      asOf: new Date().toISOString(),
    }
  }
}
