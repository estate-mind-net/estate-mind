import { useState, useMemo } from 'react'
import { useOpportunities } from '@/hooks/useOpportunities'
import { 
  Funnel, 
  MagnifyingGlass, 
  Plus, 
  Buildings, 
  Tag, 
  ArrowsDownUp, 
  Export,
  X,
  CaretDown,
  Brain,
  CheckCircle,
  Archive,
  FileArrowDown,
  TagSimple,
  Trash
} from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScoreGauge } from './ScoreGauge'
import type { Opportunity, OpportunityStatus } from '@/lib/types'
import { toast } from 'sonner'

interface OpportunityTrackerProps {
  onNavigate: (page: string, data?: unknown) => void
  onBack: () => void
}

type SortField = 'score' | 'price' | 'yield' | 'updatedAt' | 'savedAt'
type SortDirection = 'asc' | 'desc'
type ViewMode = 'all' | 'new-opportunity' | 'initial-analysis' | 'watching' | 'due-diligence' | 'negotiation' | 'acquired' | 'rejected'

const statusConfig: Record<OpportunityStatus, { 
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  color: string 
}> = {
  'new-opportunity': { label: 'New', variant: 'secondary', color: 'oklch(0.75 0.15 195)' },
  'initial-analysis': { label: 'Initial Analysis', variant: 'outline', color: 'oklch(0.65 0.15 270)' },
  'watching': { label: 'Watching', variant: 'outline', color: 'oklch(0.75 0.15 75)' },
  'due-diligence': { label: 'Due Diligence', variant: 'default', color: 'oklch(0.35 0.15 270)' },
  'negotiation': { label: 'Negotiation', variant: 'default', color: 'oklch(0.75 0.15 75)' },
  'acquired': { label: 'Acquired', variant: 'default', color: 'oklch(0.65 0.18 145)' },
  'rejected': { label: 'Rejected', variant: 'destructive', color: 'oklch(0.60 0.22 25)' }
}

const allTags = [
  'high-yield',
  'airbnb',
  'city-center',
  'luxury',
  'sea-view',
  'renovation',
  'value-add',
  'student-rental',
  'new-build',
  'coastal',
  'downtown',
  'suburban'
]

