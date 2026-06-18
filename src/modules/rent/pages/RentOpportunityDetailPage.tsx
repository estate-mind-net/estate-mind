import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Heart, PencilSimple, Phone, Trash, Eye, XCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { scoreRentalApartment } from '../services/rentScoring'
import { getUserApartmentById, deleteUserApartment, isUserApartment, updateApartmentStatus } from '../services/rentStorage'
import { SAMPLE_APARTMENTS } from '../data/sampleApartments'
import { DEFAULT_RENT_PREFERENCES, RENTAL_STATUS_LABELS } from '../types'
import type { RentalStatus } from '../types'

export function RentOpportunityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [refreshKey, setRefreshKey] = useState(0)

  const apartment = useMemo(() => {
    if (!id) return null
    const userApartment = getUserApartmentById(id)
    if (userApartment) return userApartment
    return SAMPLE_APARTMENTS.find((a) => a.id === id) ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshKey])

  const isUser = id ? isUserApartment(id) : false

  const handleStatusChange = (status: RentalStatus) => {
    if (!id || !isUser) return
    updateApartmentStatus(id, status)
    toast.success(`Status updated to ${RENTAL_STATUS_LABELS[status]}`)
    setRefreshKey((k) => k + 1)
  }

  const handleDelete = () => {
    if (!id || !isUser) return
    if (!window.confirm('Are you sure you want to delete this listing? This cannot be undone.')) return
    deleteUserApartment(id)
    toast.success('Listing deleted.')
    navigate('/rent')
  }

  const scoreResult = useMemo(() => {
    if (!apartment) return null
    return scoreRentalApartment(apartment, DEFAULT_RENT_PREFERENCES)
  }, [apartment])

  if (!apartment) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost" onClick={() => navigate('/rent')} className="-ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Rent
        </Button>
        <Card className="border-dashed p-10 text-center">
          <h1 className="font-display text-2xl font-bold">Apartment not found</h1>
          <p className="mt-3 text-muted-foreground">This listing may have been removed or the link is invalid.</p>
        </Card>
      </div>
    )
  }

  const isDemo = apartment.id.startsWith('rent-demo-')
  const {
    title, district, city, address, monthlyRent, currency, sizeM2, bedrooms,
    furnished, parking, balcony, elevator, petsAllowed, floor, listingUrl, notes,
  } = apartment

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Button variant="ghost" onClick={() => navigate('/rent')} className="-ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Rent
      </Button>

      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
          {isDemo && <Badge variant="secondary">Demo</Badge>}
        </div>
        <p className="text-foreground/70">{district}, {city}{address ? ` — ${address}` : ''}</p>
        {isUser && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/rent/${id}/edit`)}>
              <PencilSimple className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="default" size="sm" onClick={() => handleStatusChange('favorite')}>
              <Heart className="mr-2 h-4 w-4" />
              Favorite
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleStatusChange('viewed')}>
              <Eye className="mr-2 h-4 w-4" />
              Viewed
            </Button>
            <Button variant="destructive" size="sm" onClick={() => handleStatusChange('rejected')}>
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {isUser && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-semibold">Status</h2>
            <Select value={apartment.status ?? 'new'} onValueChange={(v) => handleStatusChange(v as RentalStatus)}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(RENTAL_STATUS_LABELS) as [RentalStatus, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {apartment.status === 'viewed' && apartment.viewedAt && (
            <p className="text-xs text-muted-foreground">Viewed on {new Date(apartment.viewedAt).toLocaleDateString()}</p>
          )}
        </Card>
      )}

      {(apartment.contactName || apartment.contactPhone || apartment.nextAction) && (
        <Card className="p-6 space-y-3">
          <h2 className="font-display text-lg font-semibold">Contact & Next Steps</h2>
          {apartment.contactName && (
            <p className="text-sm"><span className="text-muted-foreground">Contact:</span> {apartment.contactName}</p>
          )}
          {apartment.contactPhone && (
            <p className="text-sm flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${apartment.contactPhone}`} className="text-accent underline">{apartment.contactPhone}</a>
            </p>
          )}
          {apartment.nextAction && (
            <p className="text-sm"><span className="text-muted-foreground">Next:</span> {apartment.nextAction}</p>
          )}
        </Card>
      )}

      {scoreResult && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Fit Score</h2>
            <div className="text-right">
              <span className="font-display text-3xl font-bold">{scoreResult.score}</span>
              <span className="text-muted-foreground text-sm"> / 100</span>
            </div>
          </div>
          <Badge variant={
            scoreResult.recommendation === 'Excellent Fit' ? 'default' :
            scoreResult.recommendation === 'Good Fit' ? 'secondary' :
            scoreResult.recommendation === 'Watch' ? 'outline' : 'destructive'
          }>{scoreResult.recommendation}</Badge>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-sm">
            <BreakdownItem label="Budget" value={scoreResult.breakdown.budgetFit} />
            <BreakdownItem label="Size" value={scoreResult.breakdown.sizeFit} />
            <BreakdownItem label="District" value={scoreResult.breakdown.districtMatch} />
            <BreakdownItem label="Furnished" value={scoreResult.breakdown.furnishedMatch} />
            <BreakdownItem label="Parking" value={scoreResult.breakdown.parkingMatch} />
            <BreakdownItem label="Balcony" value={scoreResult.breakdown.balconyMatch} />
            <BreakdownItem label="Pets" value={scoreResult.breakdown.petsMatch} />
          </div>
        </Card>
      )}

      <Card className="p-6 space-y-4">
        <h2 className="font-display text-xl font-semibold">Apartment Details</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Monthly Rent</p>
            <p className="font-semibold text-lg">{currency} {monthlyRent}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Size</p>
            <p className="font-semibold text-lg">{sizeM2} m²</p>
          </div>
          <div>
            <p className="text-muted-foreground">Bedrooms</p>
            <p className="font-semibold text-lg">{bedrooms}</p>
          </div>
          {floor !== undefined && (
            <div>
              <p className="text-muted-foreground">Floor</p>
              <p className="font-semibold">{floor}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {furnished && <Badge variant="secondary">Furnished</Badge>}
          {parking && <Badge variant="secondary">Parking</Badge>}
          {balcony && <Badge variant="secondary">Balcony</Badge>}
          {elevator && <Badge variant="secondary">Elevator</Badge>}
          {petsAllowed && <Badge variant="secondary">Pets OK</Badge>}
          {!furnished && !parking && !balcony && !elevator && !petsAllowed && (
            <span className="text-sm text-muted-foreground">No special features listed</span>
          )}
        </div>
      </Card>

      {notes && (
        <Card className="p-6 space-y-2">
          <h2 className="font-display text-lg font-semibold">Notes</h2>
          <p className="text-sm text-foreground/80 whitespace-pre-wrap">{notes}</p>
        </Card>
      )}

      {listingUrl && (
        <Card className="p-6 space-y-2">
          <h2 className="font-display text-lg font-semibold">Listing</h2>
          <a href={listingUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent underline break-all">
            {listingUrl}
          </a>
        </Card>
      )}
    </div>
  )
}

function BreakdownItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}