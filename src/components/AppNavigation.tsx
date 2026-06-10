import { Brain, SignOut } from '@phosphor-icons/react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'

const initials = (name?: string | null, email?: string) => {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(' ')
    return parts.slice(0, 2).map((value) => value[0]?.toUpperCase()).join('')
  }

  return (email ?? 'U').slice(0, 2).toUpperCase()
}

export function AppNavigation() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()

  const handleLogout = async () => {
    navigate('/', { replace: true })
    await signOut()
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/70 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20">
            <Brain className="h-5 w-5 text-accent" weight="duotone" />
          </div>
          <span className="font-display text-xl font-bold">EstateMind</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-2 sm:gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar>
                    <AvatarFallback className="bg-accent/20 text-accent">
                      {initials(profile?.full_name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <p className="font-medium">{profile?.full_name ?? 'EstateMind Investor'}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email ?? user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  Open Workspace
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} variant="destructive">
                  <SignOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/login">Login</Link></Button>
            <Button asChild size="sm"><Link to="/register">Register</Link></Button>
          </div>
        )}
      </div>
    </nav>
  )
}
