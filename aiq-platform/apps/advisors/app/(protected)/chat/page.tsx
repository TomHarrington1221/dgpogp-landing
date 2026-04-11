import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChatInterface } from '@/components/chat/ChatInterface'
import type { AgentType } from '@aiq/db'
import { AVAILABLE_AGENTS } from '@/lib/agents/types'

interface ChatPageProps {
  searchParams: Promise<{ agent?: string }>
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const supabase = await createClient()
  const params = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (!profile.disclaimer_accepted) redirect('/disclaimer')

  // Validate agent param
  const requestedAgent = params.agent as AgentType | undefined
  const initialAgent: AgentType =
    requestedAgent && AVAILABLE_AGENTS.includes(requestedAgent)
      ? requestedAgent
      : 'concierge'

  return (
    <div className="flex flex-col h-screen bg-bg">
      {/* Back nav */}
      <div className="absolute top-4 left-4 z-10">
        <a
          href="/dashboard"
          className="flex items-center gap-2 text-text-muted text-xs hover:text-gold transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="m15 18-6-6 6-6" />
          </svg>
          Dashboard
        </a>
      </div>

      <ChatInterface
        user={profile}
        initialAgent={initialAgent}
      />
    </div>
  )
}
