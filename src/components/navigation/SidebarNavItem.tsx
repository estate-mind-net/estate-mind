import { Link } from 'react-router-dom'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { NavItemConfig } from '@/components/navigation/navConfig'

interface SidebarNavItemProps {
  item: NavItemConfig
  isActive: boolean
  collapsed: boolean
  onNavigate?: () => void
  onAction?: (item: NavItemConfig) => void
}

export function SidebarNavItem({ item, isActive, collapsed, onNavigate, onAction }: SidebarNavItemProps) {
  const iconClassName = cn('h-5 w-5 shrink-0', isActive ? 'text-foreground' : 'text-muted-foreground')
  const content = (
    <span
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-accent text-foreground shadow-sm ring-1 ring-border'
          : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground',
        collapsed && 'justify-center px-2',
        item.disabled && 'cursor-not-allowed opacity-60'
      )}
      aria-disabled={item.disabled}
    >
      <item.icon className={iconClassName} weight={isActive ? 'fill' : 'regular'} />
      <span className={cn('truncate', collapsed && 'sr-only')}>{item.label}</span>
    </span>
  )

  const body = item.disabled ? (
    <button type="button" className="w-full text-left" disabled aria-label={item.label}>
      {content}
    </button>
  ) : item.to ? (
    <Link to={item.to} className="block" onClick={onNavigate}>
      {content}
    </Link>
  ) : (
    <button
      type="button"
      className="block w-full text-left"
      onClick={() => {
        onAction?.(item)
        onNavigate?.()
      }}
      aria-label={item.label}
    >
      {content}
    </button>
  )

  if (!collapsed) {
    return body
  }

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>{body}</TooltipTrigger>
        <TooltipContent side="right">
          {item.disabled && item.disabledReason ? `${item.label} (${item.disabledReason})` : item.label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
