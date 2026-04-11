import type { AgentType } from '@aiq/db'
import type { AgentConfig } from './types'
import { LEGAL_ADVISOR_CONFIG } from './legal'
import { REAL_ESTATE_ADVISOR_CONFIG } from './realestate'
import { MODELS } from './types'

export * from './types'
export * from './concierge'
export { LEGAL_ADVISOR_CONFIG } from './legal'
export { REAL_ESTATE_ADVISOR_CONFIG } from './realestate'

export function getAgentConfig(agentType: AgentType): AgentConfig {
  switch (agentType) {
    case 'legal':
      return LEGAL_ADVISOR_CONFIG
    case 'realestate':
      return REAL_ESTATE_ADVISOR_CONFIG
    default:
      // Fallback — concierge handles anything unmatched
      return {
        type: 'concierge',
        model: MODELS.HAIKU,
        maxTokens: 1024,
        systemPrompt:
          'You are the AIQ Concierge. Help the user navigate the platform and find the right advisor.',
      }
  }
}
