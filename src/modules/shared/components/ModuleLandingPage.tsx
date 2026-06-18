import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ModuleConfig } from '@/modules/shared/types/module'

interface ModuleLandingPageProps {
  module: ModuleConfig
  coreQuestion: string
  actionLabel?: string
}

export function ModuleLandingPage({ module, coreQuestion, actionLabel = 'Get Started' }: ModuleLandingPageProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{module.label}</h1>
          <Badge variant="secondary" className="text-xs">Coming soon</Badge>
        </div>
        <p className="text-base sm:text-lg text-foreground/70">{module.description}</p>
      </div>

      <Card className="p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <h2 className="font-display text-xl font-semibold">Core Question</h2>
          <p className="text-foreground/80 text-lg italic">&ldquo;{coreQuestion}&rdquo;</p>
        </div>

        <div className="border-t pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            This module is being built. You'll be able to use it soon.
          </p>
          <Button disabled className="bg-accent text-accent-foreground">
            {actionLabel}
          </Button>
        </div>
      </Card>
    </div>
  )
}