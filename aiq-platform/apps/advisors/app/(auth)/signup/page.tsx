'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Redirect to dashboard — Supabase will handle email confirmation flow
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10 text-center">
        <h1 className="font-display text-5xl tracking-widest text-gold">AIQ</h1>
        <p className="font-serif text-text-secondary text-sm mt-1 tracking-wide">
          ADVISORS
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-bg-secondary border border-border rounded-lg p-8">
        <h2 className="font-serif text-2xl text-text-primary mb-2">Create your account</h2>
        <p className="text-text-secondary text-sm mb-2">
          Start free — 5 advisor messages per month, no credit card required.
        </p>

        {/* Free tier callout */}
        <div className="bg-green-muted border border-green/30 rounded px-3 py-2 mb-8">
          <p className="text-green text-xs font-mono">
            FREE TIER INCLUDED — Upgrade anytime for unlimited access.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="block text-text-secondary text-xs uppercase tracking-wider mb-2">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className={cn(
                'w-full bg-bg border border-border rounded px-4 py-3',
                'text-text-primary placeholder:text-text-muted',
                'focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30',
                'transition-colors duration-200 text-sm'
              )}
            />
          </div>

          <div>
            <label className="block text-text-secondary text-xs uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={cn(
                'w-full bg-bg border border-border rounded px-4 py-3',
                'text-text-primary placeholder:text-text-muted',
                'focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30',
                'transition-colors duration-200 font-mono text-sm'
              )}
            />
          </div>

          <div>
            <label className="block text-text-secondary text-xs uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className={cn(
                'w-full bg-bg border border-border rounded px-4 py-3',
                'text-text-primary placeholder:text-text-muted',
                'focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30',
                'transition-colors duration-200 font-mono text-sm'
              )}
            />
          </div>

          {error && (
            <div className="bg-red-950/30 border border-red-800/50 rounded px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              'w-full bg-gold text-bg font-display tracking-widest text-lg py-3 rounded',
              'hover:bg-gold-light transition-colors duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {loading ? 'CREATING ACCOUNT...' : 'CREATE FREE ACCOUNT'}
          </button>

          <p className="text-text-muted text-xs text-center">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="text-gold/70 hover:text-gold transition-colors">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-gold/70 hover:text-gold transition-colors">
              Privacy Policy
            </Link>
            .
          </p>
        </form>

        <div className="mt-6 text-center">
          <p className="text-text-muted text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-gold hover:text-gold-light transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
