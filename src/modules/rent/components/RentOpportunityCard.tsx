import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { RentalApartment, RentRecommendation, RentalStatus } from '../types'
import { RENTAL_STATUS_LABELS } from '../types'

interface RentOpportunityCardProps {
  apartment: RentalApartment
}

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

export function RentOpportunityCard({ apartment }: RentOpportunityCardProps) {
  const navigate = useNavigate()
  const {
    title,
    district,
    monthlyRent,
    currency,
    sizeM2,
    bedrooms,
    furnished,
    parking,
    balcony,
    petsAllowed,
    floor,
    score,
    recommendation,
    status,
    nextAction,
  } = apartment

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h3 className="font-display text-lg font-semibold truncate">{title}</h3>
          <p className="text-sm text-muted-foreground">{district}</p>
        </div>
        {score !== undefined && (
          <div className="text-right shrink-0">
            <div className="font-display text-2xl font-bold">{score}</div>
            <p className="text-xs text-muted-foreground">/ 100</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Rent</p>
          <p className="font-semibold">{currency} {monthlyRent}/mo</p>
        </div>
        <div>
          <p className="text-muted-foreground">Size</p>
          <p className="font-semibold">{sizeM2} m²</p>
        </div>
        <div>
          <p className="text-muted-foreground">Bedrooms</p>
          <p className="font-semibold">{bedrooms}</p>
        </div>
      </div>

      {floor !== undefined && (
        <p className="text-xs text-muted-foreground">Floor: {floor}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {furnished && <Badge variant="secondary" className="text-xs">Furnished</Badge>}
        {parking && <Badge variant="secondary" className="text-xs">Parking</Badge>}
        {balcony && <Badge variant="secondary" className="text-xs">Balcony</Badge>}
        {petsAllowed && <Badge variant="secondary" className="text-xs">Pets OK</Badge>}
      </div>

      <div className="flex flex-wrap gap-2">
        {status && status !== 'new' && (
          <Badge variant={statusVariant[status]}>{RENTAL_STATUS_LABELS[status]}</Badge>
        )}
        {recommendation && (
          <Badge variant={recommendationVariant[recommendation]}>{recommendation}</Badge>
        )}
      </div>
      {nextAction && (
        <p className="text-xs text-muted-foreground truncate">Next: {nextAction}</p>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => navigate(`/rent/${apartment.id}`)}
      >
        View Details
      </Button>
    </Card>
  )
}