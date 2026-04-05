import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '@/stores/chatStore'
import { Sidebar } from '@/components/Sidebar'
import { ChatArea } from '@/components/ChatArea'
import { ModelModal } from '@/components/ModelModal'
import { FileExplorer } from '@/components/FileExplorer'
import { SkillsExplorer } from '@/components/SkillsExplorer'
import { Toaster } from '@/components/Toaster'
import { MobileNav } from '@/components/MobileNav'

function App() {
  const { isSidebarOpen, activeTool, fetchModels, loadSessionsFromBackend } = useChatStore()

  // Bootstrap: fetch models and load sessions from backend on mount
  useEffect(() => {
    fetchModels()
    loadSessionsFromBackend()
  }, [])

  return (
    <div
      className="h-screen w-screen flex overflow-hidden"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* Desktop Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="hidden md:block flex-shrink-0"
          >
            <Sidebar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
              onClick={() => useChatStore.getState().toggleSidebar()}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="md:hidden fixed left-0 top-0 bottom-0 z-50 w-[280px]"
            >
              <Sidebar isMobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex min-w-0">
        {/* File Explorer - Desktop */}
        <AnimatePresence mode="wait">
          {activeTool === 'files' && (
            <motion.div
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="hidden lg:block w-[280px] flex-shrink-0"
              style={{ borderRight: '1px solid var(--border)' }}
            >
              <FileExplorer />
            </motion.div>
          )}
        </AnimatePresence>

        {/* File Explorer - Mobile */}
        <AnimatePresence>
          {activeTool === 'files' && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 z-40"
                style={{ background: 'rgba(0,0,0,0.6)' }}
                onClick={() => useChatStore.getState().setActiveTool(null)}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className="lg:hidden fixed left-0 right-0 bottom-0 z-50 h-[70vh] rounded-t-xl overflow-hidden"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
              >
                <FileExplorer isMobile />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Skills Explorer - Desktop */}
        <AnimatePresence mode="wait">
          {activeTool === 'skills' && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="hidden lg:block w-[300px] flex-shrink-0"
              style={{ borderRight: '1px solid var(--border)' }}
            >
              <SkillsExplorer />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skills Explorer - Mobile */}
        <AnimatePresence>
          {activeTool === 'skills' && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 z-40"
                style={{ background: 'rgba(0,0,0,0.6)' }}
                onClick={() => useChatStore.getState().setActiveTool(null)}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className="lg:hidden fixed left-0 right-0 bottom-0 z-50 h-[70vh] rounded-t-xl overflow-hidden"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
              >
                <SkillsExplorer isMobile />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 min-w-0 flex flex-col pb-16 md:pb-0">
          <ChatArea />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      <ModelModal />
      <Toaster />
    </div>
  )
}

export default App
