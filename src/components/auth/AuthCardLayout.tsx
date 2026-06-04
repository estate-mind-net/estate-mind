import type { ReactNode } from 'react'
import { Brain } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'

interface AuthCardLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
}

export function AuthCardLayout({ title, subtitle, children }: AuthCardLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(20,184,166,0.18),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.16),transparent_36%),linear-gradient(120deg,rgba(15,23,42,0.96),rgba(7,12,28,0.98))]" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
        <Card className="w-full max-w-md border-white/15 bg-slate-950/75 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/15">
              <Brain className="h-6 w-6 text-cyan-200" weight="duotone" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">{title}</h1>
            <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
          </div>

          {children}
        </Card>
      </div>
    </div>
  )
}
