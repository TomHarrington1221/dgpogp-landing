'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { AGENT_DISPLAY_NAMES } from '@/lib/agents'
import { cn } from '@/lib/utils'
import type { AgentType, User } from '@aiq/db'

interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  agentType?: AgentType
  isStreaming?: boolean
}

interface ChatInterfaceProps {
  user: User
  conversationId?: string
  initialAgent?: AgentType
  initialMessages?: DisplayMessage[]
}

export function ChatInterface({
  user,
  conversationId: initialConversationId,
  initialAgent,
  initialMessages = [],
}: ChatInterfaceProps) {
  const router = useRouter()
  const supabase = createClient()

  const [messages, setMessages] = useState<DisplayMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentAgent, setCurrentAgent] = useState<AgentType>(initialAgent ?? 'concierge')
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId ?? null)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesRemaining = user.message_limit - user.message_count_this_month

  // Show concierge greeting on first load (new conversation)
  useEffect(() => {
    if (messages.length === 0) {
      const greeting: DisplayMessage = {
        id: 'greeting',
        role: 'assistant',
        content: `Welcome${user.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}. I'm your AIQ Concierge — your starting point for expert guidance on AI and blockchain adoption.\n\nI can connect you with our **AIQ Legal Advisor** for legal tech and blockchain compliance questions, or our **AIQ Real Estate Advisor** for PropTech and tokenized real estate strategy.\n\nWhat are you working on today?`,
        agentType: 'concierge',
      }
      setMessages([greeting])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || isStreaming) return

    setInput('')
    setError(null)

    // Add user message immediately
    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedInput,
    }
    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)

    // Add streaming placeholder
    const streamingId = `streaming-${Date.now()}`
    const streamingMsg: DisplayMessage = {
      id: streamingId,
      role: 'assistant',
      content: '',
      agentType: currentAgent,
      isStreaming: true,
    }
    setMessages((prev) => [...prev, streamingMsg])

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: trimmedInput,
          conversationId,
          agentType: currentAgent === 'concierge' ? null : currentAgent,
        }),
      })

      if (response.status === 429) {
        const data = await response.json() as { error: string }
        setMessages((prev) => prev.filter((m) => m.id !== streamingId))
        setError(`You've reached your monthly message limit. Upgrade to continue.`)
        setIsStreaming(false)
        return
      }

      if (response.status === 403) {
        router.push('/disclaimer')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      // Stream the response
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      let activeAgent = currentAgent

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (!data) continue

          try {
            const parsed = JSON.parse(data) as {
              type: string
              text?: string
              agent?: AgentType
              welcome?: string
              conversationId?: string
              message?: string
            }

            if (parsed.type === 'meta' && parsed.conversationId) {
              setConversationId(parsed.conversationId)
            } else if (parsed.type === 'concierge_route' && parsed.agent) {
              activeAgent = parsed.agent
              setCurrentAgent(parsed.agent)
              if (parsed.conversationId) setConversationId(parsed.conversationId)

              // Replace streaming placeholder with concierge welcome
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingId
                    ? {
                        ...m,
                        content: parsed.welcome ?? '',
                        agentType: 'concierge',
                        isStreaming: false,
                      }
                    : m
                )
              )

              // Add new streaming message for the advisor
              const advisorStreamId = `streaming-advisor-${Date.now()}`
              setMessages((prev) => [
                ...prev,
                {
                  id: advisorStreamId,
                  role: 'assistant',
                  content: '',
                  agentType: parsed.agent,
                  isStreaming: true,
                },
              ])

              // Continue reading into new advisor message
              // (subsequent text chunks will be handled below)
            } else if (parsed.type === 'text' && parsed.text) {
              fullContent += parsed.text
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.isStreaming) {
                    return { ...m, content: fullContent, agentType: activeAgent }
                  }
                  return m
                })
              )
            } else if (parsed.type === 'done') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.isStreaming ? { ...m, isStreaming: false } : m
                )
              )
            } else if (parsed.type === 'error') {
              throw new Error(parsed.message ?? 'Streaming error')
            }
          } catch {
            // Non-JSON line — skip
          }
        }
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.isStreaming !== true))
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsStreaming(false)
    }
  }, [input, isStreaming, conversationId, currentAgent, supabase, router])

  const agentName = AGENT_DISPLAY_NAMES[currentAgent]

  return (
    <div className="flex flex-col h-full">
      {/* Agent header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-bg-secondary">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green animate-pulse-gold" />
          <span className="text-text-primary text-sm font-medium">{agentName}</span>
          {currentAgent !== 'concierge' && (
            <button
              onClick={() => {
                setCurrentAgent('concierge')
                setMessages([])
                setConversationId(null)
              }}
              className="text-text-muted text-xs hover:text-gold transition-colors"
            >
              ← Back to Concierge
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'text-xs font-mono px-2 py-1 rounded',
              user.subscription_tier === 'free'
                ? 'bg-bg text-text-muted border border-border'
                : 'bg-gold/10 text-gold border border-gold/30'
            )}
          >
            {user.subscription_tier.toUpperCase()}
          </span>
          {user.subscription_tier === 'free' && (
            <span className="text-text-muted text-xs font-mono">
              {Math.max(0, messagesRemaining)}/{user.message_limit} msgs
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            agentType={msg.agentType}
            isStreaming={msg.isStreaming}
            userName={user.full_name ?? user.email}
          />
        ))}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-950/30 border border-red-800/40 rounded px-4 py-3 text-red-400 text-sm max-w-lg text-center">
              {error}
              {error.includes('limit') && (
                <button
                  onClick={() => router.push('/upgrade')}
                  className="block mt-2 text-gold hover:text-gold-light text-xs transition-colors"
                >
                  View upgrade options →
                </button>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput
        value={input}
        onChange={setInput}
        onSubmit={sendMessage}
        disabled={isStreaming}
        messagesRemaining={user.subscription_tier === 'free' ? messagesRemaining : undefined}
        placeholder={
          currentAgent === 'concierge'
            ? "What are you working on? I'll connect you with the right advisor..."
            : `Ask the ${agentName}...`
        }
      />
    </div>
  )
}
