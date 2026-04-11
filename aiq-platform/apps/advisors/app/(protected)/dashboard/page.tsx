import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatRelativeTime, truncate } from '@/lib/utils'
import { AGENT_DISPLAY_NAMES } from '@/lib/agents'
import { cn } from '@/lib/utils'
import type { AgentType } from '@aiq/db'

const TIER_STYLES = {
  free: 'border-border text-text-muted',
  day_pass: 'border-green/50 text-green',
  pro: 'border-gold/50 text-gold',
  enterprise: 'border-gold text-gold bg-gold/5',
}

const AGENT_ICONS: Partial<Record<AgentType, string>> = {
  legal: '⚖',
  realestate: '🏛',
  concierge: '◈',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (!profile.disclaimer_accepted) redirect('/disclaimer')

  // Load recent conversations
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(10)

  const messagesUsed = profile.message_count_this_month
  const messagesLimit = profile.message_limit
  const messagesRemaining = Math.max(0, messagesLimit - messagesUsed)
  const usagePercent =
    profile.subscription_tier === 'free' ? (messagesUsed / messagesLimit) * 100 : 0

  const firstName = profile.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="min-h-screen bg-bg">
      {/* Top Nav */}
      <nav className="border-b border-border bg-bg-secondary px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display text-2xl tracking-widest text-gold">AIQ</span>
          <span className="text-text-muted text-xs font-mono">ADVISORS</span>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={cn(
              'text-xs font-mono px-2 py-1 rounded border',
              TIER_STYLES[profile.subscription_tier as keyof typeof TIER_STYLES]
            )}
          >
            {profile.subscription_tier.replace('_', ' ').toUpperCase()}
          </span>
          <form action="/api/auth/signout" method="POST">
            <button className="text-text-muted text-sm hover:text-text-primary transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Greeting */}
        <div>
          <h1 className="font-serif text-3xl text-text-primary">
            Good to see you, {firstName}.
          </h1>
          <p className="text-text-secondary mt-1">
            Your advisors are ready. What are you working on?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/chat" className="group">
            <div className="bg-bg-secondary border border-border hover:border-gold/50 rounded-lg p-5 transition-all duration-200 hover:bg-bg-elevated">
              <div className="text-2xl mb-3">◈</div>
              <h3 className="text-text-primary font-medium mb-1">New Session</h3>
              <p className="text-text-muted text-xs leading-relaxed">
                Start with the Concierge — I'll route you to the right advisor.
              </p>
            </div>
          </Link>

          <Link href="/chat?agent=legal" className="group">
            <div className="bg-bg-secondary border border-border hover:border-gold/50 rounded-lg p-5 transition-all duration-200 hover:bg-bg-elevated">
              <div className="text-2xl mb-3">⚖</div>
              <h3 className="text-text-primary font-medium mb-1">Legal Advisor</h3>
              <p className="text-text-muted text-xs leading-relaxed">
                AI & blockchain adoption for legal professionals.
              </p>
            </div>
          </Link>

          <Link href="/chat?agent=realestate" className="group">
            <div className="bg-bg-secondary border border-border hover:border-gold/50 rounded-lg p-5 transition-all duration-200 hover:bg-bg-elevated">
              <div className="text-2xl mb-3">🏛</div>
              <h3 className="text-text-primary font-medium mb-1">Real Estate Advisor</h3>
              <p className="text-text-muted text-xs leading-relaxed">
                PropTech, tokenization, and AI-powered deal strategy.
              </p>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Conversations */}
          <div className="lg:col-span-2 bg-bg-secondary border border-border rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-text-primary font-medium text-sm">Recent Sessions</h2>
            </div>

            {!conversations || conversations.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-text-muted text-sm">No sessions yet.</p>
                <Link
                  href="/chat"
                  className="inline-block mt-3 text-gold text-sm hover:text-gold-light transition-colors"
                >
                  Start your first session →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/chat/${conv.id}`}
                    className="flex items-start gap-4 px-5 py-4 hover:bg-bg-elevated transition-colors group"
                  >
                    <span className="text-lg mt-0.5 flex-shrink-0">
                      {AGENT_ICONS[conv.agent_type as AgentType] ?? '◈'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm font-medium truncate group-hover:text-gold transition-colors">
                        {conv.title ? truncate(conv.title, 55) : 'Untitled session'}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-text-muted text-xs">
                          {AGENT_DISPLAY_NAMES[conv.agent_type as AgentType]}
                        </span>
                        <span className="text-border-DEFAULT">·</span>
                        <span className="text-text-muted text-xs">
                          {formatRelativeTime(conv.updated_at)}
                        </span>
                        <span className="text-border-DEFAULT">·</span>
                        <span className="text-text-muted text-xs">
                          {conv.message_count} msg{conv.message_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Stats Panel */}
          <div className="space-y-4">
            {/* Usage */}
            <div className="bg-bg-secondary border border-border rounded-lg p-5">
              <h3 className="text-text-secondary text-xs uppercase tracking-wider mb-4">
                This Month
              </h3>

              {profile.subscription_tier === 'free' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-text-primary text-2xl font-mono">
                      {messagesRemaining}
                    </span>
                    <span className="text-text-muted text-xs">of {messagesLimit} remaining</span>
                  </div>

                  {/* Usage bar */}
                  <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-gold' : 'bg-green'
                      )}
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                  </div>

                  <Link
                    href="/upgrade"
                    className="block w-full text-center bg-gold/10 border border-gold/30 text-gold text-xs py-2 rounded hover:bg-gold/20 transition-colors"
                  >
                    Upgrade for unlimited →
                  </Link>
                </div>
              ) : (
                <div>
                  <span className="text-green text-sm">Unlimited messages</span>
                  <p className="text-text-muted text-xs mt-1">{profile.subscription_tier} plan</p>
                </div>
              )}
            </div>

            {/* AIQ Points */}
            <div className="bg-bg-secondary border border-border rounded-lg p-5">
              <h3 className="text-text-secondary text-xs uppercase tracking-wider mb-3">
                AIQ Points
              </h3>
              <div className="flex items-end gap-2">
                <span className="text-gold text-2xl font-mono">
                  {profile.aiq_points.toLocaleString()}
                </span>
                <span className="text-text-muted text-xs mb-0.5">pts</span>
              </div>
              <p className="text-text-muted text-xs mt-2 leading-relaxed">
                Earn 100 points per $1. Redeem for free sessions and tier upgrades.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
