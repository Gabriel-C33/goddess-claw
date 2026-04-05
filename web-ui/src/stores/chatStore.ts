import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Message,
  ChatSession,
  ModelConfig,
  ConnectionStatus,
  FileTreeItem,
  Theme,
  AvailableModel,
  StoredConversation,
} from '@/types'
import { generateId } from '@/utils/format'

// Debounce helper for saving
let syncTimer: ReturnType<typeof setTimeout> | null = null
const SYNC_DEBOUNCE_MS = 1500

// Determine the API base URL
function getApiBase(): string {
  const host = window.location.hostname
  const isLocalhost = host === 'localhost' || host === '127.0.0.1'
  const isIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
  // Direct backend for localhost/IP; domain access uses proxy (relative path)
  if (isLocalhost || isIP) {
    return `http://${host}:8989`
  }
  return ''
}

interface ChatState {
  // Connection
  connectionStatus: ConnectionStatus
  setConnectionStatus: (status: ConnectionStatus) => void

  // Messages
  messages: Message[]
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string
  updateMessage: (id: string, updates: Partial<Message>) => void
  clearMessages: () => void
  streamingMessageId: string | null
  setStreamingMessageId: (id: string | null) => void

  // Sessions
  sessions: ChatSession[]
  currentSessionId: string | null
  createSession: () => void
  switchSession: (id: string) => void
  deleteSession: (id: string) => void
  updateSessionTitle: (id: string, title: string) => void
  syncSessionToBackend: (id?: string) => Promise<void>
  debouncedSync: () => void
  flushSync: () => Promise<void>
  loadSessionsFromBackend: () => Promise<void>

  // Model
  currentModel: ModelConfig
  setModel: (model: ModelConfig) => void
  isModelModalOpen: boolean
  setModelModalOpen: (open: boolean) => void

  // Available models (fetched from backend)
  availableModels: AvailableModel[]
  modelsLoading: boolean
  fetchModels: () => Promise<void>

  // Sidebar
  isSidebarOpen: boolean
  toggleSidebar: () => void
  activeTool: string | null
  setActiveTool: (tool: string | null) => void
  sidebarTab: 'chats' | 'projects'
  setSidebarTab: (tab: 'chats' | 'projects') => void

  // Theme
  theme: Theme
  setTheme: (theme: Theme) => void

  // File Explorer
  fileTree: FileTreeItem[]
  setFileTree: (tree: FileTreeItem[]) => void
  expandedFolders: Set<string>
  toggleFolder: (path: string) => void

  // UI State
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  error: string | null
  setError: (error: string | null) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Connection
      connectionStatus: 'connecting',
      setConnectionStatus: (status) => set({ connectionStatus: status }),

