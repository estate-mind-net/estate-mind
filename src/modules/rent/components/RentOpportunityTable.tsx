import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowSquareOut, CaretDown, CaretUp, ArrowsDownUp } from '@phosphor-icons/react'
import type { RentalApartment, RentRecommendation } from '../types'

interface RentOpportunityTableProps {
  apartments: (RentalApartment & {
    score?: number
    recommendation?: RentRecommendation
    confidenceScore?: number
    missingData?: unknown[]
    scoreBreakdown?: Record<string, number> | unknown[]
  })[]
}

type SortField = 'score' | 'price' | 'size' | 'rentPerM2' | 'bedrooms' | 'confidence' | 'district'
type SortDir = 'asc' | 'desc'

const recommendationColor: Record<string, string> = {
  'Excellent Fit': 'text-emerald-700 bg-emerald-50 border-emerald-200',
  'Good Fit': 'text-blue-700 bg-blue-50 border-blue-200',
  'Possible Fit': 'text-orange-700 bg-orange-50 border-orange-200',
  'Weak Fit': 'text-red-700 bg-red-50 border-red-200',
  'Reject': 'text-red-800 bg-red-100 border-red-300',
}

const recommendationRowColor: Record<string, string> = {
  'Excellent Fit': 'hover:bg-emerald-50/60',
  'Good Fit': 'hover:bg-blue-50/60',
  'Possible Fit': 'hover:bg-orange-50/60',
  'Weak Fit': 'hover:bg-red-50/40',
  'Reject': 'hover:bg-red-50/40',
}

function SortHeader({ label, field, currentSort, currentDir, onSort }: {
  label: string; field: SortField; currentSort: SortField; currentDir: SortDir; onSort: (f: SortField) => void
}) {
  const active = currentSort === field
  return (
    <th
      className="px-2 py-2 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          currentDir === 'desc' ? <CaretDown className="h-3 w-3" /> : <CaretUp className="h-3 w-3" />
        ) : (
          <ArrowsDownUp className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  )
}

