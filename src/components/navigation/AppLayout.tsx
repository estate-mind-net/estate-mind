import { List } from '@phosphor-icons/react'
import { useEffect, useState, type ReactNode } from 'react'
import { Sidebar } from '@/components/navigation/Sidebar'
import { MobileSidebar } from '@/components/navigation/MobileSidebar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: ReactNode
}

const SIDEBAR_STORAGE_KEY = 'estatemind:sidebar-collapsed'

export function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const persisted = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (persisted !== null) {
      setCollapsed(persisted === 'true')
    }
  }, [])

  const toggleCollapse = () => {
    setCollapsed((current) => {
      const next = !current
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className={cn('hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:block md:transition-[width] md:duration-200', collapsed ? 'md:w-20' : 'md:w-72')}>
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </div>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/70 bg-card/90 px-4 py-3 backdrop-blur-sm md:hidden">
        <Button type="button" variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu">
          <List className="h-5 w-5" />
        </Button>
        <p className="font-display text-base font-semibold tracking-tight">EstateMind</p>
        <span className="h-8 w-8" aria-hidden="true" />
      </header>

      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className={cn('transition-[padding] duration-200', collapsed ? 'md:pl-20' : 'md:pl-72')}>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </div>
      </main>
    </div>
  )
}
