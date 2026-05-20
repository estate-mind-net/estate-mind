import { useState } from 'react'
import { ArrowUp, ArrowDown, TrendUp, Buildings, Wallet, ChartLine, Target, Calendar } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface PortfolioAnalyticsProps {
  onBack: () => void
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL'

const performanceData = [
  { month: 'Jan', value: 245000, yield: 4.2, appreciation: 0.5 },
  { month: 'Feb', value: 248000, yield: 4.3, appreciation: 1.2 },
  { month: 'Mar', value: 252000, yield: 4.4, appreciation: 2.9 },
  { month: 'Apr', value: 258000, yield: 4.5, appreciation: 5.3 },
  { month: 'May', value: 265000, yield: 4.6, appreciation: 8.2 },
  { month: 'Jun', value: 272000, yield: 4.7, appreciation: 11.0 },
  { month: 'Jul', value: 278000, yield: 4.8, appreciation: 13.5 },
  { month: 'Aug', value: 285000, yield: 4.9, appreciation: 16.3 },
  { month: 'Sep', value: 292000, yield: 5.0, appreciation: 19.2 },
  { month: 'Oct', value: 298000, yield: 5.1, appreciation: 21.6 },
  { month: 'Nov', value: 305000, yield: 5.2, appreciation: 24.5 },
  { month: 'Dec', value: 312000, yield: 5.3, appreciation: 27.3 }
]

const cashFlowData = [
  { month: 'Jan', income: 8500, expenses: 3200, net: 5300 },
  { month: 'Feb', income: 8700, expenses: 3400, net: 5300 },
  { month: 'Mar', income: 9200, expenses: 3500, net: 5700 },
  { month: 'Apr', income: 9500, expenses: 3300, net: 6200 },
  { month: 'May', income: 10200, expenses: 3600, net: 6600 },
  { month: 'Jun', income: 11500, expenses: 3800, net: 7700 },
  { month: 'Jul', income: 12800, expenses: 4200, net: 8600 },
  { month: 'Aug', income: 13200, expenses: 4100, net: 9100 },
  { month: 'Sep', income: 11800, expenses: 3900, net: 7900 },
  { month: 'Oct', income: 10200, expenses: 3500, net: 6700 },
  { month: 'Nov', income: 9800, expenses: 3400, net: 6400 },
  { month: 'Dec', income: 10500, expenses: 3600, net: 6900 }
]

const portfolioComposition = [
  { name: 'Lisbon Apartments', value: 850000, percentage: 27.2, color: 'oklch(0.75 0.15 195)' },
  { name: 'Athens Villas', value: 680000, percentage: 21.8, color: 'oklch(0.65 0.18 145)' },
  { name: 'Barcelona Properties', value: 520000, percentage: 16.7, color: 'oklch(0.35 0.15 270)' },
  { name: 'Dubrovnik Luxury', value: 720000, percentage: 23.1, color: 'oklch(0.75 0.15 75)' },
  { name: 'Other Investments', value: 350000, percentage: 11.2, color: 'oklch(0.60 0.22 25)' }
]

const propertyTypeDistribution = [
  { name: 'Apartments', value: 45, color: 'oklch(0.75 0.15 195)' },
  { name: 'Villas', value: 25, color: 'oklch(0.65 0.18 145)' },
  { name: 'Mixed-Use', value: 20, color: 'oklch(0.35 0.15 270)' },
  { name: 'Commercial', value: 10, color: 'oklch(0.75 0.15 75)' }
]

const yieldComparison = [
  { property: 'Lisbon #1', rental: 5.3, airbnb: 7.8, target: 6.0 },
  { property: 'Athens Villa', rental: 4.7, airbnb: 8.2, target: 6.5 },
  { property: 'Barcelona #1', rental: 4.2, airbnb: 6.5, target: 5.5 },
  { property: 'Dubrovnik PH', rental: 3.8, airbnb: 9.2, target: 7.0 },
  { property: 'Porto Apt', rental: 5.8, airbnb: 8.5, target: 6.5 }
]

export function PortfolioAnalytics({ onBack }: PortfolioAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y')

  const totalValue = 3120000
  const totalAppreciation = 27.3
  const averageYield = 5.3
  const totalProperties = 12
  const annualIncome = 126500
  const annualExpenses = 43200

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2">
            ← Back to Dashboard
          </Button>
          <h1 className="font-display text-4xl font-bold tracking-tight">Portfolio Analytics</h1>
          <p className="mt-2 text-foreground/70">Comprehensive performance metrics and insights</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1M">1 Month</SelectItem>
              <SelectItem value="3M">3 Months</SelectItem>
              <SelectItem value="6M">6 Months</SelectItem>
              <SelectItem value="1Y">1 Year</SelectItem>
              <SelectItem value="ALL">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
              <p className="mt-2 font-display text-3xl font-bold">€{(totalValue / 1000000).toFixed(2)}M</p>
              <div className="mt-2 flex items-center gap-1 text-sm text-success">
                <ArrowUp weight="bold" className="h-4 w-4" />
                <span className="font-semibold">+{totalAppreciation}%</span>
                <span className="text-muted-foreground">this year</span>
              </div>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <Wallet className="h-6 w-6 text-accent" weight="duotone" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Average Yield</p>
              <p className="mt-2 font-display text-3xl font-bold">{averageYield}%</p>
              <div className="mt-2 flex items-center gap-1 text-sm text-success">
                <ArrowUp weight="bold" className="h-4 w-4" />
                <span className="font-semibold">+0.8%</span>
                <span className="text-muted-foreground">vs target</span>
              </div>
            </div>
            <div className="rounded-lg bg-success/10 p-3">
              <TrendUp className="h-6 w-6 text-success" weight="duotone" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Annual Net Income</p>
              <p className="mt-2 font-display text-3xl font-bold">€{(annualIncome / 1000).toFixed(0)}K</p>
              <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                <span>€{(annualExpenses / 1000).toFixed(0)}K expenses</span>
              </div>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <ChartLine className="h-6 w-6 text-primary" weight="duotone" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Properties</p>
              <p className="mt-2 font-display text-3xl font-bold">{totalProperties}</p>
              <div className="mt-2 flex items-center gap-1 text-sm text-success">
                <span className="font-semibold">+2</span>
                <span className="text-muted-foreground">this quarter</span>
              </div>
            </div>
            <div className="rounded-lg bg-warning/10 p-3">
              <Buildings className="h-6 w-6 text-warning" weight="duotone" />
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="composition">Composition</TabsTrigger>
          <TabsTrigger value="yields">Yields</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <Card className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold">Portfolio Value Growth</h2>
                <p className="mt-1 text-sm text-muted-foreground">Year-over-year appreciation trend</p>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Jan - Dec 2024</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.75 0.15 195)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.75 0.15 195)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.03 260)" />
                <XAxis 
                  dataKey="month" 
                  stroke="oklch(0.60 0.02 260)" 
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="oklch(0.60 0.02 260)" 
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(0.18 0.02 260)',
                    border: '1px solid oklch(0.25 0.03 260)',
                    borderRadius: '8px',
                    color: 'oklch(0.98 0 0)'
                  }}
                  formatter={(value: number) => [`€${value.toLocaleString()}`, 'Portfolio Value']}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="oklch(0.75 0.15 195)" 
                  strokeWidth={2}
                  fill="url(#valueGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h3 className="mb-4 font-display text-xl font-bold">Appreciation Rate</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.03 260)" />
                  <XAxis dataKey="month" stroke="oklch(0.60 0.02 260)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="oklch(0.60 0.02 260)" style={{ fontSize: '12px' }} tickFormatter={(value) => `${value}%`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.18 0.02 260)',
                      border: '1px solid oklch(0.25 0.03 260)',
                      borderRadius: '8px',
                      color: 'oklch(0.98 0 0)'
                    }}
                    formatter={(value: number) => [`${value}%`, 'Appreciation']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="appreciation" 
                    stroke="oklch(0.65 0.18 145)" 
                    strokeWidth={3}
                    dot={{ fill: 'oklch(0.65 0.18 145)', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="mb-4 font-display text-xl font-bold">Average Yield Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.03 260)" />
                  <XAxis dataKey="month" stroke="oklch(0.60 0.02 260)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="oklch(0.60 0.02 260)" style={{ fontSize: '12px' }} tickFormatter={(value) => `${value}%`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.18 0.02 260)',
                      border: '1px solid oklch(0.25 0.03 260)',
                      borderRadius: '8px',
                      color: 'oklch(0.98 0 0)'
                    }}
                    formatter={(value: number) => [`${value}%`, 'Yield']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="yield" 
                    stroke="oklch(0.75 0.15 195)" 
                    strokeWidth={3}
                    dot={{ fill: 'oklch(0.75 0.15 195)', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-6">
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold">Monthly Cash Flow Analysis</h2>
              <p className="mt-1 text-sm text-muted-foreground">Income, expenses, and net cash flow trends</p>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.03 260)" />
                <XAxis dataKey="month" stroke="oklch(0.60 0.02 260)" style={{ fontSize: '12px' }} />
                <YAxis stroke="oklch(0.60 0.02 260)" style={{ fontSize: '12px' }} tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(0.18 0.02 260)',
                    border: '1px solid oklch(0.25 0.03 260)',
                    borderRadius: '8px',
                    color: 'oklch(0.98 0 0)'
                  }}
                  formatter={(value: number) => [`€${value.toLocaleString()}`, '']}
                />
                <Legend />
                <Bar dataKey="income" fill="oklch(0.65 0.18 145)" name="Income" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="oklch(0.60 0.22 25)" name="Expenses" radius={[4, 4, 0, 0]} />
                <Bar dataKey="net" fill="oklch(0.75 0.15 195)" name="Net Cash Flow" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">Total Income</h3>
                <TrendUp className="h-5 w-5 text-success" weight="duotone" />
              </div>
              <p className="font-display text-3xl font-bold text-success">€{annualIncome.toLocaleString()}</p>
              <p className="mt-2 text-sm text-muted-foreground">Annual rental revenue</p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Long-term rental</span>
                  <span className="font-semibold">€85,200</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Airbnb income</span>
                  <span className="font-semibold">€41,300</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">Total Expenses</h3>
                <ArrowDown className="h-5 w-5 text-destructive" weight="duotone" />
              </div>
              <p className="font-display text-3xl font-bold text-destructive">€{annualExpenses.toLocaleString()}</p>
              <p className="mt-2 text-sm text-muted-foreground">Annual operating costs</p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Property management</span>
                  <span className="font-semibold">€18,500</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Maintenance & repairs</span>
                  <span className="font-semibold">€24,700</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">Net Cash Flow</h3>
                <ChartLine className="h-5 w-5 text-accent" weight="duotone" />
              </div>
              <p className="font-display text-3xl font-bold text-accent">€{(annualIncome - annualExpenses).toLocaleString()}</p>
              <p className="mt-2 text-sm text-muted-foreground">Annual net profit</p>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Profit margin</span>
                  <span className="font-semibold text-success">{((annualIncome - annualExpenses) / annualIncome * 100).toFixed(1)}%</span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="composition" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h2 className="mb-6 font-display text-2xl font-bold">Portfolio by Location</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={portfolioComposition}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {portfolioComposition.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.18 0.02 260)',
                      border: '1px solid oklch(0.25 0.03 260)',
                      borderRadius: '8px',
                      color: 'oklch(0.98 0 0)'
                    }}
                    formatter={(value: number) => [`€${value.toLocaleString()}`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-6 space-y-3">
                {portfolioComposition.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">€{(item.value / 1000).toFixed(0)}K</p>
                      <p className="text-xs text-muted-foreground">{item.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-6 font-display text-2xl font-bold">Property Type Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={propertyTypeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ value }) => `${value}%`}
                  >
                    {propertyTypeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.18 0.02 260)',
                      border: '1px solid oklch(0.25 0.03 260)',
                      borderRadius: '8px',
                      color: 'oklch(0.98 0 0)'
                    }}
                    formatter={(value: number) => [`${value}%`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-6 space-y-3">
                {propertyTypeDistribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{item.value}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="mb-6 font-display text-2xl font-bold">Geographic Distribution</h2>
            <div className="space-y-4">
              {portfolioComposition.map((location) => (
                <div key={location.name}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{location.name}</span>
                    <span className="text-muted-foreground">{location.percentage}% • €{(location.value / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${location.percentage}%`,
                        backgroundColor: location.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="yields" className="space-y-6">
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold">Yield Comparison by Property</h2>
              <p className="mt-1 text-sm text-muted-foreground">Rental vs Airbnb performance against target yields</p>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={yieldComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.03 260)" />
                <XAxis dataKey="property" stroke="oklch(0.60 0.02 260)" style={{ fontSize: '12px' }} />
                <YAxis stroke="oklch(0.60 0.02 260)" style={{ fontSize: '12px' }} tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(0.18 0.02 260)',
                    border: '1px solid oklch(0.25 0.03 260)',
                    borderRadius: '8px',
                    color: 'oklch(0.98 0 0)'
                  }}
                  formatter={(value: number) => [`${value}%`, '']}
                />
                <Legend />
                <Bar dataKey="rental" fill="oklch(0.35 0.15 270)" name="Long-term Rental" radius={[4, 4, 0, 0]} />
                <Bar dataKey="airbnb" fill="oklch(0.75 0.15 195)" name="Airbnb Potential" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" fill="oklch(0.75 0.15 75)" name="Target Yield" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">Top Performer</h3>
                <Target className="h-5 w-5 text-success" weight="duotone" />
              </div>
              <p className="font-display text-2xl font-bold">Dubrovnik PH</p>
              <p className="mt-1 text-sm text-muted-foreground">Airbnb yield</p>
              <p className="mt-3 font-display text-3xl font-bold text-success">9.2%</p>
              <p className="mt-2 text-sm text-muted-foreground">31% above target</p>
            </Card>

            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">Most Consistent</h3>
                <ChartLine className="h-5 w-5 text-accent" weight="duotone" />
              </div>
              <p className="font-display text-2xl font-bold">Lisbon #1</p>
              <p className="mt-1 text-sm text-muted-foreground">Long-term rental</p>
              <p className="mt-3 font-display text-3xl font-bold text-accent">5.3%</p>
              <p className="mt-2 text-sm text-muted-foreground">Low vacancy, stable</p>
            </Card>

            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">Improvement Target</h3>
                <TrendUp className="h-5 w-5 text-warning" weight="duotone" />
              </div>
              <p className="font-display text-2xl font-bold">Barcelona #1</p>
              <p className="mt-1 text-sm text-muted-foreground">Below target</p>
              <p className="mt-3 font-display text-3xl font-bold text-warning">4.2%</p>
              <p className="mt-2 text-sm text-muted-foreground">Consider Airbnb pivot</p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
