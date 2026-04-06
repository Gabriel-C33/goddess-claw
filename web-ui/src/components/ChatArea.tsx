import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Square,
  PanelLeftOpen,
  Trash2,
  Code2,
  FileCode,
  Terminal,
  Wrench,
  Cpu,
  Zap,
  Mic,
  MicOff,
} from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'
import { cn } from '@/utils/cn'
import { MessageList } from './MessageList'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useVoice } from '@/hooks/useVoice'

const SUGGESTIONS = [
  { icon: <Code2 className="w-3.5 h-3.5" />, text: 'Analyze project structure' },
  { icon: <FileCode className="w-3.5 h-3.5" />, text: 'List all files recursively' },
  { icon: <Terminal className="w-3.5 h-3.5" />, text: 'Find and fix bugs' },
  { icon: <Wrench className="w-3.5 h-3.5" />, text: 'Review code quality' },
  { icon: <Zap className="w-3.5 h-3.5" />, text: 'Optimize performance' },
]

export function ChatArea() {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const {
    messages,
    isSidebarOpen,
    toggleSidebar,
    streamingMessageId,
    clearMessages,
    currentModel,
  } = useChatStore()

  const { sendMessage, stopGeneration, isConnected, setModel: setBackendModel } = useWebSocket()
  const { isListening, toggleListening, hasSupport } = useVoice()
  // Sync model with backend when it changes
  useEffect(() => {
    if (isConnected) {
      setBackendModel(currentModel.name)
    }
  }, [currentModel.name, isConnected, setBackendModel])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [input])

  // Session persistence is now handled by flushSync in the WebSocket 'done' handler

  const handleSend = () => {
    if (!input.trim() || !isConnected || streamingMessageId) return
    sendMessage(input.trim())
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleVoiceInput = () => {
    toggleListening((text: string, isFinal: boolean) => {
      // Append text intelligently with spacing
      setInput((prev: string) => {
        const trimmed = prev.trim()
        if (trimmed && isFinal) {
           return trimmed + ' ' + text.trim() + ' '
        } else if (trimmed) {
           return trimmed + ' ' + text.trim()
        }
        return text
      })
    })
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-full relative" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="h-12 flex items-center justify-between px-4 flex-shrink-0 hidden md:flex"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}
      >
        <div className="flex items-center gap-2">
          {!isSidebarOpen && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleSidebar}
              className="btn-ghost p-1.5 rounded-md"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </motion.button>
          )}

          <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
            {hasMessages ? 'Chat' : 'New Chat'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Model indicator */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md text-xs"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            <Cpu className="w-3 h-3" style={{ color: 'var(--accent-2)' }} />
            <span>{currentModel.displayName || currentModel.name}</span>
          </div>

          <AnimatePresence>
            {hasMessages && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearMessages}
                className="btn-ghost flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--red-text)'
                  e.currentTarget.style.background = 'var(--red-bg)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 relative pt-2 md:pt-0">
        <AnimatePresence mode="wait">
          {!hasMessages ? (
            <WelcomeScreen onSuggestion={setInput} />
          ) : (
            <MessageList messages={messages} />
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        className="p-3 md:p-4 flex-shrink-0"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-subtle)' }}
      >
        <div className="max-w-3xl mx-auto">
          <div
            className={cn(
              'chat-input-wrapper flex items-end gap-2 p-2',
              !isConnected && 'opacity-50 pointer-events-none'
            )}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isConnected
                  ? 'Ask anything about your codebase...'
                  : 'Connecting to server...'
              }
              rows={1}
              className="flex-1 min-h-[44px] max-h-[120px] bg-transparent border-0 px-3 py-2.5 text-sm resize-none focus:outline-none"
              style={{
                color: 'var(--text)',
                fontFamily: 'Inter, sans-serif',
              }}
              disabled={!isConnected}
            />
            <div className="flex items-center pb-1 pr-1">
              {streamingMessageId ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={stopGeneration}
                  className="p-2.5 rounded-lg"
                  style={{ background: 'var(--red)', color: 'white' }}
                  title="Stop generating"
                >
                  <Square className="w-3.5 h-3.5" fill="currentColor" />
                </motion.button>
              ) : (
                <div className="flex items-center gap-1">
                  {hasSupport && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleVoiceInput}
                      className={cn(
                        'p-2.5 rounded-lg transition-all',
                        isListening ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-[#2c2e33]'
                      )}
                      style={isListening ? { background: 'var(--red)' } : {}}
                      title={isListening ? 'Stop listening' : 'Start dictation'}
                    >
                      {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    disabled={!input.trim() || !isConnected}
                    className={cn(
                      'p-2.5 rounded-lg transition-all',
                      input.trim() && isConnected
                        ? 'btn-accent'
                        : ''
                    )}
                    style={
                      !(input.trim() && isConnected)
                        ? { background: 'var(--surface-2)', color: 'var(--text-dim)' }
                        : {}
                    }
                  >
                    <Send className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              )}
            </div>
          </div>

          <p className="text-center mt-2" style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
            <span className="hidden md:inline">Press Enter to send · Shift+Enter for new line</span>
            <span className="md:hidden">
              Powered by {currentModel.displayName || currentModel.name}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Welcome Screen ────────────────────────────────────────────────────────

interface WelcomeScreenProps {
  onSuggestion: (text: string) => void
}

function WelcomeScreen({ onSuggestion }: WelcomeScreenProps) {
  const { currentModel } = useChatStore()
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  // Capture PWA install prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-4"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
          boxShadow: '0 8px 32px var(--accent-glow)',
        }}
      >
        <Terminal className="w-8 h-8 text-white" />
        {/* Pulse ring */}
        <div
          className="absolute inset-0 rounded-2xl animate-pulse-soft"
          style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
            opacity: 0.25,
            transform: 'scale(1.15)',
          }}
        />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-3xl md:text-4xl font-bold text-center mb-2"
      >
        <span className="text-gradient">GoddessClaw</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center text-sm md:text-base max-w-md mb-1"
        style={{ color: 'var(--text-muted)' }}
      >
        AI coding assistant with full filesystem access
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex items-center gap-2 text-xs mb-8"
        style={{ color: 'var(--text-dim)' }}
      >
        <Cpu className="w-3 h-3" style={{ color: 'var(--accent-2)' }} />
        <span>
          {currentModel.displayName || currentModel.name}
          {currentModel.supportsTools && ' · tools enabled'}
        </span>
      </motion.div>

      {/* Suggestions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap justify-center gap-2 max-w-xl"
      >
        {SUGGESTIONS.map((suggestion, index) => (
          <SuggestionButton
            key={index}
            index={index}
            suggestion={suggestion}
            onSuggestion={onSuggestion}
          />
        ))}
      </motion.div>

      {/* PWA Install + Workspace buttons */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-wrap justify-center gap-2 mt-6"
      >
        {installPrompt && !isInstalled && (
          <button
            onClick={async () => {
              installPrompt.prompt()
              const result = await installPrompt.userChoice
              if (result.outcome === 'accepted') {
                setIsInstalled(true)
                setInstallPrompt(null)
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              color: 'white',
              boxShadow: '0 4px 16px var(--accent-glow)',
            }}
          >
            <Zap className="w-3.5 h-3.5" />
            Install App
          </button>
        )}

        {isInstalled && (
          <span
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ background: 'var(--green-bg)', color: 'var(--green-text)', border: '1px solid rgba(63,185,80,0.3)' }}
          >
            <Zap className="w-3 h-3" /> App Installed
          </span>
        )}

      </motion.div>
    </motion.div>
  )
}

// ── Suggestion Button ─────────────────────────────────────────────────────

interface SuggestionButtonProps {
  index: number
  suggestion: { icon: React.ReactNode; text: string }
  onSuggestion: (text: string) => void
}

function SuggestionButton({ index, suggestion, onSuggestion }: SuggestionButtonProps) {
  const { sendMessage } = useWebSocket()

  const handleClick = () => {
    onSuggestion(suggestion.text)
    sendMessage(suggestion.text)
  }

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 + index * 0.04 }}
      whileHover={{ y: -1, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--text-muted)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'
        e.currentTarget.style.color = 'var(--text)'
        e.currentTarget.style.background = 'var(--surface-2)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.color = 'var(--text-muted)'
        e.currentTarget.style.background = 'var(--surface)'
      }}
    >
      <span style={{ color: 'var(--accent-2)' }}>{suggestion.icon}</span>
      <span className="hidden sm:inline">{suggestion.text}</span>
      <span className="sm:hidden">{suggestion.text.split(' ').slice(0, 2).join(' ')}</span>
    </motion.button>
  )
}
