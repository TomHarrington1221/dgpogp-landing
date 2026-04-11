-- ============================================================
-- AIQ Platform — Full Database Schema
-- Run in Supabase SQL Editor (in order)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- 1. USERS (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                   TEXT NOT NULL,
  full_name               TEXT,
  avatar_url              TEXT,

  -- Subscription
  subscription_tier       TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'day_pass', 'pro', 'enterprise')),
  subscription_status     TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT UNIQUE,

  -- Token / Web3 (Stage 2+)
  wallet_address          TEXT UNIQUE,
  token_balance           NUMERIC(20, 4) DEFAULT 0,
  dgpogp_in_vault         NUMERIC(20, 4) DEFAULT 0,
  is_custodial_wallet     BOOLEAN DEFAULT FALSE,

  -- AIQ Points
  aiq_points              INTEGER NOT NULL DEFAULT 0,

  -- Usage
  message_count_this_month INTEGER NOT NULL DEFAULT 0,
  message_limit           INTEGER NOT NULL DEFAULT 5,
  last_message_reset      TIMESTAMPTZ DEFAULT date_trunc('month', NOW()),

  -- Legal
  disclaimer_accepted     BOOLEAN NOT NULL DEFAULT FALSE,
  disclaimer_accepted_at  TIMESTAMPTZ,
  disclaimer_version      TEXT DEFAULT '1.0',

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 2. DISCLAIMER LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.disclaimer_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  version      TEXT NOT NULL DEFAULT '1.0',
  accepted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address   TEXT,
  user_agent   TEXT
);

-- ============================================================
-- 3. CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title            TEXT,
  agent_type       TEXT NOT NULL DEFAULT 'concierge' CHECK (agent_type IN (
                     'concierge', 'legal', 'realestate', 'research',
                     'financial', 'strategy', 'ai_integration', 'web3', 'web3_education'
                   )),
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  is_multi_agent   BOOLEAN NOT NULL DEFAULT FALSE,
  agents_involved  TEXT[] DEFAULT '{}',
  message_count    INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 4. MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content           TEXT NOT NULL,
  agent_type        TEXT,
  tool_calls        JSONB,
  tool_results      JSONB,
  tokens_used       INTEGER DEFAULT 0,
  thinking_tokens   INTEGER DEFAULT 0,
  is_concierge_msg  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast conversation retrieval
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON public.messages(user_id);

-- ============================================================
-- 5. SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan                     TEXT NOT NULL CHECK (plan IN ('free', 'day_pass', 'pro', 'enterprise')),
  status                   TEXT NOT NULL DEFAULT 'active',
  stripe_subscription_id   TEXT UNIQUE,
  stripe_price_id          TEXT,
  current_period_start     TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  cancel_at_period_end     BOOLEAN DEFAULT FALSE,

  -- TBS infrastructure (inactive until Stage 2)
  token_split_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  token_split_pct          NUMERIC(5,2) DEFAULT 50.00,

  -- Day pass specific
  day_pass_expires_at      TIMESTAMPTZ,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 6. REVENUE EVENTS (tokenomics-ready from day 1)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.revenue_events (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type                TEXT NOT NULL CHECK (event_type IN (
                              'subscription_new', 'subscription_renewal', 'subscription_upgrade',
                              'subscription_downgrade', 'day_pass', 'refund'
                            )),
  amount_cents              INTEGER NOT NULL,
  currency                  TEXT NOT NULL DEFAULT 'usd',
  stripe_payment_intent_id  TEXT,
  plan                      TEXT,
  distributable_usd         NUMERIC(10, 4) DEFAULT 0,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. AIQ POINTS LEDGER
-- ============================================================
CREATE TABLE IF NOT EXISTS public.aiq_points_ledger (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'bonus')),
  points_delta     INTEGER NOT NULL,
  balance_after    INTEGER NOT NULL,
  description      TEXT NOT NULL,
  reference_id     UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  conversation_id  UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  filename         TEXT NOT NULL,
  file_path        TEXT NOT NULL,
  file_size        INTEGER NOT NULL,
  mime_type        TEXT NOT NULL,
  analysis_status  TEXT NOT NULL DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'complete', 'failed')),
  extracted_text   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. CLIENT MEMORY (pgvector semantic search)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.client_memory (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  agent_type      TEXT NOT NULL,
  content         TEXT NOT NULL,
  embedding       vector(1536),
  memory_type     TEXT NOT NULL DEFAULT 'context' CHECK (memory_type IN ('fact', 'preference', 'context', 'goal')),
  relevance_score NUMERIC(4, 3) DEFAULT 1.0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_memory_user_id_idx ON public.client_memory(user_id);
CREATE INDEX IF NOT EXISTS client_memory_embedding_idx ON public.client_memory
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- 10. CONCIERGE ROUTING LOGS (product intelligence)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.concierge_routing_logs (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  raw_input          TEXT NOT NULL,
  classified_intent  TEXT,
  routed_to_agent    TEXT,
  confidence_score   NUMERIC(4, 3),
  was_routable       BOOLEAN NOT NULL DEFAULT TRUE,
  fallback_reason    TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 11. AGENT SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agent_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  agent_type       TEXT NOT NULL,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  total_tokens     INTEGER DEFAULT 0,
  thinking_tokens  INTEGER DEFAULT 0,
  tools_used       TEXT[] DEFAULT '{}',
  outcome          TEXT CHECK (outcome IN ('completed', 'handed_off', 'error', 'limit_reached'))
);

-- ============================================================
-- 12. PLATFORM SETTINGS (configurable without deploys)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('free_message_limit', '5', 'Max messages per month on free tier'),
  ('pro_message_limit', '100', 'Max messages per month on pro tier'),
  ('aiq_points_per_dollar', '100', 'AIQ points earned per USD paid'),
  ('day_pass_duration_hours', '24', 'Duration of day pass in hours'),
  ('research_agent_message_cost', '2', 'How many messages the research agent counts as'),
  ('dgpogp_holder_threshold', '10000', 'Min DGPOGP to qualify for holder perks'),
  ('disclaimer_version', '1.0', 'Current disclaimer version requiring acceptance')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 13–17. TBS INFRASTRUCTURE (inactive — Stage 2+)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_token_vault (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  total_dgpogp        NUMERIC(20, 4) DEFAULT 0,
  total_usdc_invested NUMERIC(10, 4) DEFAULT 0,
  avg_cost_basis      NUMERIC(10, 8) DEFAULT 0,
  current_value_usdc  NUMERIC(10, 4) DEFAULT 0,
  locked_until        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.token_purchases (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_payment_id UUID REFERENCES public.revenue_events(id),
  usdc_spent              NUMERIC(10, 4) NOT NULL,
  dgpogp_received         NUMERIC(20, 4) NOT NULL,
  price_per_token         NUMERIC(10, 8) NOT NULL,
  solana_tx_sig           TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.token_payouts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenure_months   INTEGER NOT NULL,
  tier            TEXT NOT NULL,
  usage_score     NUMERIC(5, 2),
  payout_pct      NUMERIC(5, 2) NOT NULL,
  dgpogp_sold     NUMERIC(20, 4) NOT NULL,
  usdc_returned   NUMERIC(10, 4) NOT NULL,
  solana_tx_sig   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.treasury_positions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocol      TEXT NOT NULL,
  position_type TEXT NOT NULL,
  amount_usdc   NUMERIC(10, 4) NOT NULL,
  target_apy    NUMERIC(6, 4),
  opened_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at     TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'liquidated'))
);

