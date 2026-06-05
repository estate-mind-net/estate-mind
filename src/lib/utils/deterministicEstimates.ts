import type { PropertyCondition } from '../types'

export interface DeterministicEstimateInput {
  askingPrice: number
  sizeSqm: number
  city: string
  country: string
  bedrooms: number
  condition: PropertyCondition | string
  currency: string
  expectedRent?: number
}

export interface DeterministicEstimates {
  rentalMonthly: number
  rentalAnnual: number
  rentalYieldPct: number
  airbnbDailyRate: number
  airbnbOccupancyPct: number
  airbnbMonthlyRevenue: number
  airbnbAnnualRevenue: number
  airbnbYieldPct: number
  renovationEstimatedCost: number
  renovationValueIncrease: number
  renovationRoiPct: number
  appreciationOneYearPct: number
  appreciationThreeYearPct: number
  appreciationFiveYearPct: number
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const round1 = (value: number) => Number(value.toFixed(1))

const stableHash = (value: string): number => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }

  return hash
}

const conditionIncomeFactor = (condition: string) => {
  switch (condition) {
    case 'new':
      return 1.08
    case 'excellent':
      return 1.04
    case 'good':
      return 1
    case 'needs-renovation':
      return 0.82
    case 'under-construction':
      return 0.76
    default:
      return 1
  }
}

const renovationCostFactor = (condition: string) => {
  switch (condition) {
    case 'new':
      return 0.015
    case 'excellent':
      return 0.02
    case 'good':
      return 0.04
    case 'needs-renovation':
      return 0.11
    case 'under-construction':
      return 0.08
    default:
      return 0.05
  }
}

const renovationValueMultiplier = (condition: string) => {
  switch (condition) {
    case 'new':
      return 0.7
    case 'excellent':
      return 0.9
    case 'good':
      return 1.18
    case 'needs-renovation':
      return 1.45
    case 'under-construction':
      return 1.24
    default:
      return 1.05
  }
}

const countryYieldFactor = (country: string) => {
  const key = country.trim().toLowerCase()
  const table: Record<string, number> = {
    portugal: 1.02,
    spain: 1,
    greece: 0.95,
    italy: 0.96,
    france: 0.92,
    germany: 0.89,
    uk: 0.9,
    'united kingdom': 0.9,
    usa: 0.93,
    'united states': 0.93,
  }

  return table[key] ?? 0.98
}

const currencyRentPressure = (currency: string) => {
  const code = currency.trim().toUpperCase()
  const table: Record<string, number> = {
    EUR: 1,
    USD: 1,
    GBP: 0.95,
    CHF: 0.92,
    AED: 1.02,
  }

  return table[code] ?? 1
}

export const deriveDeterministicEstimates = (input: DeterministicEstimateInput): DeterministicEstimates => {
  const askingPrice = Math.max(1, Number(input.askingPrice) || 1)
  const sizeSqm = Math.max(15, Number(input.sizeSqm) || 15)
  const bedrooms = clamp(Math.round(Number(input.bedrooms) || 0), 0, 10)
  const condition = String(input.condition || 'good')
  const expectedRent = Number.isFinite(Number(input.expectedRent)) ? Number(input.expectedRent) : null

  const cityCountryHash = stableHash(`${input.city.trim().toLowerCase()}|${input.country.trim().toLowerCase()}`)
  const cityFactor = 0.9 + (cityCountryHash % 31) / 100 // 0.90 - 1.20
  const tourismFactor = 0.9 + ((cityCountryHash >> 5) % 26) / 100 // 0.90 - 1.15

  const conditionFactor = conditionIncomeFactor(condition)
  const countryFactor = countryYieldFactor(input.country)
  const bedroomFactor = clamp(0.9 + Math.min(bedrooms, 5) * 0.04, 0.9, 1.1)
  const sizeFactor = clamp(1.08 - Math.abs(sizeSqm - 75) / 500, 0.88, 1.08)
  const pricePerSqm = askingPrice / sizeSqm
  const pricePressure = clamp(3600 / Math.max(pricePerSqm, 1), 0.72, 1.22)
  const currencyFactor = currencyRentPressure(input.currency)

  const modeledRentalYield = clamp(
    5.1 * cityFactor * countryFactor * conditionFactor * bedroomFactor * sizeFactor * pricePressure * currencyFactor,
    2.6,
    9.8,
  )

  const rentalMonthlyBase = (askingPrice * modeledRentalYield) / 100 / 12
  const rentalMonthly = expectedRent && expectedRent > 0 ? expectedRent : rentalMonthlyBase
  const rentalAnnual = rentalMonthly * 12
  const rentalYieldPct = (rentalAnnual / askingPrice) * 100

  const adrMultiplier = clamp(1.85 * tourismFactor * conditionFactor, 1.25, 2.4)
  const airbnbDailyRate = Math.max(25, rentalMonthly / 30 * adrMultiplier)
  const occupancyBase = 54 + ((cityCountryHash >> 9) % 18) + (conditionFactor - 1) * 18
  const airbnbOccupancyPct = clamp(Math.round(occupancyBase), 42, 83)
  const airbnbMonthlyRevenue = airbnbDailyRate * 30 * (airbnbOccupancyPct / 100)
  const airbnbAnnualRevenue = airbnbMonthlyRevenue * 12
  const airbnbYieldPct = (airbnbAnnualRevenue / askingPrice) * 100

  const renoCostPct = renovationCostFactor(condition)
  const renovationEstimatedCost = askingPrice * renoCostPct
  const renovationValueIncrease = renovationEstimatedCost * renovationValueMultiplier(condition) * clamp(cityFactor, 0.9, 1.15)
  const renovationRoiPct = ((renovationValueIncrease - renovationEstimatedCost) / Math.max(renovationEstimatedCost, 1)) * 100

  const appreciationOneYearPct = clamp(2.1 + (cityFactor - 1) * 6 + (countryFactor - 1) * 4, 0.5, 8.5)
  const appreciationThreeYearPct = appreciationOneYearPct * 3.1
  const appreciationFiveYearPct = appreciationOneYearPct * 5.3

  return {
    rentalMonthly: Math.round(rentalMonthly),
    rentalAnnual: Math.round(rentalAnnual),
    rentalYieldPct: round1(rentalYieldPct),
    airbnbDailyRate: Math.round(airbnbDailyRate),
    airbnbOccupancyPct,
    airbnbMonthlyRevenue: Math.round(airbnbMonthlyRevenue),
    airbnbAnnualRevenue: Math.round(airbnbAnnualRevenue),
    airbnbYieldPct: round1(airbnbYieldPct),
    renovationEstimatedCost: Math.round(renovationEstimatedCost),
    renovationValueIncrease: Math.round(renovationValueIncrease),
    renovationRoiPct: round1(renovationRoiPct === 0 ? 0.1 : renovationRoiPct),
    appreciationOneYearPct: round1(appreciationOneYearPct),
    appreciationThreeYearPct: round1(appreciationThreeYearPct),
    appreciationFiveYearPct: round1(appreciationFiveYearPct),
  }
}
