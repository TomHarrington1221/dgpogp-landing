'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(redirectTo)
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
        <h2 className="font-serif text-2xl text-text-primary mb-2">Welcome back</h2>
        <p className="text-text-secondary text-sm mb-8">
          Sign in to continue your advisory sessions.
        </p>

        <form onSubmit={handleLogin} className="space-y-5">
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
              placeholder="••••••••"
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
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-text-muted text-sm">
            No account?{' '}
            <Link href="/signup" className="text-gold hover:text-gold-light transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </div>

      {/* Bottom tagline */}
      <p className="mt-8 text-text-muted text-xs text-center max-w-xs">
        AIQ Advisors — AI-powered strategic guidance for legal and real estate professionals.
      </p>
    </div>
  )
}
