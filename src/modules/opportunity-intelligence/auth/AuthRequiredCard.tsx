import { ShieldCheck } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'

interface AuthRequiredCardProps {
  message?: string
}

export function AuthRequiredCard({ message }: AuthRequiredCardProps) {
  return (
    <Card className="border-dashed p-10 text-center space-y-3">
      <ShieldCheck className="h-8 w-8 mx-auto text-foreground/30" />
      <div>
        <p className="font-display font-semibold">Authentication Required</p>
        <p className="text-sm text-muted-foreground mt-1">
          {message ?? 'You must be signed in with an active organization to manage workspace data.'}
        </p>
      </div>
    </Card>
  )
}
