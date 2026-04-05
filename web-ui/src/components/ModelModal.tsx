import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Cpu, Loader2, Wrench, Wifi, WifiOff, RefreshCw, Zap } from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'
import { cn } from '@/utils/cn'
import type { AvailableModel } from '@/types'

const PROVIDER_ORDER = ['anthropic', 'moonshot', 'openai', 'xai', 'ollama'] as const

const PROVIDER_META: Record<string, { label: string; badge: string; color: string }> = {
  anthropic: { label: 'Anthropic', badge: 'badge-violet', color: 'var(--accent-2)' },
  moonshot: { label: 'Moonshot AI', badge: 'badge-violet', color: '#d2a8ff' },
  openai: { label: 'OpenAI', badge: 'badge-green', color: 'var(--green-text)' },
  xai: { label: 'xAI', badge: 'badge-blue', color: 'var(--blue-text)' },
  ollama: { label: 'Ollama (Local)', badge: 'badge-orange', color: 'var(--orange-text)' },
}

export function ModelModal() {
  const {
    isModelModalOpen,
    setModelModalOpen,
    currentModel,
    setModel,
    availableModels,
    modelsLoading,
    fetchModels,
  } = useChatStore()

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(currentModel.name)

  // Fetch models when modal opens
  useEffect(() => {
    if (isModelModalOpen) {
      setSelected(currentModel.name)
      if (availableModels.length === 0) {
        fetchModels()
      }
    }
  }, [isModelModalOpen])

  const filtered = useMemo(() => {
    if (!search.trim()) return availableModels
    const q = search.toLowerCase()
    return availableModels.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    )
  }, [availableModels, search])

  // Group by provider
  const grouped = useMemo(() => {
    const map: Record<string, AvailableModel[]> = {}
    for (const m of filtered) {
      if (!map[m.provider]) map[m.provider] = []
      map[m.provider].push(m)
    }
    return map
  }, [filtered])

  const handleApply = () => {
    const found = availableModels.find((m) => m.id === selected)
    setModel({
      name: selected,
      provider: (found?.provider as any) ?? 'local',
      displayName: found?.name ?? selected,
      supportsTools: found?.supportsTools ?? true,
    })
    setModelModalOpen(false)
  }

  const handleSelect = (model: AvailableModel) => {
    setSelected(model.id)
  }

  const handleRefresh = () => {
    fetchModels()
  }

  const providerOrder = PROVIDER_ORDER.filter((p) => grouped[p]?.length)
  // Add any unknown providers from Ollama
  for (const p of Object.keys(grouped)) {
    if (!providerOrder.includes(p as any)) providerOrder.push(p as any)
  }

  return (
    <AnimatePresence>
      {isModelModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModelModalOpen(false)}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
          >
            <div
              className="w-full max-w-lg pointer-events-auto rounded-xl overflow-hidden flex flex-col"
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                maxHeight: '85vh',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(124,58,237,0.2)' }}
                  >
                    <Cpu className="w-4 h-4" style={{ color: 'var(--accent-2)' }} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                      Select Model
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Choose your AI model
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRefresh}
                    className={cn('btn-ghost p-1.5 rounded-md', modelsLoading && 'animate-spin-slow')}
                    title="Refresh model list"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setModelModalOpen(false)}
                    className="btn-ghost p-1.5 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                    style={{ color: 'var(--text-dim)' }}
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search models..."
                    className="input-base w-full pl-9 text-sm"
                  />
                </div>
              </div>

              {/* Current selection display */}
              {selected && (
                <div
                  className="px-4 py-2 flex-shrink-0 flex items-center gap-2"
                  style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Selected:</span>
                  <code
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      background: 'rgba(124,58,237,0.12)',
                      color: 'var(--accent-2)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {selected}
                  </code>
                  {availableModels.find((m) => m.id === selected)?.supportsTools && (
                    <span className="badge-green flex items-center gap-1">
                      <Wrench className="w-2.5 h-2.5" />
                      Tools
                    </span>
                  )}
                </div>
              )}

              {/* Model list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {modelsLoading && availableModels.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-2)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Fetching available models...
                    </p>
                  </div>
                ) : availableModels.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <WifiOff className="w-6 h-6" style={{ color: 'var(--text-dim)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Backend offline — enter model name manually
                    </p>
                    <input
                      type="text"
                      value={selected}
                      onChange={(e) => setSelected(e.target.value)}
                      placeholder="e.g. claude-sonnet-4-6"
                      className="input-base text-sm w-72"
                    />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No models match "{search}"</p>
                  </div>
                ) : (
                  providerOrder.map((provider) => {
                    const models = grouped[provider]
                    if (!models?.length) return null
                    const meta = PROVIDER_META[provider] ?? {
                      label: provider,
                      badge: 'badge-violet',
                      color: 'var(--accent-2)',
                    }
                    return (
                      <div key={provider}>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="section-label">{meta.label}</p>
                          {provider === 'ollama' && (
                            <span className="badge-orange flex items-center gap-1">
                              <Wifi className="w-2.5 h-2.5" />
                              Local
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {models.map((model) => (
                            <ModelCard
                              key={model.id}
                              model={model}
                              isSelected={selected === model.id}
                              onSelect={handleSelect}
                              providerColor={meta.color}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <button
                  onClick={() => setModelModalOpen(false)}
                  className="btn-ghost px-4 py-2 text-sm rounded-md"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleApply}
                  disabled={!selected.trim()}
                  className="btn-accent px-5 py-2 text-sm rounded-lg disabled:opacity-40"
                >
                  Apply Model
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Model Card ────────────────────────────────────────────────────────────

interface ModelCardProps {
  model: AvailableModel
  isSelected: boolean
  onSelect: (model: AvailableModel) => void
  providerColor: string
}

function ModelCard({ model, isSelected, onSelect, providerColor }: ModelCardProps) {
  return (
    <motion.button
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(model)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
      style={{
        background: isSelected ? 'rgba(124,58,237,0.12)' : 'var(--surface)',
        border: `1px solid ${isSelected ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`,
      }}
    >
      {/* Dot indicator */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{
          background: isSelected ? providerColor : 'var(--border-2)',
          boxShadow: isSelected ? `0 0 8px ${providerColor}` : 'none',
          transition: 'all 150ms ease',
        }}
      />

      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{ color: isSelected ? 'var(--text)' : 'var(--text-muted)' }}
        >
          {model.name}
        </p>
        <p
          className="text-xs truncate mt-0.5"
          style={{ color: 'var(--text-dim)' }}
        >
          {model.description}
        </p>
      </div>

      {model.isRecommended && (
        <span className="badge-violet flex items-center gap-1 flex-shrink-0 animate-pulse-slow">
          <Zap className="w-2.5 h-2.5 fill-current" />
          Recommended
        </span>
      )}

      {model.supportsTools && (
        <span className="badge-green flex items-center gap-1 flex-shrink-0">
          <Wrench className="w-2.5 h-2.5" />
          Tools
        </span>
      )}

      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent)' }}
        >
          <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      )}
    </motion.button>
  )
}
