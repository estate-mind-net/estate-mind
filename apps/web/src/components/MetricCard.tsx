import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function MetricCard({ title, value, subtitle, icon, trend, className }: MetricCardProps) {
  return (
    <div className={cn(
      'rounded-xl border border-border bg-card p-4 sm:p-6 transition-all hover:border-accent/50',
      className
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold tracking-tight truncate">{value}</p>
          {subtitle && (
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              'mt-1 sm:mt-2 inline-flex items-center gap-1 text-xs sm:text-sm font-medium',
              trend.isPositive ? 'text-success' : 'text-destructive'
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-primary/10 p-2 sm:p-3 text-accent flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
