import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthCardLayout } from '@/components/auth/AuthCardLayout'
import { authService } from '@/services/supabase/auth.service'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }

    setLoading(true)
    const result = await authService.resetPassword(email.trim(), `${window.location.origin}/login`)
    setLoading(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    setSuccess('Password reset instructions have been sent to your email address.')
  }

  return (
    <AuthCardLayout
      title="Reset Password"
      subtitle="Receive a secure link to set a new password"
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

        {error && <p className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
        {success && <p className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{success}</p>}

        <Button type="submit" disabled={loading} className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400">
          {loading ? 'Sending reset email...' : 'Send Reset Email'}
        </Button>

        <p className="text-center text-sm text-slate-300">
          Back to{' '}
          <Link to="/login" className="text-cyan-200 transition hover:text-cyan-100">
            sign in
          </Link>
        </p>
      </form>
    </AuthCardLayout>
  )
}
