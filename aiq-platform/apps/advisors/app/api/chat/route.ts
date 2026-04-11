import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import { getAgentConfig, classifyIntent, logConciergeRouting } from '@/lib/agents'
import type { AgentType, ChatMessage } from '@aiq/db'

const anthropic = new Anthropic()

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: Request) {
  const supabase = createServiceClient()

  // 1. Auth check
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 })
  }
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // 2. Parse request body
  const body = await req.json() as {
    message: string
    conversationId: string | null
    agentType: AgentType | null
  }

  const { message, conversationId, agentType } = body

  if (!message?.trim()) {
    return new Response('Message required', { status: 400 })
  }

  // 3. Load user profile (message limits, disclaimer, tier)
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return new Response('User profile not found', { status: 404 })
  }

  // 4. Disclaimer gate
  if (!profile.disclaimer_accepted) {
    return new Response(
      JSON.stringify({ error: 'disclaimer_required' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 5. Message limit check (non-concierge messages only)
  const isConciergeMessage = !agentType || agentType === 'concierge'
  if (!isConciergeMessage && profile.subscription_tier === 'free') {
    if (profile.message_count_this_month >= profile.message_limit) {
      return new Response(
        JSON.stringify({ error: 'message_limit_reached', limit: profile.message_limit }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  // 6. Get or create conversation
  let activeConversationId = conversationId
  if (!activeConversationId) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        agent_type: agentType ?? 'concierge',
        title: message.slice(0, 60),
      })
      .select()
      .single()
    activeConversationId = newConv?.id ?? null
  }

  // 7. Load conversation history (last 20 messages)
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', activeConversationId)
    .order('created_at', { ascending: true })
    .limit(20)

  const chatHistory: ChatMessage[] = (history ?? []).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // 8. Save user message to DB
  await supabase.from('messages').insert({
    conversation_id: activeConversationId,
    user_id: user.id,
    role: 'user',
    content: message,
    agent_type: agentType ?? 'concierge',
    is_concierge_msg: isConciergeMessage,
  })

  // 9. Determine target agent
  let targetAgent: AgentType = agentType ?? 'concierge'
  let conciergeWelcome: string | null = null

  if (!agentType || agentType === 'concierge') {
    const classification = await classifyIntent(
      message,
      chatHistory,
      profile.full_name ?? undefined
    )

    // Log concierge routing
    await logConciergeRouting(
      supabase as Parameters<typeof logConciergeRouting>[0],
      user.id,
      message,
      classification
    )

    if (classification.agent !== 'concierge') {
      targetAgent = classification.agent
      conciergeWelcome = classification.welcomeMessage

      // Update conversation to reflect routed agent
      await supabase
        .from('conversations')
        .update({ agent_type: targetAgent })
        .eq('id', activeConversationId)
    }
  }

  // 10. Get agent config
  const agentConfig = getAgentConfig(targetAgent)

  // 11. Stream response
  const encoder = new TextEncoder()
  let fullResponse = ''
  let inputTokens = 0
  let outputTokens = 0

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // If concierge routed us, send welcome message first
        if (conciergeWelcome) {
          const welcomePayload = JSON.stringify({
            type: 'concierge_route',
            agent: targetAgent,
            welcome: conciergeWelcome,
            conversationId: activeConversationId,
          })
          controller.enqueue(encoder.encode(`data: ${welcomePayload}\n\n`))
        } else {
          // Send conversation ID for new conversations
          const metaPayload = JSON.stringify({
            type: 'meta',
            conversationId: activeConversationId,
          })
          controller.enqueue(encoder.encode(`data: ${metaPayload}\n\n`))
        }

        // Stream from Claude
        const claudeStream = anthropic.messages.stream({
          model: agentConfig.model,
          max_tokens: agentConfig.maxTokens,
          thinking: { type: 'adaptive' } as Parameters<typeof anthropic.messages.stream>[0]['thinking'],
          system: agentConfig.systemPrompt,
          messages: [
            ...chatHistory.map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
            { role: 'user', content: message },
          ],
        })

        for await (const event of claudeStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const chunk = event.delta.text
            fullResponse += chunk
            const payload = JSON.stringify({ type: 'text', text: chunk })
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
          }
        }

        // Get final message for token counts
        const finalMessage = await claudeStream.finalMessage()
        inputTokens = finalMessage.usage.input_tokens
        outputTokens = finalMessage.usage.output_tokens

        // Save assistant response to DB
        await supabase.from('messages').insert({
          conversation_id: activeConversationId,
          user_id: user.id,
          role: 'assistant',
          content: fullResponse,
          agent_type: targetAgent,
          tokens_used: outputTokens,
          is_concierge_msg: false,
        })

        // Increment message count (non-concierge messages only)
        if (!isConciergeMessage || targetAgent !== 'concierge') {
          await supabase
            .from('users')
            .update({
              message_count_this_month: profile.message_count_this_month + 1,
            })
            .eq('id', user.id)

          // Update conversation message count
          await supabase.rpc('increment_message_count', {
            conv_id: activeConversationId,
          }).catch(() => {
            // Non-critical — count can be repaired
          })
        }

        // Send done signal
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done', inputTokens, outputTokens })}\n\n`)
        )
        controller.close()
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An error occurred'
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: errorMsg })}\n\n`)
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
