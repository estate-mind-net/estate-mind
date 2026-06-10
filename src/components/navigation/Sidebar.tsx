import { Brain, CaretDoubleLeft, CaretDoubleRight } from '@phosphor-icons/react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { navigationItems, navigationSections } from '@/components/navigation/navConfig'
import { SidebarNavItem } from '@/components/navigation/SidebarNavItem'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const initials = (name?: string | null, email?: string) => {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(' ')
    return parts.slice(0, 2).map((value) => value[0]?.toUpperCase()).join('')
  }

  return (email ?? 'U').slice(0, 2).toUpperCase()
}

const isItemActive = (pathname: string, itemPath: string, exact?: boolean) => {
  if (exact) {
    return pathname === itemPath
  }

  if (itemPath === '/dashboard') {
    return pathname === '/dashboard'
  }

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`)
}

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  className?: string
  onNavigate?: () => void
  showCollapseToggle?: boolean
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  className,
  onNavigate,
  showCollapseToggle = true,
}: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()

  const activeKey = useMemo(() => {
    const routeItems = navigationItems.filter((item) => Boolean(item.to))
    const exactItem = routeItems.find((item) => item.exact && location.pathname === item.to)
    if (exactItem) {
      return exactItem.key
    }

    const prefixMatches = routeItems
      .filter((item) => item.to && !item.exact && isItemActive(location.pathname, item.to, false))
      .sort((left, right) => right.to.length - left.to.length)

    return prefixMatches[0]?.key
  }, [location.pathname])

  const handleLogout = async () => {
    onNavigate?.()
    navigate('/', { replace: true })
    await signOut()
  }

  const handleItemAction = async (action?: 'logout') => {
    if (action === 'logout') {
      await handleLogout()
    }
  }

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border/80 bg-card/90 backdrop-blur-sm',
        className
      )}
      aria-label="Primary navigation"
    >
      <div className={cn('flex items-center border-b border-border/70 px-3 py-3', collapsed ? 'justify-center' : 'justify-between')}>
        <Link to="/dashboard" className={cn('flex items-center gap-2 overflow-hidden', collapsed && 'hidden')} onClick={onNavigate}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/30 ring-1 ring-border">
            <Brain className="h-5 w-5 text-foreground" weight="duotone" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">EstateMind</span>
        </Link>

        {collapsed ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/30 ring-1 ring-border">
            <Brain className="h-5 w-5 text-foreground" weight="duotone" />
          </span>
        ) : null}

        {showCollapseToggle ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="h-9 w-9"
          >
            {collapsed ? <CaretDoubleRight className="h-4 w-4" /> : <CaretDoubleLeft className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Workspace navigation">
        {navigationSections.map((section, index) => (
          <div key={section.key} className={cn(index > 0 && 'mt-5 pt-4', index > 0 && 'border-t border-border/60')}>
            <p className={cn('mb-2 px-3 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground/90', collapsed && 'sr-only')}>
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <SidebarNavItem
                  key={item.key}
                  item={item}
                  collapsed={collapsed}
                  isActive={item.key === activeKey}
                  onNavigate={onNavigate}
                  onAction={(selectedItem) => {
                    void handleItemAction(selectedItem.action)
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border/70 p-3">
        <div className={cn('mb-3 flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-accent/20 text-accent">
              {initials(profile?.full_name, user?.email)}
            </AvatarFallback>
          </Avatar>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{profile?.full_name ?? 'EstateMind Investor'}</p>
              <p className="truncate text-xs text-muted-foreground">{profile?.email ?? user?.email}</p>
            </div>
          ) : null}
        </div>
        <Separator />
      </div>
    </aside>
  )
}
