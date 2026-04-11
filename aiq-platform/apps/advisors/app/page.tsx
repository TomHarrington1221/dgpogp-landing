import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect authenticated users straight to dashboard
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-border">
        <span className="font-display text-3xl tracking-widest text-gold">AIQ</span>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-text-secondary text-sm hover:text-text-primary transition-colors">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="bg-gold text-bg font-display tracking-wider px-5 py-2 rounded text-sm hover:bg-gold-light transition-colors"
          >
            START FREE
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-24">
        <div className="max-w-3xl space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/30 rounded-full px-4 py-1.5">
            <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse-gold" />
            <span className="text-gold text-xs font-mono tracking-wider">NOW IN EARLY ACCESS</span>
          </div>

          <h1 className="font-serif text-5xl md:text-7xl text-text-primary leading-tight">
            Your AI advisory
            <br />
            <span className="text-gradient-gold">team is ready.</span>
          </h1>

          <p className="text-text-secondary text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
            AIQ Advisors gives legal and real estate professionals expert-level strategic guidance
            on AI and blockchain adoption — instantly, on demand.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto bg-gold text-bg font-display tracking-widest text-xl px-10 py-4 rounded hover:bg-gold-light transition-all duration-200 glow-gold"
            >
              START FREE
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto border border-border text-text-secondary font-mono text-sm px-8 py-4 rounded hover:border-gold/40 hover:text-text-primary transition-all duration-200"
            >
              Sign in
            </Link>
          </div>

          <p className="text-text-muted text-xs">
            Free tier includes 5 advisor messages per month. No credit card required.
          </p>
        </div>

        {/* Features row */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
          {[
            {
              icon: '⚖',
              title: 'Legal Advisor',
              desc: 'AI & blockchain adoption for legal professionals. Contract automation, compliance, blockchain evidence.',
            },
            {
              icon: '🏛',
              title: 'Real Estate Advisor',
              desc: 'PropTech strategy, tokenized real estate, AI-powered deal analysis and portfolio intelligence.',
            },
            {
              icon: '◈',
              title: 'Smart Routing',
              desc: 'Our Concierge understands your needs and connects you with the right specialist instantly.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-bg-secondary border border-border rounded-lg p-6 text-left"
            >
              <div className="text-2xl mb-3">{feature.icon}</div>
              <h3 className="text-text-primary font-medium mb-2">{feature.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-text-muted text-xs">
          © 2026 AIQ Industries LLC. Strategic guidance only — not professional advice.
        </p>
        <div className="flex items-center gap-6">
          <Link href="/terms" className="text-text-muted text-xs hover:text-text-secondary transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="text-text-muted text-xs hover:text-text-secondary transition-colors">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  )
}
