import { motion } from 'framer-motion'
import { Plus, FolderOpen, BookOpen, Menu, Cpu } from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'

export function MobileNav() {
  const {
    toggleSidebar,
    isSidebarOpen,
    activeTool,
    setActiveTool,
    setModelModalOpen,
    createSession,
    clearMessages,
  } = useChatStore()

  const handleNewChat = () => {
    clearMessages()
    createSession()
  }

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 z-40"
      style={{
        background: 'var(--bg-subtle)',
        borderTop: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center justify-around h-full max-w-lg mx-auto px-2">
        {/* Menu */}
        <MobileNavButton
          icon={<Menu className="w-5 h-5" />}
          label="Menu"
          onClick={toggleSidebar}
          active={isSidebarOpen}
        />

        {/* Files */}
        <MobileNavButton
          icon={<FolderOpen className="w-5 h-5" />}
          label="Files"
          onClick={() => setActiveTool(activeTool === 'files' ? null : 'files')}
          active={activeTool === 'files'}
        />

        {/* New Chat — center FAB */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={handleNewChat}
          className="flex flex-col items-center justify-center -mt-4"
        >
          <div
            className="w-13 h-13 rounded-full flex items-center justify-center shadow-xl"
            style={{
              background: 'var(--accent)',
              boxShadow: '0 4px 20px var(--accent-glow)',
              width: '52px',
              height: '52px',
            }}
          >
            <Plus className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-medium mt-1" style={{ color: 'var(--text-dim)' }}>
            New
          </span>
        </motion.button>

        {/* Skills */}
        <MobileNavButton
          icon={<BookOpen className="w-5 h-5" />}
          label="Skills"
          onClick={() => setActiveTool(activeTool === 'skills' ? null : 'skills')}
          active={activeTool === 'skills'}
        />

        {/* Model */}
        <MobileNavButton
          icon={<Cpu className="w-5 h-5" />}
          label="Model"
          onClick={() => setModelModalOpen(true)}
        />
      </div>
    </motion.nav>
  )
}

interface MobileNavButtonProps {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  active?: boolean
}

function MobileNavButton({ icon, label, onClick, active }: MobileNavButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
      className="flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all"
      style={{ color: active ? 'var(--accent-2)' : 'var(--text-dim)' }}
    >
      {icon}
      <span className="text-[10px] font-medium mt-0.5">{label}</span>
    </motion.button>
  )
}