export function OpportunityTracker({ onNavigate, onBack }: OpportunityTrackerProps) {
  const { opportunities, archivedOpportunities, updateStatus, bulkArchive, bulkAddTags, bulkDelete } = useOpportunities()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [sortField, setSortField] = useState<SortField>('updatedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 10000000 })
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedOpportunityIds, setSelectedOpportunityIds] = useState<string[]>([])
  const [showBulkTagDialog, setShowBulkTagDialog] = useState(false)
  const [bulkTagsToAdd, setBulkTagsToAdd] = useState<string[]>([])
  const [showExportDialog, setShowExportDialog] = useState(false)

  const uniqueCountries = useMemo(() => {
    if (!opportunities) return []
    return Array.from(new Set(opportunities.map(o => o.property.country)))
  }, [opportunities])

  const uniquePropertyTypes = useMemo(() => {
    if (!opportunities) return []
    return Array.from(new Set(opportunities.map(o => o.property.propertyType)))
  }, [opportunities])

  const filteredAndSortedOpportunities = useMemo(() => {
    if (!opportunities) return []
    let filtered = opportunities

    if (viewMode !== 'all') {
      filtered = filtered.filter(o => o.status === viewMode)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(o => 
        o.property.title.toLowerCase().includes(query) ||
        o.property.city.toLowerCase().includes(query) ||
        o.property.country.toLowerCase().includes(query) ||
        o.property.district.toLowerCase().includes(query) ||
        o.notes.toLowerCase().includes(query)
      )
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(o => 
        selectedTags.some(tag => o.tags.includes(tag))
      )
    }

    if (selectedCountries.length > 0) {
      filtered = filtered.filter(o => selectedCountries.includes(o.property.country))
    }

    if (selectedTypes.length > 0) {
      filtered = filtered.filter(o => selectedTypes.includes(o.property.propertyType))
    }

    filtered = filtered.filter(o => 
      o.property.askingPrice >= priceRange.min && 
      o.property.askingPrice <= priceRange.max
    )

    const sorted = [...filtered].sort((a, b) => {
      let aVal: number | string | undefined
      let bVal: number | string | undefined

      switch (sortField) {
        case 'score':
          aVal = a.analysis?.score.overall ?? 0
          bVal = b.analysis?.score.overall ?? 0
          break
        case 'price':
          aVal = a.property.askingPrice
          bVal = b.property.askingPrice
          break
        case 'yield':
          aVal = a.analysis?.rentalYieldEstimate.percentage ?? 0
          bVal = b.analysis?.rentalYieldEstimate.percentage ?? 0
          break
        case 'updatedAt':
          aVal = new Date(a.updatedAt).getTime()
          bVal = new Date(b.updatedAt).getTime()
          break
        case 'savedAt':
          aVal = new Date(a.savedAt).getTime()
          bVal = new Date(b.savedAt).getTime()
          break
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [opportunities, viewMode, searchQuery, selectedTags, selectedCountries, selectedTypes, priceRange, sortField, sortDirection])

  const statusCounts = useMemo(() => {
    const counts: Record<OpportunityStatus | 'all', number> = {
      all: opportunities?.length ?? 0,
      'new-opportunity': 0,
      'initial-analysis': 0,
      watching: 0,
      'due-diligence': 0,
      negotiation: 0,
      acquired: 0,
      rejected: 0
    }

    opportunities?.forEach(o => {
      counts[o.status]++
    })

    return counts
  }, [opportunities])

  const handleStatusChange = (opportunityId: string, newStatus: OpportunityStatus) => {
    updateStatus(opportunityId, newStatus)
    toast.success('Status updated successfully')
  }

  const handleTagToggle = (tag: string) => {
    setSelectedTags(current => 
      current.includes(tag)
        ? current.filter(t => t !== tag)
        : [...current, tag]
    )
  }

  const handleCountryToggle = (country: string) => {
    setSelectedCountries(current => 
      current.includes(country)
        ? current.filter(c => c !== country)
        : [...current, country]
    )
  }

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(current => 
      current.includes(type)
        ? current.filter(t => t !== type)
        : [...current, type]
    )
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedTags([])
    setSelectedCountries([])
    setSelectedTypes([])
    setPriceRange({ min: 0, max: 10000000 })
    toast.info('Filters cleared')
  }

  const hasActiveFilters = searchQuery || selectedTags.length > 0 || selectedCountries.length > 0 || selectedTypes.length > 0 || priceRange.min > 0 || priceRange.max < 10000000

  const handleSelectAll = () => {
    if (selectedOpportunityIds.length === filteredAndSortedOpportunities.length) {
      setSelectedOpportunityIds([])
    } else {
      setSelectedOpportunityIds(filteredAndSortedOpportunities.map(o => o.id))
    }
  }

  const handleSelectOpportunity = (id: string) => {
    setSelectedOpportunityIds(current =>
      current.includes(id)
        ? current.filter(oppId => oppId !== id)
        : [...current, id]
    )
  }

  const handleBulkArchive = () => {
    if (selectedOpportunityIds.length === 0) return

    bulkArchive(selectedOpportunityIds)

    toast.success(`Archived ${selectedOpportunityIds.length} ${selectedOpportunityIds.length === 1 ? 'opportunity' : 'opportunities'}`)
    setSelectedOpportunityIds([])
  }

  const handleBulkExport = (format: 'csv' | 'json') => {
    if (selectedOpportunityIds.length === 0) return

    const selected = opportunities?.filter(o => selectedOpportunityIds.includes(o.id)) ?? []

    if (format === 'json') {
      const dataStr = JSON.stringify(selected, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `opportunities-export-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Exported as JSON')
    } else {
      const headers = ['Title', 'Country', 'City', 'Type', 'Price', 'Size (m²)', 'Bedrooms', 'Status', 'Tags', 'AI Score', 'Yield %']
      const rows = selected.map(o => [
        o.property.title,
        o.property.country,
        o.property.city,
        o.property.propertyType,
        `${o.property.currency} ${o.property.askingPrice}`,
        o.property.sizeSqm,
        o.property.bedrooms,
        o.status,
        o.tags.join('; '),
        o.analysis?.score.overall ?? 'N/A',
        o.analysis?.rentalYieldEstimate.percentage ?? 'N/A'
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      const dataBlob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `opportunities-export-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Exported as CSV')
    }

    setShowExportDialog(false)
  }

  const handleBulkAddTags = () => {
    if (selectedOpportunityIds.length === 0 || bulkTagsToAdd.length === 0) return

    bulkAddTags(selectedOpportunityIds, bulkTagsToAdd)

    toast.success(`Added ${bulkTagsToAdd.length} ${bulkTagsToAdd.length === 1 ? 'tag' : 'tags'} to ${selectedOpportunityIds.length} ${selectedOpportunityIds.length === 1 ? 'opportunity' : 'opportunities'}`)
    setSelectedOpportunityIds([])
    setBulkTagsToAdd([])
    setShowBulkTagDialog(false)
  }

  const handleBulkDelete = () => {
    if (selectedOpportunityIds.length === 0) return
    if (!confirm(`Are you sure you want to permanently delete ${selectedOpportunityIds.length} ${selectedOpportunityIds.length === 1 ? 'opportunity' : 'opportunities'}?`)) return

    bulkDelete(selectedOpportunityIds)

    toast.success(`Deleted ${selectedOpportunityIds.length} ${selectedOpportunityIds.length === 1 ? 'opportunity' : 'opportunities'}`)
    setSelectedOpportunityIds([])
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2">
            ← Back to Dashboard
          </Button>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Opportunity Tracker</h1>
          <p className="mt-2 text-sm sm:text-base text-foreground/70">Manage your investment pipeline with advanced filters</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => onNavigate('analyzer')} className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto">
            <Plus className="mr-2 h-5 w-5" />
            Add Opportunity
          </Button>
        </div>
      </div>

      {selectedOpportunityIds.length > 0 && (
        <Card className="border-accent bg-accent/5 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <CheckCircle className="h-5 w-5 text-accent flex-shrink-0" weight="fill" />
              <span className="font-semibold text-sm sm:text-base">
                {selectedOpportunityIds.length} {selectedOpportunityIds.length === 1 ? 'opportunity' : 'opportunities'} selected
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleBulkArchive} variant="outline" size="sm">
                <Archive className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Archive</span>
              </Button>
              <Button onClick={() => setShowExportDialog(true)} variant="outline" size="sm">
                <FileArrowDown className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button onClick={() => setShowBulkTagDialog(true)} variant="outline" size="sm">
                <TagSimple className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Add Tags</span>
              </Button>
              <Button onClick={handleBulkDelete} variant="destructive" size="sm">
                <Trash className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
              <Button onClick={() => setSelectedOpportunityIds([])} variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4 sm:p-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title, location, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:pl-10 text-sm sm:text-base"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Funnel className="h-4 w-4" />
                    <span className="hidden sm:inline">Filters</span>
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                        {[selectedTags.length, selectedCountries.length, selectedTypes.length].filter(n => n > 0).length}
                      </Badge>
                    )}
                    <CaretDown className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      <div>
                        <h4 className="mb-3 font-semibold text-sm">Tags</h4>
                        <div className="space-y-2">
                          {allTags.map((tag) => (
                            <label key={tag} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox 
                                checked={selectedTags.includes(tag)}
                                onCheckedChange={() => handleTagToggle(tag)}
                              />
                              <span className="text-sm capitalize">{tag.replace('-', ' ')}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="mb-3 font-semibold text-sm">Countries</h4>
                        <div className="space-y-2">
                          {uniqueCountries.map((country) => (
                            <label key={country} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox 
                                checked={selectedCountries.includes(country)}
                                onCheckedChange={() => handleCountryToggle(country)}
                              />
                              <span className="text-sm">{country}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="mb-3 font-semibold text-sm">Property Types</h4>
                        <div className="space-y-2">
                          {uniquePropertyTypes.map((type) => (
                            <label key={type} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox 
                                checked={selectedTypes.includes(type)}
                                onCheckedChange={() => handleTypeToggle(type)}
                              />
                              <span className="text-sm capitalize">{type}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {hasActiveFilters && (
                        <div className="border-t pt-4">
                          <Button onClick={clearFilters} variant="outline" size="sm" className="w-full">
                            <X className="mr-2 h-4 w-4" />
                            Clear All Filters
                          </Button>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                <SelectTrigger className="w-32 sm:w-40">
                  <ArrowsDownUp className="mr-1 sm:mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updatedAt">Last Updated</SelectItem>
                  <SelectItem value="savedAt">Date Added</SelectItem>
                  <SelectItem value="score">AI Score</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="yield">Yield</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
                className="gap-2"
              >
                {sortDirection === 'desc' ? '↓' : '↑'}
              </Button>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground">Active filters:</span>
              {selectedTags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => handleTagToggle(tag)} />
                </Badge>
              ))}
              {selectedCountries.map(country => (
                <Badge key={country} variant="secondary" className="gap-1">
                  {country}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => handleCountryToggle(country)} />
                </Badge>
              ))}
              {selectedTypes.map(type => (
                <Badge key={type} variant="secondary" className="gap-1">
                  {type}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => handleTypeToggle(type)} />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="all" className="relative whitespace-nowrap">
              All
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {statusCounts.all}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="new-opportunity" className="relative whitespace-nowrap">
              New
              {statusCounts['new-opportunity'] > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {statusCounts['new-opportunity']}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="initial-analysis" className="whitespace-nowrap">
              <span className="hidden sm:inline">Initial Analysis</span>
              <span className="sm:hidden">Analysis</span>
              {statusCounts['initial-analysis'] > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {statusCounts['initial-analysis']}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="watching" className="whitespace-nowrap">
              Watching
              {statusCounts.watching > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {statusCounts.watching}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="due-diligence" className="whitespace-nowrap">
              <span className="hidden sm:inline">Due Diligence</span>
              <span className="sm:hidden">DD</span>
              {statusCounts['due-diligence'] > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {statusCounts['due-diligence']}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="negotiation" className="whitespace-nowrap">
              <span className="hidden sm:inline">Negotiation</span>
              <span className="sm:hidden">Neg.</span>
              {statusCounts.negotiation > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {statusCounts.negotiation}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="acquired" className="whitespace-nowrap">
              Acquired
              {statusCounts.acquired > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {statusCounts.acquired}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="whitespace-nowrap">
              Rejected
              {statusCounts.rejected > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {statusCounts.rejected}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={viewMode} className="mt-6">
          {filteredAndSortedOpportunities.length === 0 ? (
            <Card className="p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="rounded-full bg-muted p-6">
                  <Buildings className="h-12 w-12 text-muted-foreground" weight="duotone" />
                </div>
                <h3 className="mt-6 font-display text-xl font-bold">No opportunities found</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  {hasActiveFilters 
                    ? "Try adjusting your filters or search query"
                    : "Start analyzing properties to build your investment pipeline"
                  }
                </p>
                {hasActiveFilters ? (
                  <Button onClick={clearFilters} variant="outline" className="mt-6">
                    Clear Filters
                  </Button>
                ) : (
                  <Button onClick={() => onNavigate('analyzer')} className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90">
                    <Brain className="mr-2 h-5 w-5" />
                    Analyze First Property
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={selectedOpportunityIds.length === filteredAndSortedOpportunities.length && filteredAndSortedOpportunities.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    Select All ({filteredAndSortedOpportunities.length})
                  </span>
                </label>
                {selectedOpportunityIds.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {selectedOpportunityIds.length} selected
                  </span>
                )}
              </div>

              {filteredAndSortedOpportunities.map((opp) => (
                <Card 
                  key={opp.id}
                  className={`group relative overflow-hidden transition-all hover:border-accent/50 hover:shadow-lg ${
                    selectedOpportunityIds.includes(opp.id) ? 'border-accent bg-accent/5' : ''
                  }`}
                >
                  <div 
                    className="absolute left-0 top-0 h-full w-1 transition-all"
                    style={{ backgroundColor: statusConfig[opp.status].color }}
                  />
                  
                  <div className="p-6 pl-8">
                    <div className="flex items-start gap-4">
                      <Checkbox 
                        checked={selectedOpportunityIds.includes(opp.id)}
                        onCheckedChange={() => handleSelectOpportunity(opp.id)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div 
                            onClick={() => opp.analysis && onNavigate('report', opp.analysis)}
                            className={opp.analysis ? "cursor-pointer" : ""}
                          >
                            <h3 className="font-display text-xl font-bold group-hover:text-accent transition-colors">
                              {opp.property.title}
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {opp.property.district}, {opp.property.city} • {opp.property.country}
                            </p>
                          </div>
                          
                          {opp.analysis && (
                            <ScoreGauge 
                              score={opp.analysis.score.overall} 
                              size="md" 
                              showLabel={false} 
                            />
                          )}
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Price</p>
                            <p className="mt-1 font-semibold">
                              {opp.property.currency} {opp.property.askingPrice.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {opp.property.currency} {Math.round(opp.property.askingPrice / opp.property.sizeSqm).toLocaleString()}/m²
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">Property Details</p>
                            <p className="mt-1 font-semibold">
                              {opp.property.sizeSqm}m² • {opp.property.bedrooms} bed
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {opp.property.propertyType} • {opp.property.condition}
                            </p>
                          </div>

                          {opp.analysis && (
                            <>
                              <div>
                                <p className="text-xs text-muted-foreground">Rental Yield</p>
                                <p className="mt-1 font-semibold text-success">
                                  {opp.analysis.rentalYieldEstimate.percentage}%
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {opp.property.currency} {opp.analysis.rentalYieldEstimate.monthly.toLocaleString()}/mo
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-muted-foreground">Airbnb Potential</p>
                                <p className="mt-1 font-semibold text-accent">
                                  {opp.analysis.airbnbPotential.percentage}%
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {opp.property.currency} {opp.analysis.airbnbPotential.monthlyRevenue.toLocaleString()}/mo
                                </p>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <Select
                            value={opp.status}
                            onValueChange={(value) => handleStatusChange(opp.id, value as OpportunityStatus)}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusConfig).map(([status, config]) => (
                                <SelectItem key={status} value={status}>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="h-2 w-2 rounded-full" 
                                      style={{ backgroundColor: config.color }}
                                    />
                                    {config.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {opp.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              <Tag className="mr-1 h-3 w-3" weight="duotone" />
                              {tag}
                            </Badge>
                          ))}

                          {!opp.analysis && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => onNavigate('analyzer')}
                              className="ml-auto"
                            >
                              <Brain className="mr-2 h-4 w-4" />
                              Analyze
                            </Button>
                          )}

                          {opp.analysis && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => onNavigate('report', opp.analysis)}
                              className="ml-auto"
                            >
                              View Report
                            </Button>
                          )}
                        </div>

                        {opp.notes && (
                          <div className="mt-4 rounded-lg bg-muted/50 p-3">
                            <p className="text-sm text-foreground/80">
                              <span className="font-semibold text-muted-foreground">Notes: </span>
                              {opp.notes}
                            </p>
                          </div>
                        )}

                        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Added {new Date(opp.savedAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>Updated {new Date(opp.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Card className="p-4 sm:p-6">
        <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" weight="duotone" />
              <span className="text-xs sm:text-sm">Total Opportunities</span>
            </div>
            <p className="mt-2 font-display text-2xl sm:text-3xl font-bold">{opportunities?.length ?? 0}</p>
          </div>
          
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Brain className="h-4 w-4 sm:h-5 sm:w-5" weight="duotone" />
              <span className="text-xs sm:text-sm">Analyzed</span>
            </div>
            <p className="mt-2 font-display text-2xl sm:text-3xl font-bold">
              {opportunities?.filter(o => o.analysis).length ?? 0}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Buildings className="h-4 w-4 sm:h-5 sm:w-5" weight="duotone" />
              <span className="text-xs sm:text-sm">Active Deals</span>
            </div>
            <p className="mt-2 font-display text-2xl sm:text-3xl font-bold">
              {statusCounts['due-diligence'] + statusCounts.negotiation}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Tag className="h-4 w-4 sm:h-5 sm:w-5" weight="duotone" />
              <span className="text-xs sm:text-sm">Watching</span>
            </div>
            <p className="mt-2 font-display text-2xl sm:text-3xl font-bold">{statusCounts.watching}</p>
          </div>
        </div>
      </Card>

      <Dialog open={showBulkTagDialog} onOpenChange={setShowBulkTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tags to Selected Opportunities</DialogTitle>
            <DialogDescription>
              Select tags to add to {selectedOpportunityIds.length} {selectedOpportunityIds.length === 1 ? 'opportunity' : 'opportunities'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {allTags.map((tag) => (
                <label key={tag} className="flex items-center gap-2 cursor-pointer rounded-lg border p-3 hover:bg-muted/50">
                  <Checkbox 
                    checked={bulkTagsToAdd.includes(tag)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setBulkTagsToAdd([...bulkTagsToAdd, tag])
                      } else {
                        setBulkTagsToAdd(bulkTagsToAdd.filter(t => t !== tag))
                      }
                    }}
                  />
                  <span className="text-sm capitalize">{tag.replace('-', ' ')}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkTagDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkAddTags}
              disabled={bulkTagsToAdd.length === 0}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <TagSimple className="mr-2 h-4 w-4" />
              Add {bulkTagsToAdd.length} {bulkTagsToAdd.length === 1 ? 'Tag' : 'Tags'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Selected Opportunities</DialogTitle>
            <DialogDescription>
              Choose format to export {selectedOpportunityIds.length} {selectedOpportunityIds.length === 1 ? 'opportunity' : 'opportunities'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button 
              onClick={() => handleBulkExport('csv')}
              variant="outline"
              className="w-full justify-start h-auto p-4"
            >
              <div className="flex items-start gap-3 text-left">
                <FileArrowDown className="h-5 w-5 mt-0.5 text-accent" />
                <div>
                  <div className="font-semibold">Export as CSV</div>
                  <div className="text-sm text-muted-foreground">
                    Download a spreadsheet-compatible file with key property details
                  </div>
                </div>
              </div>
            </Button>
            <Button 
              onClick={() => handleBulkExport('json')}
              variant="outline"
              className="w-full justify-start h-auto p-4"
            >
              <div className="flex items-start gap-3 text-left">
                <FileArrowDown className="h-5 w-5 mt-0.5 text-accent" />
                <div>
                  <div className="font-semibold">Export as JSON</div>
                  <div className="text-sm text-muted-foreground">
                    Download complete data including all analysis details
                  </div>
                </div>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