export function RentOpportunityTable({ apartments }: RentOpportunityTableProps) {
  const navigate = useNavigate()
  const [sortField, setSortField] = useState<SortField>('score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortDir(field === 'district' ? 'asc' : 'desc')
    }
  }, [sortField])

  const sorted = useMemo(() => {
    const arr = [...apartments]
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'score': cmp = (a.score ?? 0) - (b.score ?? 0); break
        case 'price': cmp = a.monthlyRent - b.monthlyRent; break
        case 'size': cmp = a.sizeM2 - b.sizeM2; break
        case 'rentPerM2': {
          const aR = a.sizeM2 > 0 ? a.monthlyRent / a.sizeM2 : 0
          const bR = b.sizeM2 > 0 ? b.monthlyRent / b.sizeM2 : 0
          cmp = aR - bR; break
        }
        case 'bedrooms': cmp = a.bedrooms - b.bedrooms; break
        case 'confidence': cmp = (a.confidenceScore ?? 0) - (b.confidenceScore ?? 0); break
        case 'district': cmp = (a.district ?? '').localeCompare(b.district ?? ''); break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
    return arr
  }, [apartments, sortField, sortDir])

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }, [])

  if (apartments.length === 0) {
    return (
      <div className="border-dashed border rounded-lg p-10 text-center">
        <p className="text-muted-foreground">No opportunities match your current preferences. Try relaxing some filters.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <SortHeader label="Score" field="score" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Rec</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Title</th>
            <SortHeader label="District" field="district" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Price" field="price" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Size" field="size" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="€/m²" field="rentPerM2" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Beds" field="bedrooms" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Floor</th>
            <SortHeader label="Conf" field="confidence" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Missing</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Source</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((apt) => {
            const expanded = expandedId === apt.id
            const rec = apt.recommendation ?? ''
            const rowHover = recommendationRowColor[rec] ?? 'hover:bg-muted/30'
            const rentPerM2 = apt.sizeM2 > 0 ? (apt.monthlyRent / apt.sizeM2).toFixed(1) : '—'
            return (
              <tr
                key={apt.id}
                className={`border-b cursor-pointer transition-colors ${rowHover} ${expanded ? 'bg-muted/20' : ''}`}
                onClick={() => toggleExpand(apt.id)}
              >
                <td className="px-2 py-2 font-display font-bold text-base">{apt.score ?? '—'}</td>
                <td className="px-2 py-2">
                  {rec && (
                    <Badge variant="outline" className={`text-[10px] whitespace-nowrap ${recommendationColor[rec] ?? ''}`}>
                      {rec}
                    </Badge>
                  )}
                </td>
                <td className="px-2 py-2 font-medium max-w-[200px] truncate" title={apt.title}>{apt.title}</td>
                <td className="px-2 py-2 text-muted-foreground">{apt.district || '—'}</td>
                <td className="px-2 py-2 font-semibold whitespace-nowrap">€{apt.monthlyRent}/mo</td>
                <td className="px-2 py-2">{apt.sizeM2} m²</td>
                <td className="px-2 py-2 text-muted-foreground">{rentPerM2}</td>
                <td className="px-2 py-2">{apt.bedrooms}</td>
                <td className="px-2 py-2 text-muted-foreground">{apt.floor ?? '—'}</td>
                <td className="px-2 py-2">{apt.confidenceScore ?? '—'}%</td>
                <td className="px-2 py-2">
                  {apt.missingData && apt.missingData.length > 0 && (
                    <Badge variant="outline" className="text-[10px] text-amber-600">{apt.missingData.length}</Badge>
                  )}
                </td>
                <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
                  {apt.listingUrl && (
                    <a href={apt.listingUrl} target="_blank" rel="noopener noreferrer" title="Open original listing" className="inline-flex">
                      <ArrowSquareOut className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                    </a>
                  )}
                </td>
                <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => navigate(`/rent/${apt.id}`)}>
                    Analyze
                  </Button>
                </td>
              </tr>
            )
          })}
          {sorted.map((apt) => {
            if (expandedId !== apt.id) return null
            const rec = apt.recommendation ?? ''
            const rentPerM2 = apt.sizeM2 > 0 ? (apt.monthlyRent / apt.sizeM2).toFixed(1) : '—'
            return (
              <tr key={`${apt.id}-expanded`} className="bg-muted/10 border-b">
                <td colSpan={13} className="px-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-xs uppercase text-muted-foreground">Score Breakdown</h4>
                      {apt.scoreBreakdown ? (
                        <div className="space-y-1">
                          {Object.entries(apt.scoreBreakdown).map(([k, v]) => (
                            <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>
                          ))}
                        </div>
                      ) : <p className="text-muted-foreground">No breakdown available</p>}
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-xs uppercase text-muted-foreground">Details</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-medium">€{apt.monthlyRent}/mo</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span className="font-medium">{apt.sizeM2} m²</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">€/m²</span><span className="font-medium">{rentPerM2}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Bedrooms</span><span className="font-medium">{apt.bedrooms}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Floor</span><span className="font-medium">{apt.floor ?? '—'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Furnished</span><span className="font-medium">{apt.furnished ? 'Yes' : 'No'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Parking</span><span className="font-medium">{apt.parking ? 'Yes' : 'No'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Balcony</span><span className="font-medium">{apt.balcony ? 'Yes' : 'No'}</span></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                    {apt.missingData && apt.missingData.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-xs uppercase text-muted-foreground">Missing Data</h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {apt.missingData.map((f) => <Badge key={typeof f === 'string' ? f : f.field ?? JSON.stringify(f)} variant="outline" className="text-[10px] text-amber-600">{typeof f === 'string' ? f : f.label ?? f.field}</Badge>)}
                          </div>
                        </div>
                      )}
                      {apt.notes && (
                        <div>
                          <h4 className="font-semibold text-xs uppercase text-muted-foreground">Description</h4>
                          <p className="text-xs text-muted-foreground line-clamp-4 mt-1">{apt.notes}</p>
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate(`/rent/${apt.id}`)}>
                          Analyze
                        </Button>
                        {apt.listingUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={apt.listingUrl} target="_blank" rel="noopener noreferrer">
                              <ArrowSquareOut className="h-3.5 w-3.5 mr-1" />Original Listing
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}