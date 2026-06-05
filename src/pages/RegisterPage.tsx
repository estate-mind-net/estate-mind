import { FormEvent, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthCardLayout } from '@/components/auth/AuthCardLayout'
import { authService } from '@/services/supabase/auth.service'
import { useAuth } from '@/hooks/useAuth'

export function RegisterPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const passwordError = useMemo(() => {
    if (!password && !confirmPassword) return null
    if (password.length < 8) return 'Password must be at least 8 characters.'
    if (password !== confirmPassword) return 'Passwords do not match.'
    return null
  }, [password, confirmPassword])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please complete all fields.')
      return
    }

    if (passwordError) {
      setError(passwordError)
      return
    }

    setLoading(true)
    const result = await authService.signUp({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
    })
    setLoading(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    toast.success('Account created. Please check your email to confirm your account if required.')
    navigate('/dashboard', { replace: true })
  }

  return (
    <AuthCardLayout
      title="Create Investor Account"
      subtitle="Set up your secure EstateMind workspace"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="full-name" className="text-slate-200">Full name</Label>
          <Input
            id="full-name"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Sara Morgan"
            className="border-slate-700 bg-slate-900/60 text-slate-100 placeholder:text-slate-400"
          />
        </div>

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
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 8 characters"
            className="border-slate-700 bg-slate-900/60 text-slate-100 placeholder:text-slate-400"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="text-slate-200">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter password"
            className="border-slate-700 bg-slate-900/60 text-slate-100 placeholder:text-slate-400"
          />
        </div>

        {(error || passwordError) && (
          <p className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error ?? passwordError}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400">
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>

        <p className="text-center text-sm text-slate-300">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-200 transition hover:text-cyan-100">
            Sign in
          </Link>
        </p>
      </form>
    </AuthCardLayout>
  )
}
