import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'

export function SettingsPage() {
  const { profile, organization } = useAuth()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-2 text-muted-foreground">Account and organization foundation details</p>
      </div>

      <Card className="p-6">
        <h2 className="font-display text-xl font-semibold">Profile</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Full Name</p>
            <p className="mt-1 font-medium">{profile?.full_name ?? 'Not set'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
            <p className="mt-1 font-medium">{profile?.email ?? 'Not set'}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-xl font-semibold">Organization</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Name</p>
            <p className="mt-1 font-medium">{organization?.name ?? 'Not provisioned yet'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Subscription Tier</p>
            <Badge variant="outline" className="mt-1">
              {organization?.subscription_tier ?? 'starter'}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  )
}
