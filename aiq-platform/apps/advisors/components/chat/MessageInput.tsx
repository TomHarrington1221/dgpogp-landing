'use client'

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
  messagesRemaining?: number
}

export function MessageInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = 'Ask your question...',
  messagesRemaining,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSubmit()
    }
  }

  const isLimited = messagesRemaining !== undefined && messagesRemaining <= 0

  return (
    <div className="border-t border-border bg-bg-secondary p-4">
      {/* Message limit warning */}
      {messagesRemaining !== undefined && messagesRemaining <= 2 && messagesRemaining > 0 && (
        <div className="mb-3 flex items-center gap-2 text-xs text-gold/70 font-mono">
          <span className="w-1.5 h-1.5 bg-gold/70 rounded-full animate-pulse-gold" />
          {messagesRemaining} message{messagesRemaining !== 1 ? 's' : ''} remaining this month
          <span className="ml-auto text-text-muted cursor-pointer hover:text-gold transition-colors">
            Upgrade →
          </span>
        </div>
      )}

      <div
        className={cn(
          'flex items-end gap-3 bg-bg border rounded-lg px-4 py-3 transition-colors',
          disabled || isLimited
            ? 'border-border opacity-60'
            : 'border-border hover:border-gold/40 focus-within:border-gold/60'
        )}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLimited}
          placeholder={isLimited ? 'Message limit reached — upgrade to continue' : placeholder}
          className={cn(
            'flex-1 bg-transparent resize-none outline-none',
            'text-text-primary placeholder:text-text-muted text-sm leading-relaxed',
            'scrollbar-none min-h-[24px] max-h-[200px]'
          )}
        />

        {/* Send button */}
        <button
          onClick={onSubmit}
          disabled={disabled || isLimited || !value.trim()}
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded flex items-center justify-center transition-all duration-200',
            disabled || isLimited || !value.trim()
              ? 'text-text-muted cursor-not-allowed'
              : 'text-gold hover:bg-gold/10 cursor-pointer'
          )}
        >
          {disabled ? (
            <LoadingSpinner />
          ) : (
            <SendIcon />
          )}
        </button>
      </div>

      <p className="text-center text-text-muted text-xs mt-3">
        AIQ Advisors provides strategic guidance, not professional advice.{' '}
        <span className="text-text-muted/60">Shift+Enter for new line.</span>
      </p>
    </div>
  )
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="m22 2-7 20-4-9-9-4 20-7z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
