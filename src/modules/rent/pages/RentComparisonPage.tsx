import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Cloud, Database } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { scoreRentalApartment } from '../services/rentScoring'
import { loadUserApartments } from '../services/rentStorage'
import { rentSupabaseAdapter } from '../services/rentSupabaseAdapter'
import { SAMPLE_APARTMENTS } from '../data/sampleApartments'
import { DEFAULT_RENT_PREFERENCES, RENTAL_STATUS_LABELS } from '../types'
import type { RentalApartment, RentRecommendation, RentalStatus } from '../types'
import { useAuth } from '@/hooks/useAuth'

type DataSource = 'cloud' | 'local' | 'mixed' | 'demo'

const statusVariant: Record<RentalStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  new: 'outline',
  shortlisted: 'secondary',
  viewing_scheduled: 'secondary',
  viewed: 'outline',
  favorite: 'default',
  rejected: 'destructive',
}

const recommendationVariant: Record<RentRecommendation, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'Excellent Fit': 'default',
  'Good Fit': 'secondary',
  Watch: 'outline',
  Avoid: 'destructive',
}

export function RentComparisonPage() {
  const navigate = useNavigate()
  const { user, organization } = useAuth()

  const [userApartments, setUserApartments] = useState<RentalApartment[]>([])
  const [dataSource, setDataSource] = useState<DataSource>('demo')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      // Try cloud first
      if (organization?.id && user?.id) {
        try {
          const result = await rentSupabaseAdapter.listRentApartments({
            organizationId: organization.id,
            userId: user.id,
          })
          if (!cancelled && result.success && result.data && result.data.length > 0) {
            setUserApartments(result.data)
            setDataSource('cloud')
            setLoading(false)
            return
          }
        } catch {
          // fall through
        }
      }

      // Fallback to localStorage
      if (!cancelled) {
        const local = loadUserApartments()
        setUserApartments(local)
        setDataSource(local.length > 0 ? 'local' : 'demo')
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [organization?.id, user?.id])

  const allApartments = useMemo(() => {
    return [...SAMPLE_APARTMENTS, ...userApartments]
  }, [userApartments])

  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 5) return prev
      return [...prev, id]
    })
  }

  const selectedApartments = useMemo(() => {
    return selectedIds
      .map((id) => allApartments.find((a) => a.id === id))
      .filter((a): a is RentalApartment => a !== undefined)
      .map((apartment) => {
        const result = scoreRentalApartment(apartment, DEFAULT_RENT_PREFERENCES)
        return { ...apartment, score: result.score, recommendation: result.recommendation }
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  }, [selectedIds, allApartments])

  const featureRows = [
    { label: 'Status', render: (a: RentalApartment) => a.status && a.status !== 'new' ? RENTAL_STATUS_LABELS[a.status] : 'New' },
    { label: 'District', render: (a: RentalApartment) => a.district },
    { label: 'Monthly Rent', render: (a: RentalApartment) => `€${a.monthlyRent}` },
    { label: 'Size (m²)', render: (a: RentalApartment) => `${a.sizeM2} m²` },
    { label: 'Rent per m²', render: (a: RentalApartment) => `€${(a.monthlyRent / a.sizeM2).toFixed(2)}` },
    { label: 'Bedrooms', render: (a: RentalApartment) => String(a.bedrooms) },
    { label: 'Furnished', render: (a: RentalApartment) => (a.furnished ? 'Yes' : 'No') },
    { label: 'Parking', render: (a: RentalApartment) => (a.parking ? 'Yes' : 'No') },
    { label: 'Balcony', render: (a: RentalApartment) => (a.balcony ? 'Yes' : 'No') },
    { label: 'Elevator', render: (a: RentalApartment) => (a.elevator ? 'Yes' : 'No') },
    { label: 'Pets Allowed', render: (a: RentalApartment) => (a.petsAllowed ? 'Yes' : 'No') },
    { label: 'Contact', render: (a: RentalApartment) => a.contactName ?? '—' },
    { label: 'Next Action', render: (a: RentalApartment) => a.nextAction ?? '—' },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Button variant="ghost" onClick={() => navigate('/rent')} className="-ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Rent
      </Button>

      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Compare Apartments</h1>
          {dataSource === 'cloud' && <Badge variant="default" className="gap-1"><Cloud className="h-3 w-3" /> Cloud</Badge>}
          {dataSource === 'local' && <Badge variant="secondary" className="gap-1"><Database className="h-3 w-3" /> Local</Badge>}
          {dataSource === 'demo' && <Badge variant="secondary">Demo</Badge>}
        </div>
        <p className="text-sm text-foreground/70">Select 2 to 5 apartments to compare side by side.</p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Select Apartments</h2>
          <span className="text-sm text-muted-foreground">{selectedIds.length} / 5 selected</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allApartments.map((apartment) => (
            <label
              key={apartment.id}
              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${selectedIds.includes(apartment.id) ? 'border-accent bg-accent/5' : 'hover:bg-muted/50'}`}
            >
              <Checkbox
                checked={selectedIds.includes(apartment.id)}
                onCheckedChange={() => toggleId(apartment.id)}
                disabled={!selectedIds.includes(apartment.id) && selectedIds.length >= 5}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{apartment.title}</p>
                <p className="text-xs text-muted-foreground">{apartment.district} · €{apartment.monthlyRent}/mo</p>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {selectedApartments.length >= 2 ? (
        <Card className="p-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 pr-4 font-semibold text-muted-foreground whitespace-nowrap">Attribute</th>
                {selectedApartments.map((a) => (
                  <th key={a.id} className="text-center py-3 px-3 min-w-[140px]">
                    <p className="font-display font-semibold truncate">{a.title}</p>
                    {a.id.startsWith('rent-demo-') && <Badge variant="secondary" className="mt-1 text-xs">Demo</Badge>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3 pr-4 font-semibold text-muted-foreground">Score</td>
                {selectedApartments.map((a) => (
                  <td key={a.id} className="text-center py-3 px-3">
                    <span className="font-display text-2xl font-bold">{a.score}</span>
                    <span className="text-muted-foreground text-xs"> / 100</span>
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-3 pr-4 font-semibold text-muted-foreground">Recommendation</td>
                {selectedApartments.map((a) => (
                  <td key={a.id} className="text-center py-3 px-3">
                    {a.recommendation && (
                      <Badge variant={recommendationVariant[a.recommendation]}>{a.recommendation}</Badge>
                    )}
                  </td>
                ))}
              </tr>
              {featureRows.map((row) => (
                <tr key={row.label} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-semibold text-muted-foreground">{row.label}</td>
                  {selectedApartments.map((a) => (
                    <td key={a.id} className="text-center py-3 px-3">
                      {row.render(a)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="border-dashed p-10 text-center">
          <p className="text-muted-foreground">Select at least 2 apartments above to see the comparison table.</p>
        </Card>
      )}
    </div>
  )
}