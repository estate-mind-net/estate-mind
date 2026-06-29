/**
 * engineTests.ts
 *
 * Self-contained test runner for the Opportunity Intelligence Engine.
 * No external test framework required -- run with:
 *   npx tsx src/modules/opportunity-intelligence/tests/engineTests.ts
 */

declare const process: { exit(code: number): never }

import { normalizeRentListing, type RentListingInput } from '../normalizers/rentNormalizer'
import { scoreRentOpportunity } from '../scoring/rentScorer'
import type { RentModulePreferences } from '../configs/rentModuleConfig'
import { normalizeOpportunity } from '../services/normalizationService'
import { scoreOpportunity } from '../services/scoringService'
import type { RecommendationLevel } from '../types'

const FULL_LISTING: RentListingInput = {
  id: 'test-1', title: 'Modern 2BR near Liman Park', city: 'Novi Sad', district: 'Liman 2',
  monthlyRent: 650, currency: 'EUR', sizeM2: 55, bedrooms: 2,
  furnished: true, parking: true, balcony: true, elevator: true, petsAllowed: false,
  floor: 3, listingUrl: 'https://example.com/listing/1', notes: 'Bright apartment.',
}

const MINIMAL_LISTING: RentListingInput = {
  id: 'test-2', title: 'Cheap Studio', city: 'Novi Sad', district: '',
  monthlyRent: 0, currency: 'EUR', sizeM2: 0, bedrooms: 0,
  furnished: false, parking: false, balcony: false, elevator: false, petsAllowed: false,
}

const PERFECT_PREFS: RentModulePreferences = {
  maxBudget: 800, preferredDistrict: 'Liman 2', minimumSize: 40,
  furnishedRequired: true, parkingRequired: true, balconyPreferred: true, petsRequired: false,
}

interface TestResult { name: string; passed: boolean; message: string }

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`ASSERT: ${message}`)
}

function runTest(name: string, fn: () => void): TestResult {
  try { fn(); return { name, passed: true, message: 'OK' } }
  catch (e) { return { name, passed: false, message: e instanceof Error ? e.message : String(e) } }
}

// Test 1: Normalizer
function test1(): void {
  const r = normalizeRentListing(FULL_LISTING)
  assert(r.id === 'test-1', 'id')
  assert(r.moduleType === 'rent', 'moduleType')
  assert(r.price === 650, 'price')
  assert(r.confidenceScore === 100, `confidence should be 100, got ${r.confidenceScore}`)
  assert(r.evidence.length >= 10, 'evidence count')
  assert(r.missingData.length === 0, 'no missing data for full listing')
}

// Test 2: Scorer determinism
function test2(): void {
  const n = normalizeRentListing(FULL_LISTING)
  const s1 = scoreRentOpportunity(n, PERFECT_PREFS)
  const s2 = scoreRentOpportunity(n, PERFECT_PREFS)
  assert(s1.totalScore === s2.totalScore, 'deterministic score')
  assert(s1.recommendation === s2.recommendation, 'deterministic rec')
  assert(s1.totalScore >= 85, `perfect match >= 85, got ${s1.totalScore}`)
  assert(s1.recommendation === 'Excellent Fit', `rec: ${s1.recommendation}`)
}

// Test 3: Missing fields reduce confidence
function test3(): void {
  const full = normalizeRentListing(FULL_LISTING)
  const min = normalizeRentListing(MINIMAL_LISTING)
  assert(full.confidenceScore > min.confidenceScore, 'confidence difference')
  assert(min.missingData.length > 0, 'has missing data')
  assert(min.confidenceScore < 80, `minimal confidence < 80, got ${min.confidenceScore}`)
  const fields = min.missingData.map(m => m.field)
  assert(fields.includes('district'), 'missing district')
  assert(fields.includes('price'), 'missing price')
}

// Test 4: Unsupported module returns clean error
function test4(): void {
  const n = normalizeOpportunity({ moduleType: 'invest', rawData: { id: 'x' } })
  assert(n === null, 'unsupported returns null')
  const s = scoreOpportunity({ moduleType: 'invest', opportunity: {} as never, preferences: {} })
  assert(s.success === false, 'scoring fails')
  assert(s.error?.includes('invest') ?? false, 'error mentions module')
}

// Test 5: Recommendation thresholds
function test5(): void {
  const bad: RentModulePreferences = {
    maxBudget: 200, preferredDistrict: 'Nonexistent', minimumSize: 100,
    furnishedRequired: true, parkingRequired: true, balconyPreferred: true, petsRequired: true,
  }
  const n = normalizeRentListing(FULL_LISTING)
  const s = scoreRentOpportunity(n, bad)
  assert(s.totalScore < 50, `bad match < 50, got ${s.totalScore}`)
  assert(s.recommendation === 'Reject' || s.recommendation === 'Weak Fit', `rec: ${s.recommendation}`)
  const levels: RecommendationLevel[] = ['Excellent Fit', 'Good Fit', 'Possible Fit', 'Weak Fit', 'Reject']
  assert(levels.length === 5, '5 levels')
}

const tests = [
  runTest('1. rentNormalizer converts listing correctly', test1),
  runTest('2. rentScorer returns deterministic totalScore', test2),
  runTest('3. Missing fields reduce confidence', test3),
  runTest('4. Unsupported module returns clean error', test4),
  runTest('5. Recommendation thresholds work', test5),
]

console.log('\n=== Opportunity Intelligence Engine Tests ===\n')
let passed = 0, failed = 0
for (const t of tests) {
  const icon = t.passed ? 'PASS' : 'FAIL'
  console.log(`  [${icon}] ${t.name}`)
  if (!t.passed) { console.log(`         ${t.message}`); failed++ } else { passed++ }
}
console.log(`\n  Results: ${passed} passed, ${failed} failed, ${tests.length} total\n`)
if (failed > 0) process.exit(1)