import type { InvestmentScore, Property } from '../types'

export function calculateRentalYield(annualRent: number, purchasePrice: number): number {
  return (annualRent / purchasePrice) * 100
}

export function calculateAirbnbYield(
  dailyRate: number,
  occupancy: number,
  purchasePrice: number
): number {
  const monthlyRevenue = (dailyRate * 30 * occupancy) / 100
  const annualRevenue = monthlyRevenue * 12
  return (annualRevenue / purchasePrice) * 100
}

export function calculateROI(investment: number, returns: number): number {
  return ((returns - investment) / investment) * 100
}

export function calculateOverallScore(scores: Omit<InvestmentScore, 'overall'>): number {
  const {
    rentalYield,
    airbnbPotential,
    appreciation,
    renovation,
    legal,
    liquidity,
  } = scores

  const weights = {
    rentalYield: 0.20,
    airbnbPotential: 0.20,
    appreciation: 0.15,
    renovation: 0.15,
    legal: 0.15,
    liquidity: 0.15,
  }

  return Math.round(
    rentalYield * weights.rentalYield +
      airbnbPotential * weights.airbnbPotential +
      appreciation * weights.appreciation +
      renovation * weights.renovation +
      legal * weights.legal +
      liquidity * weights.liquidity
  )
}

export function calculatePricePerSqm(property: Property): number {
  return property.askingPrice / property.sizeSqm
}

export function calculateMonthlyMortgage(
  principal: number,
  annualRate: number,
  years: number
): number {
  const monthlyRate = annualRate / 100 / 12
  const numberOfPayments = years * 12

  if (monthlyRate === 0) return principal / numberOfPayments

  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1)
  )
}

export function calculateNetCashFlow(
  monthlyRent: number,
  monthlyMortgage: number,
  monthlyExpenses: number
): number {
  return monthlyRent - monthlyMortgage - monthlyExpenses
}

export function calculateCapRate(noi: number, propertyValue: number): number {
  return (noi / propertyValue) * 100
}

export function estimateClosingCosts(purchasePrice: number, country: string = 'EUR'): number {
  const rates: Record<string, number> = {
    Portugal: 0.065,
    Spain: 0.10,
    Italy: 0.08,
    France: 0.05,
    default: 0.075,
  }

  const rate = rates[country] || rates.default
  return purchasePrice * rate
}
