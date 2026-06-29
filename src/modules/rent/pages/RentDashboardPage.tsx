import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Compass, Plus, List, SquaresFour } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RentOpportunityCard } from '../components/RentOpportunityCard'
import { RentOpportunityTable } from '../components/RentOpportunityTable'
import { RentPreferencesPanel } from '../components/RentPreferencesPanel'
import { normalizeRentListing } from '@/modules/opportunity-intelligence/normalizers/rentNormalizer'
import { scoreRentOpportunity } from '@/modules/opportunity-intelligence/scoring/rentScorer'
import { toRentModulePreferences } from '@/modules/opportunity-intelligence/configs/rentModuleConfig'
import { opportunityRepository } from '../repositories/OpportunityRepository'
import type { RentPreferences, RentalStatus, RentalApartment, RentRecommendation } from '../types'
import { DEFAULT_RENT_PREFERENCES, RENTAL_STATUS_LABELS } from '../types'
import { useAuth } from '@/hooks/useAuth'

export function RentDashboardPage() {
  const navigate = useNavigate()
  const { user, organization } = useAuth()
  type SortKey = 'score' | 'rent-asc' | 'rent-desc' | 'size' | 'rent-per-m2' | 'favorites'

  const [preferences, setPreferences] = useState<RentPreferences>(DEFAULT_RENT_PREFERENCES)
  const [statusFilter, setStatusFilter] = useState<RentalStatus | 'all'>('all')
  const [recFilter, setRecFilter] = useState<RentRecommendation | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortKey>('score')
  const [userApartments, setUserApartments] = useState<RentalApartment[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'cards' | 'list'>(() => {
    const stored = localStorage.getItem('rent:viewMode')
    return stored === 'list' ? 'list' : 'cards'
  })

  // Load opportunities from Supabase
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      if (!organization?.id || !user?.id) { if (!cancelled) { setUserApartments([]); setLoading(false) }; return }
      try {
        const result = await opportunityRepository.list({ organizationId: organization.id, userId: user.id })
        if (!cancelled) setUserApartments(result.data ?? [])
      } catch {
        if (!cancelled) setUserApartments([])
      }
      if (!cancelled) setLoading(false)
    }

    load()

    return () => { cancelled = true }
  }, [organization?.id, user?.id])

  const allApartments = useMemo(() => {
    return userApartments
  }, [userApartments])

  const scoredApartments = useMemo(() => {
    return allApartments.map((apartment) => {
      const normalized = normalizeRentListing(apartment)
      const result = scoreRentOpportunity(normalized, toRentModulePreferences(preferences))
      return {
        ...apartment,
        score: result.totalScore,
        recommendation: result.recommendation,
        confidenceScore: result.confidenceScore,
        missingData: result.missingData,
        scoreBreakdown: result.scoreBreakdown,
      }
    }).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  }, [allApartments, preferences])

  const counts = useMemo(() => {
    const all = scoredApartments
    return {
      total: all.length,
      shortlisted: all.filter((a) => a.status === 'shortlisted').length,
      favorites: all.filter((a) => a.status === 'favorite').length,
      rejected: all.filter((a) => a.status === 'rejected').length,
    }
  }, [scoredApartments])

  const filteredApartments = useMemo(() => {
    let result = scoredApartments.filter((apartment) => {
      if (preferences.maxBudget > 0 && apartment.monthlyRent > preferences.maxBudget) return false
      if (preferences.preferredDistrict.trim().length > 0 && apartment.district.toLowerCase() !== preferences.preferredDistrict.trim().toLowerCase()) return false
      if (preferences.minimumSize > 0 && apartment.sizeM2 < preferences.minimumSize) return false
      if (preferences.furnishedRequired && !apartment.furnished) return false
      if (preferences.parkingRequired && !apartment.parking) return false
      if (preferences.petsRequired && !apartment.petsAllowed) return false
      if (statusFilter !== 'all' && apartment.status !== statusFilter) return false
      if (recFilter !== 'all' && apartment.recommendation !== recFilter) return false
      return true
    })

    switch (sortBy) {
      case 'rent-asc':
        result = [...result].sort((a, b) => a.monthlyRent - b.monthlyRent)
        break
      case 'rent-desc':
        result = [...result].sort((a, b) => b.monthlyRent - a.monthlyRent)
        break
      case 'size':
        result = [...result].sort((a, b) => b.sizeM2 - a.sizeM2)
        break
      case 'rent-per-m2':
        result = [...result].sort((a, b) => (a.monthlyRent / a.sizeM2) - (b.monthlyRent / b.sizeM2))
        break
      case 'favorites':
        result = [...result].sort((a, b) => {
          const aFav = a.status === 'favorite' ? 0 : 1
          const bFav = b.status === 'favorite' ? 0 : 1
          return aFav - bFav || (b.score ?? 0) - (a.score ?? 0)
        })
        break
      default:
        break
    }

    return result
  }, [scoredApartments, preferences, statusFilter, recFilter, sortBy])

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Rent</h1>
        <p className="text-base sm:text-lg text-foreground/70">
          Find the best rental opportunity and understand why it fits.
        </p>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Evaluate rental opportunities using budget, location, comfort, and data completeness.
          Adjust your preferences below to see which opportunities fit you best.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 text-center"><p className="text-2xl font-bold">{counts.total}</p><p className="text-xs text-muted-foreground">Total</p></Card>
        <Card className="p-3 text-center"><p className="text-2xl font-bold">{counts.shortlisted}</p><p className="text-xs text-muted-foreground">Shortlisted</p></Card>
        <Card className="p-3 text-center"><p className="text-2xl font-bold">{counts.favorites}</p><p className="text-xs text-muted-foreground">Favorites</p></Card>
        <Card className="p-3 text-center"><p className="text-2xl font-bold">{counts.rejected}</p><p className="text-xs text-muted-foreground">Rejected</p></Card>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {filteredApartments.length} opportunities
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RentalStatus | 'all')}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {(Object.entries(RENTAL_STATUS_LABELS) as [RentalStatus, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={recFilter} onValueChange={(v) => setRecFilter(v as RentRecommendation | 'all')}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Recommendation" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Recommendations</SelectItem>
              <SelectItem value="Excellent Fit">Excellent Fit</SelectItem>
              <SelectItem value="Good Fit">Good Fit</SelectItem>
              <SelectItem value="Possible Fit">Possible Fit</SelectItem>
              <SelectItem value="Weak Fit">Weak Fit</SelectItem>
              <SelectItem value="Reject">Reject</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="score">Best Score</SelectItem>
              <SelectItem value="rent-asc">Lowest Rent</SelectItem>
              <SelectItem value="rent-desc">Highest Rent</SelectItem>
              <SelectItem value="size">Largest Size</SelectItem>
              <SelectItem value="rent-per-m2">Lowest €/m²</SelectItem>
              <SelectItem value="favorites">Favorites First</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => navigate('/rent/hunter')}>
            <Compass className="mr-2 h-4 w-4" />
            Rent Hunter
          </Button>
          <Button variant="outline" onClick={() => navigate('/rent/compare')}>
            Compare
          </Button>
          <Button onClick={() => navigate('/rent/new')} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="mr-2 h-4 w-4" />
            New Opportunity
          </Button>
        </div>
      </div>

      <RentPreferencesPanel preferences={preferences} onChange={setPreferences} />

        <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Opportunities</h2>
          <div className="flex items-center gap-1 border rounded-md p-0.5">
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2.5"
              onClick={() => { setViewMode('cards'); localStorage.setItem('rent:viewMode', 'cards') }}
            >
              <SquaresFour className="h-4 w-4 mr-1" />Cards
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2.5"
              onClick={() => { setViewMode('list'); localStorage.setItem('rent:viewMode', 'list') }}
            >
              <List className="h-4 w-4 mr-1" />List
            </Button>
          </div>
        </div>

        {viewMode === 'cards' ? (
          filteredApartments.length === 0 ? (
            <div className="border-dashed border rounded-lg p-10 text-center">
              <p className="text-muted-foreground">
                No opportunities match your current preferences. Try relaxing some filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredApartments.map((apartment) => (
                <RentOpportunityCard key={apartment.id} apartment={apartment} />
              ))}
            </div>
          )
        ) : (
          <RentOpportunityTable apartments={filteredApartments} />
        )}
      </div>
    </div>
  )
}