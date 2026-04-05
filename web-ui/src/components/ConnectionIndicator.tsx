import { useChatStore } from '@/stores/chatStore'
import { Loader2 } from 'lucide-react'

export function ConnectionIndicator() {
  const status = useChatStore((state) => state.connectionStatus)

  const config = {
    connected: {
      dotClass: 'status-dot connected',
      text: 'Connected',
      textColor: 'var(--green-text)',
      bg: 'var(--green-bg)',
      border: 'rgba(63,185,80,0.2)',
    },
    disconnected: {
      dotClass: 'status-dot disconnected',
      text: 'Offline',
      textColor: 'var(--red-text)',
      bg: 'var(--red-bg)',
      border: 'rgba(248,81,73,0.2)',
    },
    connecting: {
      dotClass: 'status-dot connecting',
      text: 'Connecting',
      textColor: 'var(--yellow-text)',
      bg: 'rgba(227,179,65,0.08)',
      border: 'rgba(227,179,65,0.2)',
    },
  }[status]

  return (
    <div
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-md flex-1 text-xs font-medium"
      style={{ background: config.bg, border: `1px solid ${config.border}`, color: config.textColor }}
    >
      {status === 'connecting' ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <div className={config.dotClass} />
      )}
      <span>{config.text}</span>
    </div>
  )
}
