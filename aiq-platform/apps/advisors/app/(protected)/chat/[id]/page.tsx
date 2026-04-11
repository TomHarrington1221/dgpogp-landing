import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ChatInterface } from '@/components/chat/ChatInterface'
import type { AgentType } from '@aiq/db'

interface ConversationPageProps {
  params: Promise<{ id: string }>
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (!profile.disclaimer_accepted) redirect('/disclaimer')

  // Load conversation (verify ownership)
  const { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!conversation) notFound()

  // Load messages
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  const displayMessages = (messages ?? [])
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      agentType: m.agent_type as AgentType | undefined,
    }))

  return (
    <div className="flex flex-col h-screen bg-bg">
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
        conversationId={id}
        initialAgent={conversation.agent_type as AgentType}
        initialMessages={displayMessages}
      />
    </div>
  )
}
