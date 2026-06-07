import { MockAirbnbProvider } from './providers/mockAirbnb.provider'
import { MockPropertyPriceProvider } from './providers/mockPropertyPrice.provider'
import { MockRentalProvider } from './providers/mockRental.provider'
import type {
  AirbnbProvider,
  MarketDataBundle,
  MarketDataPropertyContext,
  PropertyPriceProvider,
  RentalProvider,
} from './types'

export type MarketDataProviderMode = 'mock' | 'disabled'

interface MarketDataProviders {
  mode: MarketDataProviderMode
  propertyPriceProvider: PropertyPriceProvider | null
  rentalProvider: RentalProvider | null
  airbnbProvider: AirbnbProvider | null
}

const readEnv = (key: string): string => {
  const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  const runtimeEnv = (globalThis as { __ENV__?: Record<string, string | undefined> }).__ENV__
  return String(processEnv?.[key] ?? runtimeEnv?.[key] ?? '').trim()
}

const resolveProviderMode = (): MarketDataProviderMode => {
  const configured = readEnv('VITE_MARKET_DATA_PROVIDER') || readEnv('MARKET_DATA_PROVIDER')
  if (configured === 'disabled') return 'disabled'
  return 'mock'
}

export const getMarketDataProvidersFromConfig = (): MarketDataProviders => {
  const mode = resolveProviderMode()

  if (mode === 'disabled') {
    return {
      mode,
      propertyPriceProvider: null,
      rentalProvider: null,
      airbnbProvider: null,
    }
  }

  return {
    mode,
    propertyPriceProvider: new MockPropertyPriceProvider(),
    rentalProvider: new MockRentalProvider(),
    airbnbProvider: new MockAirbnbProvider(),
  }
}

export const collectMarketData = async (
  context: MarketDataPropertyContext,
  providers = getMarketDataProvidersFromConfig(),
): Promise<MarketDataBundle> => {
  const [propertyPrice, rental, airbnb] = await Promise.all([
    providers.propertyPriceProvider?.getPropertyPrice(context) ?? Promise.resolve(null),
    providers.rentalProvider?.getRentalData(context) ?? Promise.resolve(null),
    providers.airbnbProvider?.getAirbnbData(context) ?? Promise.resolve(null),
  ])

  return {
    providerMode: providers.mode,
    propertyPrice,
    rental,
    airbnb,
  }
}
