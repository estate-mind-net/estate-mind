import { cn } from '@/lib/utils'

interface ScoreGaugeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function ScoreGauge({ score, size = 'md', showLabel = true, className }: ScoreGaugeProps) {
  const getColor = (value: number) => {
    if (value >= 80) return 'text-success'
    if (value >= 60) return 'text-warning'
    return 'text-destructive'
  }

  const sizes = {
    sm: 'h-16 w-16 text-lg',
    md: 'h-24 w-24 text-2xl',
    lg: 'h-32 w-32 text-4xl'
  }

  const strokeWidth = size === 'sm' ? 6 : size === 'md' ? 8 : 10
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className={cn('relative', sizes[size])}>
        <svg className="h-full w-full -rotate-90 transform">
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-border"
          />
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn('transition-all duration-1000', getColor(score))}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold', getColor(score))}>{score}</span>
        </div>
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-muted-foreground">Score</span>
      )}
    </div>
  )
}
