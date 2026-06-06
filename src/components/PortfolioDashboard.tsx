import { useEffect, useMemo, useState } from 'react'
import { Buildings, ChartPieSlice, Coins, TrendUp, Wallet } from '@phosphor-icons/react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { MetricCard } from '@/components/MetricCard'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/hooks/useAuth'
import { formatCompactNumber, formatCurrency, formatPercentage } from '@/lib/utils/format'
import { opportunityWorkspaceService, type OpportunityWorkspaceItem } from '@/services/supabase/opportunityWorkspace.service'

type PortfolioAsset = OpportunityWorkspaceItem & {
  normalizedStage: string
  monthlyRent: number
  yieldPercentage: number | null
  roiPercentage: number | null
  performanceScore: number
  reviewReasons: string[]
}

const STAGE_LABELS: Record<string, string> = {
  purchased: 'Purchased',
  owned: 'Owned',
  'active asset': 'Active Asset',
  acquired: 'Purchased',
}

const PORTFOLIO_STAGES = new Set(['purchased', 'owned', 'active asset', 'acquired'])
const PIE_COLORS = ['#3f6212', '#0f766e', '#0f172a', '#7c2d12', '#4c1d95', '#155e75']

const normalizeStage = (value: string | null | undefined): string => {
  return (value ?? '')
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const toMonthKey = (dateValue: string): string => {
  const date = new Date(dateValue)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const toMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

const estimateYield = (asset: OpportunityWorkspaceItem): number | null => {
  const fromAnalysis = asset.analysis?.rentalYieldEstimate?.percentage
  if (typeof fromAnalysis === 'number' && Number.isFinite(fromAnalysis) && fromAnalysis > 0) {
    return fromAnalysis
  }

  const rent = asset.expectedMonthlyRent
  if (!rent || asset.askingPrice <= 0) {
    return null
  }

  return Number((((rent * 12) / asset.askingPrice) * 100).toFixed(2))
}

const estimateMonthlyRent = (asset: OpportunityWorkspaceItem): number => {
  const direct = asset.expectedMonthlyRent
  if (typeof direct === 'number' && Number.isFinite(direct) && direct > 0) {
    return direct
  }

  const fromAnalysis = asset.analysis?.rentalYieldEstimate?.monthly
  if (typeof fromAnalysis === 'number' && Number.isFinite(fromAnalysis) && fromAnalysis > 0) {
    return fromAnalysis
  }

  const yieldPct = asset.analysis?.rentalYieldEstimate?.percentage
  if (typeof yieldPct === 'number' && Number.isFinite(yieldPct) && yieldPct > 0 && asset.askingPrice > 0) {
    return Number(((asset.askingPrice * (yieldPct / 100)) / 12).toFixed(0))
  }

  return 0
}

const estimateRoi = (asset: OpportunityWorkspaceItem, yieldPercentage: number | null): number | null => {
  const appreciation = asset.analysis?.appreciationPotential?.oneYear
  if (typeof appreciation === 'number' && Number.isFinite(appreciation) && yieldPercentage !== null) {
    return Number((appreciation + yieldPercentage).toFixed(2))
  }

  return null
}

const buildAllocation = (assets: PortfolioAsset[], key: 'country' | 'city' | 'propertyType') => {
  const totals = assets.reduce<Record<string, number>>((acc, asset) => {
    const label = key === 'propertyType'
      ? asset.property.propertyType.replace('-', ' ')
      : asset.property[key]

    const normalized = label.trim().length > 0 ? label : 'Unknown'
    acc[normalized] = (acc[normalized] ?? 0) + asset.askingPrice
    return acc
  }, {})

  return Object.entries(totals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
}

const startOfMonth = (year: number, month: number) => new Date(year, month, 1)

export function PortfolioDashboard() {
  const { organization } = useAuth()
  const [items, setItems] = useState<OpportunityWorkspaceItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadPortfolio = async () => {
      setIsLoading(true)
      try {
        const result = await opportunityWorkspaceService.getMyOpportunities({
          organizationId: organization?.id,
        })
        setItems(result.items)
      } catch (error) {
        console.error('Failed to load portfolio assets', error)
        setItems([])
      } finally {
        setIsLoading(false)
      }
    }

    void loadPortfolio()
  }, [organization?.id])

  const assets = useMemo<PortfolioAsset[]>(() => {
    return items
      .filter((item) => PORTFOLIO_STAGES.has(normalizeStage(String(item.stage))))
      .map((item) => {
        const normalizedStage = normalizeStage(String(item.stage))
        const monthlyRent = estimateMonthlyRent(item)
        const yieldPercentage = estimateYield(item)
        const roiPercentage = estimateRoi(item, yieldPercentage)

        const reviewReasons: string[] = []
        if (!item.analysis) {
          reviewReasons.push('Missing analysis')
        }
        if (monthlyRent <= 0) {
          reviewReasons.push('Missing rental income')
        }
        if (yieldPercentage !== null && yieldPercentage < 3.5) {
          reviewReasons.push('Low rental yield')
        }

        const performanceScore = (yieldPercentage ?? 0) + (roiPercentage ?? 0)

        return {
          ...item,
          normalizedStage,
          monthlyRent,
          yieldPercentage,
          roiPercentage,
          performanceScore,
          reviewReasons,
        }
      })
  }, [items])

  const metrics = useMemo(() => {
    const ownedProperties = assets.length
    const totalPortfolioValue = assets.reduce((sum, asset) => sum + asset.askingPrice, 0)
    const monthlyRentalIncome = assets.reduce((sum, asset) => sum + asset.monthlyRent, 0)

    const yieldValues = assets
      .map((asset) => asset.yieldPercentage)
      .filter((value): value is number => typeof value === 'number')
    const averagePortfolioYield = yieldValues.length > 0
      ? yieldValues.reduce((sum, value) => sum + value, 0) / yieldValues.length
      : 0

    const roiValues = assets
      .map((asset) => asset.roiPercentage)
      .filter((value): value is number => typeof value === 'number')
    const averageRoi = roiValues.length > 0
      ? roiValues.reduce((sum, value) => sum + value, 0) / roiValues.length
      : 0

    const totalAnnualCashflow = monthlyRentalIncome * 12

    return {
      ownedProperties,
      totalPortfolioValue,
      monthlyRentalIncome,
      averagePortfolioYield: Number(averagePortfolioYield.toFixed(2)),
      totalAnnualCashflow,
      averageRoi: Number(averageRoi.toFixed(2)),
    }
  }, [assets])

  const portfolioValueOverTime = useMemo(() => {
    if (assets.length === 0) {
      return []
    }

    const monthlyPurchases = assets.reduce<Record<string, number>>((acc, asset) => {
      const key = toMonthKey(asset.createdAt)
      acc[key] = (acc[key] ?? 0) + asset.askingPrice
      return acc
    }, {})

    let runningTotal = 0
    return Object.entries(monthlyPurchases)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, monthlyValue]) => {
        runningTotal += monthlyValue
        return {
          month: toMonthLabel(month),
          value: runningTotal,
        }
      })
  }, [assets])

  const monthlyCashflow = useMemo(() => {
    if (assets.length === 0) {
      return []
    }

    const now = new Date()
    const months = Array.from({ length: 12 }, (_, index) => {
      const base = startOfMonth(now.getFullYear(), now.getMonth() - (11 - index))
      return {
        key: `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`,
        date: base,
      }
    })

    return months.map(({ key, date }) => {
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      const activeIncome = assets
        .filter((asset) => new Date(asset.createdAt).getTime() <= monthEnd.getTime())
        .reduce((sum, asset) => sum + asset.monthlyRent, 0)

      return {
        month: toMonthLabel(key),
        cashflow: Number(activeIncome.toFixed(0)),
      }
    })
  }, [assets])

  const yieldDistribution = useMemo(() => {
    const buckets = [
      { bucket: '<3%', min: 0, max: 3, count: 0 },
      { bucket: '3-5%', min: 3, max: 5, count: 0 },
      { bucket: '5-7%', min: 5, max: 7, count: 0 },
      { bucket: '7-9%', min: 7, max: 9, count: 0 },
      { bucket: '9%+', min: 9, max: Number.POSITIVE_INFINITY, count: 0 },
    ]

    assets.forEach((asset) => {
      if (asset.yieldPercentage === null) {
        return
      }

      const target = buckets.find((bucket) => asset.yieldPercentage! >= bucket.min && asset.yieldPercentage! < bucket.max)
      if (target) {
        target.count += 1
      }
    })

    return buckets.map(({ bucket, count }) => ({ bucket, count }))
  }, [assets])

  const allocationByCountry = useMemo(() => buildAllocation(assets, 'country'), [assets])
  const allocationByCity = useMemo(() => buildAllocation(assets, 'city'), [assets])
  const allocationByType = useMemo(() => buildAllocation(assets, 'propertyType'), [assets])

  const topPerformingAssets = useMemo(() => {
    return [...assets]
      .filter((asset) => asset.performanceScore > 0)
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 5)
  }, [assets])

  const underperformingAssets = useMemo(() => {
    return [...assets]
      .filter((asset) => asset.yieldPercentage !== null)
      .sort((a, b) => (a.yieldPercentage ?? 0) - (b.yieldPercentage ?? 0))
      .slice(0, 5)
  }, [assets])

  const assetsNeedingReview = useMemo(() => {
    return assets
      .filter((asset) => asset.reviewReasons.length > 0)
      .sort((a, b) => b.reviewReasons.length - a.reviewReasons.length)
      .slice(0, 8)
  }, [assets])

  if (!isLoading && assets.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Portfolio Dashboard</h1>
          <p className="mt-2 text-sm sm:text-base text-foreground/70">Owned and acquired property performance</p>
        </div>

        <Card className="border-dashed p-10 text-center">
          <h2 className="font-display text-2xl font-semibold">No owned assets yet</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            No owned assets yet. Move an opportunity to Purchased to start portfolio tracking.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Portfolio Dashboard</h1>
        <p className="mt-2 text-sm sm:text-base text-foreground/70">Owned and acquired property performance</p>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Owned Properties"
          value={metrics.ownedProperties}
          icon={<Buildings className="h-5 w-5 sm:h-6 sm:w-6" weight="duotone" />}
        />
        <MetricCard
          title="Total Portfolio Value"
          value={formatCurrency(metrics.totalPortfolioValue)}
          icon={<Wallet className="h-5 w-5 sm:h-6 sm:w-6" weight="duotone" />}
        />
        <MetricCard
          title="Monthly Rental Income"
          value={formatCurrency(metrics.monthlyRentalIncome)}
          icon={<Coins className="h-5 w-5 sm:h-6 sm:w-6" weight="duotone" />}
        />
        <MetricCard
          title="Average Portfolio Yield"
          value={formatPercentage(metrics.averagePortfolioYield, 2)}
          icon={<TrendUp className="h-5 w-5 sm:h-6 sm:w-6" weight="duotone" />}
        />
        <MetricCard
          title="Total Annual Cashflow"
          value={formatCurrency(metrics.totalAnnualCashflow)}
          icon={<ChartPieSlice className="h-5 w-5 sm:h-6 sm:w-6" weight="duotone" />}
        />
        <MetricCard
          title="Average ROI"
          value={formatPercentage(metrics.averageRoi, 2)}
          icon={<TrendUp className="h-5 w-5 sm:h-6 sm:w-6" weight="duotone" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-4 sm:p-6">
          <h2 className="font-display text-xl sm:text-2xl font-bold">Portfolio Value Over Time</h2>
          <p className="mt-1 text-sm text-muted-foreground">Cumulative value of purchased and owned assets</p>
          <div className="mt-4 h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={portfolioValueOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.03 260)" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${formatCompactNumber(value)}`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line type="monotone" dataKey="value" stroke="oklch(0.65 0.18 145)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <h2 className="font-display text-xl sm:text-2xl font-bold">Monthly Cashflow</h2>
          <p className="mt-1 text-sm text-muted-foreground">Portfolio rental income trend across the last 12 months</p>
          <div className="mt-4 h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyCashflow}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.03 260)" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${formatCompactNumber(value)}`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="cashflow" fill="oklch(0.75 0.15 195)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-4 sm:p-6">
          <h2 className="font-display text-lg font-bold">Allocation by Country</h2>
          <div className="mt-4 h-[270px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={allocationByCountry} dataKey="value" nameKey="name" outerRadius={90} label>
                  {allocationByCountry.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <h2 className="font-display text-lg font-bold">Allocation by City</h2>
          <div className="mt-4 h-[270px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={allocationByCity} dataKey="value" nameKey="name" outerRadius={90} label>
                  {allocationByCity.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <h2 className="font-display text-lg font-bold">Allocation by Property Type</h2>
          <div className="mt-4 h-[270px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={allocationByType} dataKey="value" nameKey="name" outerRadius={90} label>
                  {allocationByType.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-4 sm:p-6">
        <h2 className="font-display text-xl sm:text-2xl font-bold">Yield Distribution</h2>
        <div className="mt-4 h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yieldDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.03 260)" />
              <XAxis dataKey="bucket" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value: number) => `${value} assets`} />
              <Bar dataKey="count" fill="oklch(0.65 0.15 270)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-4 sm:p-6">
          <h2 className="font-display text-lg font-bold">Top Performing Owned Assets</h2>
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Yield</TableHead>
                <TableHead>ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topPerformingAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="max-w-[220px] truncate">{asset.property.title}</TableCell>
                  <TableCell>{asset.yieldPercentage !== null ? formatPercentage(asset.yieldPercentage, 2) : 'N/A'}</TableCell>
                  <TableCell>{asset.roiPercentage !== null ? formatPercentage(asset.roiPercentage, 2) : 'N/A'}</TableCell>
                </TableRow>
              ))}
              {topPerformingAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">No performance data available yet.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-4 sm:p-6">
          <h2 className="font-display text-lg font-bold">Underperforming Owned Assets</h2>
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Yield</TableHead>
                <TableHead>Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {underperformingAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="max-w-[220px] truncate">{asset.property.title}</TableCell>
                  <TableCell>{asset.yieldPercentage !== null ? formatPercentage(asset.yieldPercentage, 2) : 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{STAGE_LABELS[asset.normalizedStage] ?? asset.stage}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {underperformingAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">No underperforming assets detected.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-4 sm:p-6">
          <h2 className="font-display text-lg font-bold">Assets Needing Review</h2>
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Issue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assetsNeedingReview.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="max-w-[180px] truncate">{asset.property.title}</TableCell>
                  <TableCell className="max-w-[230px] truncate">{asset.reviewReasons.join(', ')}</TableCell>
                </TableRow>
              ))}
              {assetsNeedingReview.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground">No owned assets need attention right now.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  )
}