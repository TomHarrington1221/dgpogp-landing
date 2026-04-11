import { cn } from '@/lib/utils'
import { AGENT_DISPLAY_NAMES } from '@/lib/agents'
import type { AgentType } from '@aiq/db'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  agentType?: AgentType
  isStreaming?: boolean
  userName?: string
}

const AGENT_COLORS: Partial<Record<AgentType, string>> = {
  legal: 'text-gold',
  realestate: 'text-green',
  concierge: 'text-text-secondary',
}

export function MessageBubble({
  role,
  content,
  agentType,
  isStreaming,
  userName,
}: MessageBubbleProps) {
  const isUser = role === 'user'
  const agentName = agentType ? AGENT_DISPLAY_NAMES[agentType] : 'AIQ Concierge'
  const agentColor = agentType ? (AGENT_COLORS[agentType] ?? 'text-gold') : 'text-text-secondary'

  return (
    <div
      className={cn(
        'flex gap-3 animate-slide-up',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold',
          isUser
            ? 'bg-green/20 border border-green/40 text-green'
            : 'bg-gold/10 border border-gold/30 text-gold'
        )}
      >
        {isUser ? (userName?.[0]?.toUpperCase() ?? 'U') : 'A'}
      </div>

      {/* Message content */}
      <div className={cn('flex flex-col gap-1 max-w-[80%]', isUser && 'items-end')}>
        {/* Sender label */}
        <span
          className={cn(
            'text-xs font-mono',
            isUser ? 'text-text-muted' : agentColor
          )}
        >
          {isUser ? (userName ?? 'You') : agentName}
        </span>

        {/* Bubble */}
        <div
          className={cn(
            'rounded-lg px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'bg-bg-elevated border border-border text-text-primary'
              : 'bg-bg-secondary border border-border text-text-primary'
          )}
        >
          <FormattedContent content={content} />
          {isStreaming && (
            <span className="inline-block w-0.5 h-4 bg-gold ml-0.5 animate-cursor-blink" />
          )}
        </div>
      </div>
    </div>
  )
}

// Simple markdown-like formatting
function FormattedContent({ content }: { content: string }) {
  // Split on double newlines for paragraphs
  const paragraphs = content.split('\n\n')

  return (
    <div className="space-y-3">
      {paragraphs.map((para, i) => {
        // Bold: **text**
        const formatted = para
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          // Italic: *text*
          .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
          // Inline code: `code`
          .replace(/`(.*?)`/g, '<code class="bg-bg-elevated px-1 py-0.5 rounded text-gold font-mono text-xs">$1</code>')

        // Bullet lists
        if (para.startsWith('- ') || para.includes('\n- ')) {
          const items = para.split('\n').filter((l) => l.trim())
          return (
            <ul key={i} className="list-none space-y-1.5">
              {items.map((item, j) => {
                const text = item.replace(/^-\s+/, '')
                return (
                  <li key={j} className="flex gap-2">
                    <span className="text-gold mt-1 flex-shrink-0">·</span>
                    <span dangerouslySetInnerHTML={{
                      __html: text
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/`(.*?)`/g, '<code class="bg-bg-elevated px-1 py-0.5 rounded text-gold font-mono text-xs">$1</code>')
                    }} />
                  </li>
                )
              })}
            </ul>
          )
        }

        // Italic disclaimer lines
        if (para.startsWith('*') && para.endsWith('*') && !para.startsWith('**')) {
          return (
            <p
              key={i}
              className="text-text-muted text-xs italic border-l-2 border-border pl-3"
              dangerouslySetInnerHTML={{ __html: formatted }}
            />
          )
        }

        return (
          <p
            key={i}
            dangerouslySetInnerHTML={{ __html: formatted }}
          />
        )
      })}
    </div>
  )
}
