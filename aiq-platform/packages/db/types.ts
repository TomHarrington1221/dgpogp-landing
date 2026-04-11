// ============================================================
// AIQ Platform — Database TypeScript Types
// Auto-sync these with schema.sql when schema changes
// ============================================================

export type SubscriptionTier = 'free' | 'day_pass' | 'pro' | 'enterprise'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing'
export type AgentType =
  | 'concierge'
  | 'legal'
  | 'realestate'
  | 'research'
  | 'financial'
  | 'strategy'
  | 'ai_integration'
  | 'web3'
  | 'web3_education'

export type MessageRole = 'user' | 'assistant' | 'system'
export type MemoryType = 'fact' | 'preference' | 'context' | 'goal'
export type RevenueEventType =
  | 'subscription_new'
  | 'subscription_renewal'
  | 'subscription_upgrade'
  | 'subscription_downgrade'
  | 'day_pass'
  | 'refund'

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  subscription_tier: SubscriptionTier
  subscription_status: SubscriptionStatus
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  wallet_address: string | null
  token_balance: number
  dgpogp_in_vault: number
  is_custodial_wallet: boolean
  aiq_points: number
  message_count_this_month: number
  message_limit: number
  last_message_reset: string
  disclaimer_accepted: boolean
  disclaimer_accepted_at: string | null
  disclaimer_version: string | null
  created_at: string
  updated_at: string
}

export interface DisclaimerLog {
  id: string
  user_id: string
  version: string
  accepted_at: string
  ip_address: string | null
  user_agent: string | null
}

export interface Conversation {
  id: string
  user_id: string
  title: string | null
  agent_type: AgentType
  status: 'active' | 'archived'
  is_multi_agent: boolean
  agents_involved: AgentType[]
  message_count: number
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  user_id: string
  role: MessageRole
  content: string
  agent_type: AgentType | null
  tool_calls: Record<string, unknown> | null
  tool_results: Record<string, unknown> | null
  tokens_used: number
  thinking_tokens: number
  is_concierge_msg: boolean
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  plan: SubscriptionTier
  status: string
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  token_split_enabled: boolean
  token_split_pct: number
  day_pass_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface RevenueEvent {
  id: string
  user_id: string
  event_type: RevenueEventType
  amount_cents: number
  currency: string
  stripe_payment_intent_id: string | null
  plan: SubscriptionTier | null
  distributable_usd: number
  created_at: string
}

export interface AiqPointsLedgerEntry {
  id: string
  user_id: string
  transaction_type: 'earned' | 'redeemed' | 'expired' | 'bonus'
  points_delta: number
  balance_after: number
  description: string
  reference_id: string | null
  created_at: string
}

export interface Document {
  id: string
  user_id: string
  conversation_id: string | null
  filename: string
  file_path: string
  file_size: number
  mime_type: string
  analysis_status: 'pending' | 'processing' | 'complete' | 'failed'
  extracted_text: string | null
  created_at: string
}

export interface ClientMemory {
  id: string
  user_id: string
  agent_type: AgentType
  content: string
  embedding: number[] | null
  memory_type: MemoryType
  relevance_score: number
  created_at: string
  last_accessed_at: string
}

export interface ConciergeRoutingLog {
  id: string
  user_id: string | null
  raw_input: string
  classified_intent: string | null
  routed_to_agent: AgentType | null
  confidence_score: number | null
  was_routable: boolean
  fallback_reason: string | null
  created_at: string
}

export interface AgentSession {
  id: string
  conversation_id: string
  agent_type: AgentType
  started_at: string
  ended_at: string | null
  total_tokens: number
  thinking_tokens: number
  tools_used: string[]
  outcome: 'completed' | 'handed_off' | 'error' | 'limit_reached' | null
}

export interface PlatformSetting {
  key: string
  value: string
  description: string | null
  updated_at: string
}

// Convenience type for API responses
export interface ChatMessage {
  role: MessageRole
  content: string
}

// Concierge classification result
export interface ConciergeClassification {
  agent: AgentType
  confidence: number
  reasoning: string
  isMultiAgent: boolean
  secondaryAgent?: AgentType
}

// Message limits per tier
export const MESSAGE_LIMITS: Record<SubscriptionTier, number> = {
  free: 5,
  day_pass: Infinity,
  pro: 100,
  enterprise: Infinity,
}