CREATE TABLE IF NOT EXISTS public.yield_distributions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_usdc    NUMERIC(10, 4) NOT NULL,
  source_protocol TEXT NOT NULL,
  period_start   TIMESTAMPTZ NOT NULL,
  period_end     TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disclaimer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concierge_routing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aiq_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_token_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yield_distributions ENABLE ROW LEVEL SECURITY;

-- Users: can only see/update their own row
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Conversations: own only
CREATE POLICY "conversations_own" ON public.conversations FOR ALL USING (auth.uid() = user_id);

-- Messages: own only
CREATE POLICY "messages_own" ON public.messages FOR ALL USING (auth.uid() = user_id);

-- Subscriptions: own only
CREATE POLICY "subscriptions_own" ON public.subscriptions FOR ALL USING (auth.uid() = user_id);

-- Documents: own only
CREATE POLICY "documents_own" ON public.documents FOR ALL USING (auth.uid() = user_id);

-- Client memory: own only
CREATE POLICY "client_memory_own" ON public.client_memory FOR ALL USING (auth.uid() = user_id);

-- Disclaimer logs: own only
CREATE POLICY "disclaimer_logs_own" ON public.disclaimer_logs FOR ALL USING (auth.uid() = user_id);

-- AIQ points: own only (read)
CREATE POLICY "aiq_points_select_own" ON public.aiq_points_ledger FOR SELECT USING (auth.uid() = user_id);

-- Revenue events: own only (read)
CREATE POLICY "revenue_events_select_own" ON public.revenue_events FOR SELECT USING (auth.uid() = user_id);

-- Agent sessions: via conversation ownership
CREATE POLICY "agent_sessions_own" ON public.agent_sessions FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE user_id = auth.uid()
    )
  );

-- Platform settings: readable by all authenticated users
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_settings_read" ON public.platform_settings FOR SELECT TO authenticated USING (TRUE);

-- Token vault: own only
CREATE POLICY "token_vault_own" ON public.user_token_vault FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "token_purchases_own" ON public.token_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "token_payouts_own" ON public.token_payouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "yield_distributions_own" ON public.yield_distributions FOR SELECT USING (auth.uid() = user_id);

-- Concierge logs: insert by authenticated, no select (admin only)
CREATE POLICY "concierge_logs_insert" ON public.concierge_routing_logs FOR INSERT TO authenticated WITH CHECK (TRUE);