      // Messages
      messages: [],
      addMessage: (message) => {
        const newMessage: Message = {
          ...message,
          id: generateId(),
          timestamp: new Date(),
        }

        // Auto-create a session if none exists and this is a user message
        let { currentSessionId } = get()
        if (!currentSessionId && message.role === 'user') {
          const newSession: ChatSession = {
            id: generateId(),
            title: (message.content || 'New Chat').slice(0, 50).trim(),
            messages: [],
            model: get().currentModel.name,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          set((state) => ({
            sessions: [newSession, ...state.sessions],
            currentSessionId: newSession.id,
          }))
          currentSessionId = newSession.id
        }

        set((state) => ({
          messages: [...state.messages, newMessage],
        }))

        // Auto-update session title on first user message
        if (message.role === 'user' && currentSessionId) {
          const { messages: msgs } = get()
          const userMsgs = msgs.filter((m) => m.role === 'user')
          if (userMsgs.length === 1) {
            const session = get().sessions.find((s) => s.id === currentSessionId)
            if (session && session.title === 'New Chat') {
              get().updateSessionTitle(currentSessionId, (message.content || '').slice(0, 50).trim() || 'New Chat')
            }
          }
        }

        // Debounced save — don't hammer the backend on every token
        get().debouncedSync()
        return newMessage.id
      },
      updateMessage: (id, updates) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        }))
      },
      clearMessages: () => set({ messages: [] }),
      streamingMessageId: null,
      setStreamingMessageId: (id) => set({ streamingMessageId: id }),

      // Sessions
      sessions: [],
      currentSessionId: null,
      createSession: () => {
        const newSession: ChatSession = {
          id: generateId(),
          title: 'New Chat',
          messages: [],
          model: get().currentModel.name,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: newSession.id,
          messages: [],
        }))
        get().syncSessionToBackend(newSession.id)
      },
      switchSession: (id) => {
        const session = get().sessions.find((s) => s.id === id)
        if (session) {
          set({
            currentSessionId: id,
            messages: session.messages,
          })
        }
      },
      deleteSession: (id) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          currentSessionId:
            state.currentSessionId === id ? null : state.currentSessionId,
          messages: state.currentSessionId === id ? [] : state.messages,
        }))
        // Also delete from backend
        const base = getApiBase()
        fetch(`${base}/api/conversations/${id}`, { method: 'DELETE' }).catch(() => {})
      },
      updateSessionTitle: (id, title) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, title, updatedAt: new Date() } : s
          ),
        }))
        get().syncSessionToBackend(id)
      },

      // Persist session to backend SQLite
      syncSessionToBackend: async (targetId?: string) => {
        const { currentSessionId, sessions, messages, currentModel } = get()
        const idToSave = targetId || currentSessionId
        if (!idToSave) return
        
        const session = sessions.find((s) => s.id === idToSave)
        if (!session) return

        // If saving the active session, grab the latest active messages
        const messagesToSave = idToSave === currentSessionId ? messages : session.messages

        // Sync messages into session locally before DB write
        const updatedSession = { ...session, messages: messagesToSave, updatedAt: new Date() }
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === idToSave ? updatedSession : s
          ),
        }))

        const stored: StoredConversation = {
          id: idToSave,
          title: updatedSession.title,
          model: session.model || currentModel.name,
          created_at: new Date(updatedSession.createdAt).getTime(),
          updated_at: Date.now(),
          messages_json: JSON.stringify(messagesToSave),
        }

        const base = getApiBase()
        try {
          await fetch(`${base}/api/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stored),
          })
        } catch {
          // Silently fail — local Zustand state is the source of truth
        }
      },

      // Debounced sync — batches rapid updates (e.g. streaming tokens)
      debouncedSync: () => {
        if (syncTimer) clearTimeout(syncTimer)
        syncTimer = setTimeout(() => {
          get().syncSessionToBackend()
        }, SYNC_DEBOUNCE_MS)
      },

      // Flush immediately (call on 'done' event)
      flushSync: async () => {
        if (syncTimer) {
          clearTimeout(syncTimer)
          syncTimer = null
        }
        await get().syncSessionToBackend()
      },

      // Load sessions from SQLite backend — merges with local, preferring newer data
      loadSessionsFromBackend: async () => {
        const base = getApiBase()
        try {
          const resp = await fetch(`${base}/api/conversations`)
          if (!resp.ok) return
          const stored: StoredConversation[] = await resp.json()

          const parseMessages = (json: string): Message[] => {
            try {
              const parsed = JSON.parse(json) as any[]
              return parsed.map((m: any) => ({
                ...m,
                timestamp: new Date(m.timestamp),
                isThinking: false,
                isStreaming: false,
                toolCalls: m.toolCalls?.map((tc: any) => ({
                  ...tc,
                  timestamp: tc.timestamp ? new Date(tc.timestamp) : new Date(),
                })),
              })) as Message[]
            } catch {
              return []
            }
          }

          const backendMap = new Map<string, ChatSession>()
          for (const c of stored) {
            backendMap.set(c.id, {
              id: c.id,
              title: c.title,
              model: c.model,
              messages: parseMessages(c.messages_json),
              createdAt: new Date(c.created_at),
              updatedAt: new Date(c.updated_at),
            })
          }

          const { sessions: localSessions } = get()
          const merged = new Map<string, ChatSession>()

          // Add all local sessions
          for (const s of localSessions) {
            merged.set(s.id, s)
          }

          // Merge backend sessions — prefer whichever is newer
          for (const [id, backendSession] of backendMap) {
            const local = merged.get(id)
            if (!local) {
              merged.set(id, backendSession)
            } else {
              const localTime = new Date(local.updatedAt).getTime()
              const backendTime = new Date(backendSession.updatedAt).getTime()
              if (backendTime > localTime) {
                merged.set(id, backendSession)
              }
            }
          }

          const allSessions = Array.from(merged.values()).sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )

          set({ sessions: allSessions })
        } catch {
          // Backend unavailable — keep local state
        }
      },

      // Model
      currentModel: { name: 'kimi-k2.5:cloud', provider: 'moonshot', displayName: 'Kimi K2.5', supportsTools: true },
      setModel: (model) => {
        const { currentSessionId } = get()
        set({ currentModel: model })
        
        // If we have an active session, update its model too so it persists
        if (currentSessionId) {
          set((state) => ({
            sessions: state.sessions.map((s) =>
              s.id === currentSessionId ? { ...s, model: model.name } : s
            ),
          }))
          // Trigger a backend sync for the session model change
          get().syncSessionToBackend(currentSessionId)
        }
      },
      isModelModalOpen: false,
      setModelModalOpen: (open) => set({ isModelModalOpen: open }),

      // Available models
      availableModels: [],
      modelsLoading: false,
      fetchModels: async () => {
        set({ modelsLoading: true })
        const base = getApiBase()
        try {
          const resp = await fetch(`${base}/api/models`)
          if (resp.ok) {
            let models: AvailableModel[] = await resp.json()

            // Backend already filters to only usable models for this system
            // Mark recommended coding models
            const bestCoders = ['qwen2.5-coder:7b', 'llama3.1:8b', 'qwen2.5:7b', 'claude-sonnet-4-6', 'kimi-k2.5:cloud']
            models = models.map((m) => ({
              ...m,
              isRecommended: bestCoders.some((pref) => m.id === pref || m.id.startsWith(pref)),
            }))

            set({ availableModels: models })

            // Auto-select best model if current one isn't in the available list
            const current = get().currentModel
            const currentAvailable = models.find((m) => m.id === current.name)
            if (!currentAvailable && models.length > 0) {
              // Prefer recommended model, then first available
              const recommended = models.find((m) => m.isRecommended) || models[0]
              get().setModel({
                name: recommended.id,
                provider: recommended.provider as any,
                displayName: recommended.name,
                supportsTools: recommended.supportsTools,
              })
            }
          }
        } catch {
          // Backend not available — show empty
        } finally {
          set({ modelsLoading: false })
        }
      },

      // Sidebar
      isSidebarOpen: true,
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      activeTool: null,
      setActiveTool: (tool) => set({ activeTool: tool }),
      sidebarTab: 'chats',
      setSidebarTab: (tab) => set({ sidebarTab: tab }),

      // Theme
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme })
        const root = document.documentElement
        root.classList.remove('dark', 'light')
        if (theme !== 'system') root.classList.add(theme)
      },

      // File Explorer
      fileTree: [],
      setFileTree: (tree) => set({ fileTree: tree }),
      expandedFolders: new Set(),
      toggleFolder: (path) => {
        set((state) => {
          const newSet = new Set(state.expandedFolders)
          if (newSet.has(path)) {
            newSet.delete(path)
          } else {
            newSet.add(path)
          }
          return { expandedFolders: newSet }
        })
      },

      // UI State
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
      error: null,
      setError: (error) => set({ error }),
    }),
    {
      name: 'claw-code-storage-v3',
      partialize: (state) => ({
        theme: state.theme,
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        currentModel: state.currentModel,
        isSidebarOpen: state.isSidebarOpen,
        sidebarTab: state.sidebarTab,
      }),
    }
  )
)
