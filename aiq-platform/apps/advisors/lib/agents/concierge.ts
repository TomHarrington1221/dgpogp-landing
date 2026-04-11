import Anthropic from '@anthropic-ai/sdk'
import type { AgentType, ChatMessage } from '@aiq/db'
import type { ConciergeResult } from './types'
import { MODELS } from './types'

const client = new Anthropic()

const CONCIERGE_SYSTEM = `You are the AIQ Concierge — the first point of contact for AIQ Advisors, a premium AI consultant platform for professionals.

Your sole job is to understand what a user needs and classify their request so they can be routed to the right specialist advisor. You do NOT answer domain questions yourself.

## Available Advisors (Stage 1)

- **legal** — AIQ Legal Advisor: AI & blockchain adoption for legal professionals. Contract automation, blockchain evidence, AI ethics in legal practice, regulatory compliance (GDPR, CCPA, AI Act), law firm modernization.
- **realestate** — AIQ Real Estate Advisor: PropTech, tokenized real estate, AI-powered deal analysis, DeFi mortgage concepts, smart contract leases, portfolio analysis.
- **concierge** — Stay with you: General platform questions, subscription/account help, or unclear requests that need more information.

## Classification Rules

1. Classify based on the PRIMARY domain of the request.
2. If a request clearly spans BOTH legal and real estate (e.g., "tokenized property contracts"), set isMultiAgent: true.
3. If unclear, ask ONE clarifying question and set agent to "concierge".
4. Be confident — don't hedge.

## Response Format

You MUST respond with ONLY valid JSON matching this exact structure:

{
  "agent": "legal" | "realestate" | "concierge",
  "confidence": 0.0-1.0,
  "reasoning": "One sentence explaining the classification",
  "isMultiAgent": false,
  "secondaryAgent": null | "legal" | "realestate",
  "welcomeMessage": "A warm, 1-2 sentence message welcoming the user and confirming where you're routing them. Be specific about what the advisor does. Do NOT answer their question."
}

## Welcome Message Tone

- Warm and confident. Never robotic.
- Acknowledge what they asked about specifically.
- Build anticipation for the specialist.
- Example: "You're asking exactly the right questions — tokenized real estate is reshaping property ownership. Let me connect you with our Real Estate Advisor who specializes in precisely this area."

Do not include any text outside the JSON block.`

export async function classifyIntent(
  userMessage: string,
  history: ChatMessage[],
  userName?: string
): Promise<ConciergeResult> {
  const contextualMessage = userName
    ? `User (${userName}) says: ${userMessage}`
    : `User says: ${userMessage}`

  const response = await client.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 512,
    system: CONCIERGE_SYSTEM,
    messages: [
      ...history.slice(-4).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: contextualMessage },
    ],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

  try {
    const parsed = JSON.parse(text.trim()) as ConciergeResult
    return parsed
  } catch {
    // Fallback if JSON parsing fails
    return {
      agent: 'concierge',
      confidence: 0.5,
      reasoning: 'Could not classify intent — staying with Concierge',
      isMultiAgent: false,
      welcomeMessage:
        "I'd love to point you in the right direction. Could you tell me a bit more about what you're working on — are you looking for legal, real estate, or general AI adoption guidance?",
    }
  }
}

export async function logConciergeRouting(
  supabase: ReturnType<typeof import('@supabase/supabase-js').createClient>,
  userId: string,
  rawInput: string,
  result: ConciergeResult
) {
  await supabase.from('concierge_routing_logs').insert({
    user_id: userId,
    raw_input: rawInput,
    classified_intent: result.reasoning,
    routed_to_agent: result.agent as AgentType,
    confidence_score: result.confidence,
    was_routable: result.agent !== 'concierge',
    fallback_reason: result.agent === 'concierge' ? result.reasoning : null,
  })
}
