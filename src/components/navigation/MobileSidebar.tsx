import { X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/navigation/Sidebar'
import { cn } from '@/lib/utils'

interface MobileSidebarProps {
  open: boolean
  onClose: () => void
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation drawer">
      <button
        type="button"
        aria-label="Close navigation drawer"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className={cn('absolute inset-y-0 left-0 w-72 max-w-[88vw] transform border-r border-border bg-card shadow-2xl transition-transform duration-200 ease-out', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-end border-b border-border/70 px-3 py-2">
          <Button type="button" variant="ghost" size="icon" aria-label="Close sidebar" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <Sidebar
          collapsed={false}
          onToggleCollapse={onClose}
          onNavigate={onClose}
          showCollapseToggle={false}
          className="h-[calc(100%-53px)] border-r-0"
        />
      </div>
    </div>
  )
}
