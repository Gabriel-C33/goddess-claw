/**
 * WorkspaceGate — shown on remote devices when no local workspace is picked.
 * Forces the user to pick a folder so the AI writes files on THEIR device,
 * not on the server.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { FolderOpen, HardDrive, Wifi, AlertTriangle, ArrowRight } from 'lucide-react'
import { useLocalFSStore } from '@/hooks/useLocalFS'
import { isRemoteDevice, hasFileSystemAccess } from '@/utils/remote'

export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const { isActive, pickDirectory } = useLocalFSStore()
  const [skipped, setSkipped] = useState(false)
  const remote = isRemoteDevice()
  const hasFS = hasFileSystemAccess()

  // On localhost or if workspace is active or user skipped — show the app
  if (!remote || isActive || skipped) {
    return <>{children}</>
  }

  // Remote device without workspace — show gate
  return (
    <div
      className="h-screen w-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full rounded-2xl p-8 space-y-6"
        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
      >
        {/* Icon */}
        <div className="flex justify-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              boxShadow: '0 8px 32px var(--accent-glow)',
            }}
          >
            <HardDrive className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            Choose a Workspace Folder
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            You're accessing GoddessClaw from a remote device. Pick a folder on
            <strong style={{ color: 'var(--accent-2)' }}> this device</strong> so the AI can
            create and edit files directly here.
          </p>
        </div>

        {/* Info box */}
        <div
          className="flex items-start gap-3 p-3 rounded-lg text-xs"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}
        >
          <Wifi className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-2)' }} />
          <div style={{ color: 'var(--text-muted)' }}>
            <p><strong style={{ color: 'var(--text)' }}>How it works:</strong> The AI thinks on the server, but all
            file operations (read, write, create folders) happen on your device using the browser's
            File System Access API.</p>
          </div>
        </div>

        {/* Buttons */}
        {hasFS ? (
          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={pickDirectory}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                color: 'white',
                boxShadow: '0 4px 16px var(--accent-glow)',
              }}
            >
              <FolderOpen className="w-4 h-4" />
              Open Workspace Folder
            </motion.button>

            <button
              onClick={() => setSkipped(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs transition-all"
              style={{ color: 'var(--text-dim)', border: '1px solid var(--border)' }}
            >
              <ArrowRight className="w-3 h-3" />
              Skip — files will be created on the server instead
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              className="flex items-start gap-2 p-3 rounded-lg text-xs"
              style={{ background: 'rgba(227,179,65,0.08)', border: '1px solid rgba(227,179,65,0.2)' }}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--yellow-text)' }} />
              <p style={{ color: 'var(--text-muted)' }}>
                Your browser doesn't support the File System Access API.
                Use <strong>Chrome, Edge, or Opera</strong> on desktop for local file access.
                Files will be created on the server instead.
              </p>
            </div>
            <button
              onClick={() => setSkipped(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              Continue Anyway
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
