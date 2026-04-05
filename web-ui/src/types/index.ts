export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'error'
  content: string
  timestamp: Date
  toolCalls?: ToolCall[]
  isStreaming?: boolean
  isThinking?: boolean
}

export interface ToolCall {
  id: string
  name: string
  input?: string
  output?: string
  isError?: boolean
  status: 'running' | 'completed' | 'error'
  timestamp: Date
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  model: string
  createdAt: Date
  updatedAt: Date
}

export type ModelProvider = 'anthropic' | 'openai' | 'xai' | 'ollama' | 'moonshot' | 'local'

export interface ModelConfig {
  name: string
  provider: ModelProvider
  displayName?: string
  supportsTools?: boolean
  temperature?: number
  maxTokens?: number
}

export interface AvailableModel {
  id: string
  name: string
  provider: ModelProvider
  supportsTools: boolean
  description: string
  isRecommended?: boolean
}

export interface Project {
  id: string
  title: string
  model: string
  createdAt: number
  updatedAt: number
  messageCount: number
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting'

export interface FileTreeItem {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeItem[]
  isExpanded?: boolean
}

export type Theme = 'dark' | 'light' | 'system'

// Stored conversation shape matching the backend
export interface StoredConversation {
  id: string
  title: string
  model: string
  created_at: number
  updated_at: number
  messages_json: string
}
