import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Bug,
  GitCommit,
  FolderOpen,
  Settings,
  PanelLeftClose,
  History,
  X,
  BookOpen,
  MessageSquare,
  Archive,
  Trash2,
  ChevronRight,
  Terminal,
  Cpu,
} from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import { cn } from '@/utils/cn'
import { ConnectionIndicator } from './ConnectionIndicator'
import { useMemo } from 'react'

interface SidebarProps {
  isMobile?: boolean
}

export function Sidebar({ isMobile }: SidebarProps) {
  const {
    createSession,
    clearMessages,
    toggleSidebar,
    setActiveTool,
    activeTool,
    setModelModalOpen,
    currentModel,
    sessions,
    currentSessionId,
    switchSession,
    deleteSession,
    sidebarTab,
    setSidebarTab,
  } = useChatStore()
  const { sendMessage } = useWebSocket()

  const handleNewChat = () => {
    clearMessages()
    createSession()
    if (isMobile) toggleSidebar()
  }

  const handleSuggestion = (text: string) => {
    sendMessage(text)
    if (isMobile) toggleSidebar()
  }

  const handleFilesClick = () => {
    setActiveTool(activeTool === 'files' ? null : 'files')
    if (isMobile) toggleSidebar()
  }

  const handleSwitchSession = (id: string) => {
    switchSession(id)
    if (isMobile) toggleSidebar()
  }

  const providerBadge = useMemo(() => {
    const p = currentModel.provider
    if (p === 'anthropic') return { label: 'Anthropic', cls: 'badge-violet' }
    if (p === 'openai') return { label: 'OpenAI', cls: 'badge-green' }
    if (p === 'xai') return { label: 'xAI', cls: 'badge-blue' }
    if (p === 'ollama') return { label: 'Local', cls: 'badge-orange' }
    return { label: p, cls: 'badge-violet' }
  }, [currentModel.provider])

  return (
    <aside
      className="w-full h-full flex flex-col md:w-[272px] relative overflow-hidden"
      style={{ background: 'var(--bg-subtle)', borderRight: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-2.5 flex-1 min-w-0"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--accent)', boxShadow: '0 2px 8px var(--accent-glow)' }}
          >
            <Terminal className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>
              GoddessClaw
            </span>
            <span className="text-xs ml-1.5" style={{ color: 'var(--text-dim)' }}>dev</span>
          </div>
        </motion.div>
        <button
          onClick={toggleSidebar}
          className="btn-ghost p-1.5 rounded-md flex-shrink-0"
        >
          {isMobile ? <X className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* New Chat button */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNewChat}
          className="btn-accent w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
          <kbd
            className="ml-auto text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}
          >
            Ctrl+N
          </kbd>
        </motion.button>
      </div>

      {/* Tab bar */}
      <div className="tab-bar flex-shrink-0 px-3">
        <button
          className={cn('tab-item', sidebarTab === 'chats' && 'active')}
          onClick={() => setSidebarTab('chats')}
        >
          Chats
        </button>
        <button
          className={cn('tab-item', sidebarTab === 'projects' && 'active')}
          onClick={() => setSidebarTab('projects')}
        >
          Projects
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <AnimatePresence mode="wait">
          {sidebarTab === 'chats' ? (
            <motion.div
              key="chats"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Quick Actions */}
              <div>
                <p className="section-label mb-2">Quick Actions</p>
                <div className="space-y-0.5">
                  <NavItem
                    icon={<Search className="w-4 h-4" />}
                    label="Project Overview"
                    onClick={() => handleSuggestion('Analyze the project structure and give me an overview')}
                  />
                  <NavItem
                    icon={<Bug className="w-4 h-4" />}
                    label="Code Review"
                    onClick={() => handleSuggestion('Review the codebase for bugs, security issues, and improvements')}
                  />
                  <NavItem
                    icon={<GitCommit className="w-4 h-4" />}
                    label="Commit Message"
                    onClick={() => handleSuggestion('Generate a professional git commit message for recent changes')}
                  />
                  <NavItem
                    icon={<FolderOpen className="w-4 h-4" />}
                    label="Browse Files"
                    onClick={handleFilesClick}
                    active={activeTool === 'files'}
                  />
                  <NavItem
                    icon={<BookOpen className="w-4 h-4" />}
                    label="Skills Library"
                    onClick={() => setActiveTool(activeTool === 'skills' ? null : 'skills')}
                    active={activeTool === 'skills'}
                  />
                </div>
              </div>

              {/* Recent chats */}
              <div>
                <p className="section-label mb-2">Recent Chats</p>
                {sessions.length === 0 ? (
                  <EmptyHistory />
                ) : (
                  <div className="space-y-0.5">
                    {sessions.slice(0, 30).map((session) => (
                      <SessionItem
                        key={session.id}
                        id={session.id}
                        title={session.title}
                        isActive={session.id === currentSessionId}
                        updatedAt={session.updatedAt}
                        onSwitch={handleSwitchSession}
                        onDelete={deleteSession}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="projects"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              <ProjectsList sessions={sessions} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div
        className="p-3 space-y-2 flex-shrink-0"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {/* Model selector */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setModelModalOpen(true)
            if (isMobile) toggleSidebar()
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(124,58,237,0.2)' }}
          >
            <Cpu className="w-4 h-4" style={{ color: 'var(--accent-2)' }} />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Active Model</p>
            <p
              className="text-sm font-medium truncate"
              style={{ color: 'var(--text)' }}
            >
              {currentModel.displayName || currentModel.name}
            </p>
          </div>
          <span className={providerBadge.cls}>{providerBadge.label}</span>
        </motion.button>

        {/* Connection & settings */}
        <div className="flex items-center gap-2">
          <ConnectionIndicator />
          <button className="btn-ghost p-2 rounded-md ml-auto">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

// ── Nav Item ─────────────────────────────────────────────────────────────

interface NavItemProps {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  active?: boolean
  shortcut?: string
}

function NavItem({ icon, label, onClick, active, shortcut }: NavItemProps) {
  return (
    <motion.button
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn('nav-item w-full', active && 'active')}
    >
      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      <span className="flex-1 text-left truncate">{label}</span>
      {shortcut && (
        <kbd
          className="hidden md:block px-1 py-0.5 text-[10px] rounded"
          style={{ background: 'var(--surface-2)', color: 'var(--text-dim)' }}
        >
          {shortcut}
        </kbd>
      )}
      {active && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent-2)' }} />}
    </motion.button>
  )
}

// ── Session Item ──────────────────────────────────────────────────────────

interface SessionItemProps {
  id: string
  title: string
  isActive: boolean
  updatedAt: Date
  onSwitch: (id: string) => void
  onDelete: (id: string) => void
}

function SessionItem({ id, title, isActive, updatedAt, onSwitch, onDelete }: SessionItemProps) {
  const timeAgo = useMemo(() => {
    const now = Date.now()
    const then = new Date(updatedAt).getTime()
    const diff = now - then
    const min = Math.floor(diff / 60000)
    if (min < 1) return 'just now'
    if (min < 60) return `${min}m ago`
    const h = Math.floor(min / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }, [updatedAt])

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-all',
        isActive ? 'active nav-item' : 'nav-item'
      )}
      onClick={() => onSwitch(id)}
    >
      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isActive ? 'var(--accent-2)' : 'var(--text-dim)' }} />
      <span className="flex-1 text-sm truncate" style={{ color: isActive ? 'var(--accent-2)' : 'var(--text-muted)' }}>
        {title}
      </span>
      <span className="text-[10px] flex-shrink-0 group-hover:hidden" style={{ color: 'var(--text-dim)' }}>
        {timeAgo}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(id) }}
        className="hidden group-hover:flex p-0.5 rounded transition-colors flex-shrink-0"
        style={{ color: 'var(--text-dim)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red-text)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}

// ── Projects List ─────────────────────────────────────────────────────────

function getApiBase(): string {
  const host = window.location.hostname
  const isLocalhost = host === 'localhost' || host === '127.0.0.1'
  const isIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
  if (isLocalhost || isIP) return `http://${host}:8989`
  return ''
}

interface ChatSession {
  id: string
  title: string
  model: string
  messages: unknown[]
  createdAt: Date
  updatedAt: Date
}

function ProjectsList({ sessions }: { sessions: ChatSession[] }) {
  const handleDownload = async (session: ChatSession) => {
    const base = getApiBase()
    try {
      const resp = await fetch(`${base}/api/conversations/${session.id}/export`)
      if (!resp.ok) {
        // Export the locally stored session as JSON fallback
        downloadLocalSession(session)
        return
      }
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      downloadLocalSession(session)
    }
  }

  const downloadLocalSession = (session: ChatSession) => {
    const data = JSON.stringify(session, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (sessions.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 rounded-lg text-center"
        style={{ border: '1px dashed var(--border)', background: 'var(--surface)' }}
      >
        <Archive className="w-8 h-8 mb-3" style={{ color: 'var(--text-dim)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No projects yet</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>Start a chat to create a project</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="section-label mb-2">Download Projects</p>
      {sessions.map((session) => (
        <ProjectCard key={session.id} session={session} onDownload={handleDownload} />
      ))}
    </div>
  )
}

function ProjectCard({
  session,
  onDownload,
}: {
  session: ChatSession
  onDownload: (s: ChatSession) => void
}) {
  const msgCount = Array.isArray(session.messages) ? session.messages.length : 0

  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="p-3 rounded-lg"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p
          className="text-sm font-medium truncate flex-1"
          style={{ color: 'var(--text)' }}
        >
          {session.title}
        </p>
        <button
          onClick={() => onDownload(session)}
          className="flex-shrink-0 text-xs px-2 py-1 rounded-md transition-all"
          style={{
            background: 'rgba(124,58,237,0.15)',
            color: 'var(--accent-2)',
            border: '1px solid rgba(124,58,237,0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(124,58,237,0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(124,58,237,0.15)'
          }}
        >
          ↓ Export
        </button>
      </div>
      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-dim)' }}>
        <span>{msgCount} messages</span>
        <span>·</span>
        <span className="truncate">{session.model || 'unknown model'}</span>
      </div>
    </motion.div>
  )
}

// ── Empty History ─────────────────────────────────────────────────────────

function EmptyHistory() {
  return (
    <div
      className="flex flex-col items-center justify-center py-8 rounded-lg text-center"
      style={{ border: '1px dashed var(--border)', background: 'var(--surface)' }}
    >
      <History className="w-7 h-7 mb-2" style={{ color: 'var(--text-dim)' }} />
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No recent chats</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>Start a new conversation</p>
    </div>
  )
}
