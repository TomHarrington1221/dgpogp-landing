import type { AgentType, ChatMessage } from '@aiq/db'

export interface AgentConfig {
  type: AgentType
  model: string
  systemPrompt: string
  maxTokens: number
  temperature?: number
}

export interface AgentRequest {
  conversationId: string
  userId: string
  userMessage: string
  history: ChatMessage[]
  agentType: AgentType
  userName?: string
}

export interface ConciergeResult {
  agent: AgentType
  confidence: number
  reasoning: string
  isMultiAgent: boolean
  secondaryAgent?: AgentType
  welcomeMessage: string
}

export const MODELS = {
  OPUS: 'claude-opus-4-6',
  SONNET: 'claude-sonnet-4-6',
  HAIKU: 'claude-haiku-4-5-20251001',
} as const

// Agent display names (client-facing)
export const AGENT_DISPLAY_NAMES: Record<AgentType, string> = {
  concierge: 'AIQ Concierge',
  legal: 'AIQ Legal Advisor',
  realestate: 'AIQ Real Estate Advisor',
  research: 'AIQ Research Agent',
  financial: 'AIQ Financial Advisor',
  strategy: 'AIQ Business Strategy Advisor',
  ai_integration: 'AIQ AI Integration Advisor',
  web3: 'AIQ Web3 Strategy Advisor',
  web3_education: 'AIQ New to Web3 Assistant',
}

// Agent availability at launch
export const AVAILABLE_AGENTS: AgentType[] = ['concierge', 'legal', 'realestate']
