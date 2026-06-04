import { FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthCardLayout } from '@/components/auth/AuthCardLayout'
import { authService } from '@/services/supabase/auth.service'
import { useAuth } from '@/hooks/useAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.')
      return
    }

    setLoading(true)
    const result = await authService.signIn({ email: email.trim(), password })
    setLoading(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    const from = (location.state as { from?: { pathname?: string } } | undefined)?.from?.pathname
    toast.success('Signed in successfully')
    navigate(from && from !== '/login' ? from : '/dashboard', { replace: true })
  }

  return (
    <AuthCardLayout
      title="Welcome Back"
      subtitle="Sign in to your EstateMind investor workspace"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-200">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@investor.com"
            className="border-slate-700 bg-slate-900/60 text-slate-100 placeholder:text-slate-400"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-200">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            className="border-slate-700 bg-slate-900/60 text-slate-100 placeholder:text-slate-400"
          />
        </div>

        {error && <p className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400">
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-cyan-200 transition hover:text-cyan-100">
            Forgot password?
          </Link>
          <Link to="/register" className="text-slate-300 transition hover:text-white">
            Create account
          </Link>
        </div>
      </form>
    </AuthCardLayout>
  )
}
