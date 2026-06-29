/**
 * rentModuleConfig.ts
 *
 * Configuration for the Rent Intelligence module.
 * Defines scoring weights, recommendation thresholds, required fields,
 * and labels used by the Rent scorer and UI.
 *
 * Scoring dimensions and weights are functionally equivalent to the
 * original rentScoring.ts — preserving current behavior.
 */

import type { OpportunityModuleConfig } from '../types'

export const rentModuleConfig: OpportunityModuleConfig = {
  moduleType: 'rent',
  label: 'Rent Intelligence',

  requiredFields: ['title', 'city', 'district', 'price', 'sizeM2', 'bedrooms'],
  recommendedFields: ['floor', 'furnished', 'parking', 'balcony', 'petsAllowed', 'sourceUrl'],
  optionalFields: ['address', 'elevator', 'notes', 'contactName', 'contactPhone'],

  scoringWeights: {
    budgetFit: 0.30,
    sizeFit: 0.20,
    districtMatch: 0.15,
    furnishedMatch: 0.12,
    parkingMatch: 0.10,
    balconyMatch: 0.08,
    petsMatch: 0.05,
  },

  recommendationThresholds: {
    excellent: 85,
    good: 70,
    possible: 50,
    weak: 30,
  },

  dimensionLabels: {
    budgetFit: 'Budget Fit',
    sizeFit: 'Size Fit',
    districtMatch: 'District Match',
    furnishedMatch: 'Furnished',
    parkingMatch: 'Parking',
    balconyMatch: 'Balcony',
    petsMatch: 'Pets Allowed',
  },

  fieldLabels: {
    title: 'Title',
    city: 'City',
    district: 'District',
    price: 'Monthly Rent',
    currency: 'Currency',
    sizeM2: 'Size (m²)',
    bedrooms: 'Bedrooms',
    floor: 'Floor',
    furnished: 'Furnished',
    parking: 'Parking',
    balcony: 'Balcony',
    elevator: 'Elevator',
    petsAllowed: 'Pets Allowed',
    sourceUrl: 'Listing URL',
    address: 'Address',
    notes: 'Notes',
  },
}

/**
 * Rent-specific preference shape used by the scorer.
 * Mirrors the original RentPreferences interface.
 */
export interface RentModulePreferences {
  maxBudget: number
  preferredDistrict: string
  minimumSize: number
  furnishedRequired: boolean
  parkingRequired: boolean
  balconyPreferred: boolean
  petsRequired: boolean
}

export const DEFAULT_RENT_MODULE_PREFERENCES: RentModulePreferences = {
  maxBudget: 800,
  preferredDistrict: '',
  minimumSize: 40,
  furnishedRequired: false,
  parkingRequired: false,
  balconyPreferred: false,
  petsRequired: false,
}

/**
 * Convert the UI-facing RentPreferences (which includes remoteWorkImportant, quietAreaImportant)
 * to the engine-facing RentModulePreferences (which only has scoring-relevant fields).
 */
export function toRentModulePreferences(p: {
  maxBudget: number
  preferredDistrict: string
  minimumSize: number
  furnishedRequired: boolean
  parkingRequired: boolean
  balconyPreferred: boolean
  petsRequired: boolean
}): RentModulePreferences {
  return {
    maxBudget: p.maxBudget,
    preferredDistrict: p.preferredDistrict,
    minimumSize: p.minimumSize,
    furnishedRequired: p.furnishedRequired,
    parkingRequired: p.parkingRequired,
    balconyPreferred: p.balconyPreferred,
    petsRequired: p.petsRequired,
  }
}
