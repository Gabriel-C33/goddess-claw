import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import {
  User,
  Terminal,
  AlertCircle,
  Wrench,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Download,
} from 'lucide-react'
import type { Message, ToolCall } from '@/types'
import { cn } from '@/utils/cn'
import { formatTime } from '@/utils/format'

interface MessageItemProps {
  message: Message
  isLast?: boolean
}

export function MessageItem({ message, isLast }: MessageItemProps) {
  const isUser = message.role === 'user'
  const isError = message.role === 'error'
  const isStreaming = message.isStreaming
  const isThinking = message.isThinking

  return (
    <div
      className={cn(
        'group flex gap-3 py-4 px-4 transition-all rounded-lg',
        isLast && !isUser && 'animate-fade-in',
      )}
      style={{
        borderLeft: isUser ? '2px solid rgba(124,58,237,0.3)' : 'none',
      }}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        <Avatar role={message.role} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-semibold text-sm"
            style={{
              color: isUser
                ? 'var(--accent-2)'
                : isError
                ? 'var(--red-text)'
                : 'var(--text)',
            }}
          >
            {isUser ? 'You' : isError ? 'Error' : 'GoddessClaw'}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
            {formatTime(message.timestamp)}
          </span>
          {isStreaming && (
            <span
              className="flex items-center gap-1.5 text-xs"
              style={{ color: isThinking ? 'var(--accent)' : 'var(--accent-2)' }}
            >
              {isThinking ? (
                <>
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--accent)' }}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span>thinking...</span>
                </>
              ) : (
                <>
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse-soft"
                    style={{ background: 'var(--accent-2)' }}
                  />
                  <span>writing...</span>
                </>
              )}
            </span>
          )}
        </div>

        {/* Message Content */}
        <div
          className={cn('prose prose-sm max-w-none')}
          style={{ color: isError ? 'var(--red-text)' : undefined }}
        >
          {isUser ? (
            <p
              className="whitespace-pre-wrap leading-relaxed text-sm"
              style={{ color: 'var(--text)' }}
            >
              {message.content}
            </p>
          ) : isThinking && !message.content ? (
            <ThinkingIndicator />
          ) : isStreaming && !message.content ? (
            <TypingIndicator />
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Tool Calls */}
        <AnimatePresence>
          {message.toolCalls?.map((toolCall) => (
            <ToolCallItem key={toolCall.id} toolCall={toolCall} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────

function Avatar({ role }: { role: Message['role'] }) {
  const isUser = role === 'user'
  const isError = role === 'error'

  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center"
      style={{
        background: isUser
          ? 'rgba(124,58,237,0.2)'
          : isError
          ? 'var(--red-bg)'
          : 'var(--surface)',
        border: `1px solid ${
          isUser
            ? 'rgba(124,58,237,0.3)'
            : isError
            ? 'rgba(248,81,73,0.3)'
            : 'var(--border)'
        }`,
      }}
    >
      {isUser ? (
        <User className="w-4 h-4" style={{ color: 'var(--accent-2)' }} />
      ) : isError ? (
        <AlertCircle className="w-4 h-4" style={{ color: 'var(--red-text)' }} />
      ) : (
        <Terminal className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
      )}
    </div>
  )
}

// ── Typing indicator ──────────────────────────────────────────────────────

function ThinkingIndicator() {
  const phrases = useMemo(() => [
    'Analyzing your request...',
    'Reasoning through the problem...',
    'Thinking deeply...',
    'Processing...',
  ], [])
  const phrase = useMemo(() => phrases[Math.floor(Math.random() * phrases.length)], [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 py-3 px-4 rounded-lg"
      style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}
    >
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--accent)' }}
            animate={{
              y: [0, -6, 0],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <motion.span
        className="text-xs font-medium"
        style={{ color: 'var(--accent)' }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {phrase}
      </motion.span>
    </motion.div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ background: 'var(--accent)' }}
          animate={{ scale: [0.85, 1, 0.85], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.16 }}
        />
      ))}
    </div>
  )
}

// ── Tool Call Item ────────────────────────────────────────────────────────

interface ToolCallItemProps {
  toolCall: ToolCall
}

function ToolCallItem({ toolCall }: ToolCallItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isRunning = toolCall.status === 'running'
  const isError = toolCall.status === 'error'

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className={cn(
        'mt-2 rounded-lg overflow-hidden tool-card',
        isRunning && 'running',
        toolCall.status === 'completed' && 'completed',
        isError && 'error'
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all"
        style={{ color: 'var(--text)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        {/* Icon */}
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
          style={{
            background: isRunning
              ? 'rgba(124,58,237,0.2)'
              : isError
              ? 'var(--red-bg)'
              : 'var(--green-bg)',
          }}
        >
          {isRunning ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
              <Wrench className="w-3 h-3" style={{ color: 'var(--accent-2)' }} />
            </motion.div>
          ) : isError ? (
            <XCircle className="w-3 h-3" style={{ color: 'var(--red-text)' }} />
          ) : (
            <CheckCircle2 className="w-3 h-3" style={{ color: 'var(--green-text)' }} />
          )}
        </div>

        {/* Name */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <code
            className="text-xs font-medium truncate"
            style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}
          >
            {toolCall.name}
          </code>
          {isRunning && (
            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
              running…
            </span>
          )}
        </div>

        {/* Status badge + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={cn(
              isRunning ? 'badge-violet' : isError ? '' : 'badge-green'
            )}
            style={
              isError
                ? {
                    background: 'var(--red-bg)',
                    color: 'var(--red-text)',
                    border: '1px solid rgba(248,81,73,0.3)',
                    borderRadius: '99px',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    padding: '2px 8px',
                  }
                : {}
            }
          >
            {toolCall.status}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" style={{ color: 'var(--text-dim)' }} />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-dim)' }} />
          )}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ borderTop: '1px solid var(--border)' }}
          >
            {toolCall.input && (
              <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <p className="section-label mb-1">Input</p>
                <pre
                  className="text-xs whitespace-pre-wrap break-all"
                  style={{
                    color: 'var(--text-muted)',
                    fontFamily: 'JetBrains Mono, monospace',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                  }}
                >
                  {toolCall.input}
                </pre>
              </div>
            )}
            {toolCall.output && (
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="section-label">Output</p>
                  {(toolCall.name === 'write_file' || toolCall.name === 'write_to_file') && (
                    <button
                      onClick={() => {
                        try {
                          const input = JSON.parse(toolCall.input || '{}');
                          const content = input.content || '';
                          const path = input.path || input.TargetFile || 'file.txt';
                          const fileName = path.split(/[/\\]/).pop() || 'file.txt';
                          const blob = new Blob([content], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = fileName;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch (e) {
                          console.error('Failed to download file', e);
                        }
                      }}
                      className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-surface-2 hover:bg-surface-3 transition-colors"
                      style={{ color: 'var(--accent-2)' }}
                    >
                      <Download className="w-2.5 h-2.5" />
                      Save to Device
                    </button>
                  )}
                </div>
                <pre
                  className="text-xs whitespace-pre-wrap break-all max-h-[240px] overflow-y-auto"
                  style={{
                    color: isError ? 'var(--red-text)' : 'var(--text-muted)',
                    fontFamily: 'JetBrains Mono, monospace',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                  }}
                >
                  {toolCall.output}
                </pre>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Code Block ────────────────────────────────────────────────────────────

interface CodeBlockProps {
  children: React.ReactNode
}

function CodeBlock({ children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const extractText = (node: React.ReactNode): string => {
      if (typeof node === 'string') return node
      if (Array.isArray(node)) return node.map(extractText).join('')
      if (node && typeof node === 'object' && 'props' in (node as any)) {
        return extractText((node as any).props?.children)
      }
      return ''
    }
    const text = extractText(children)
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="relative my-3 rounded-lg overflow-hidden"
      style={{ background: 'var(--code-bg)', border: '1px solid var(--border)' }}
    >
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <span className="text-xs" style={{ color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
          code
        </span>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const extractText = (node: React.ReactNode): string => {
                if (typeof node === 'string') return node
                if (Array.isArray(node)) return node.map(extractText).join('')
                if (node && typeof node === 'object' && 'props' in (node as any)) {
                  return extractText((node as any).props?.children)
                }
                return ''
              }
              const content = extractText(children)
              const blob = new Blob([content], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'code-snippet.txt';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text)'
              e.currentTarget.style.background = 'var(--surface-2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <Download className="w-3 h-3" />
            <span>Save</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text)'
              e.currentTarget.style.background = 'var(--surface-2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" style={{ color: 'var(--green-text)' }} />
                <span style={{ color: 'var(--green-text)' }}>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </motion.button>
        </div>
      </div>
      <pre
        style={{
          padding: '1rem',
          margin: 0,
          overflowX: 'auto',
          background: 'none',
          border: 'none',
        }}
      >
        {children}
      </pre>
    </div>
  )
}
