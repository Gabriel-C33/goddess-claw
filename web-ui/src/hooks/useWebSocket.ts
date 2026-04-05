import { useEffect, useRef, useCallback } from 'react'
import { useChatStore } from '@/stores/chatStore'
import { useLocalFSStore } from '@/hooks/useLocalFS'
import { isRemoteDevice } from '@/utils/remote'
import type { ToolCall } from '@/types'

interface WebSocketMessage {
  type: string
  [key: string]: any
}

// Determine WebSocket URL based on current environment
function getWebSocketUrl(): string {
  const host = window.location.hostname
  const isLocalhost = host === 'localhost' || host === '127.0.0.1'
  const isIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'

  // Direct backend access when using IP or localhost in dev
  if (isLocalhost || isIP) {
    return `${proto}://${host}:8989/ws`
  }

  // Domain access — use same host (proxied by Vite dev server or nginx)
  return `${proto}://${window.location.host}/ws`
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const reconnectDelayRef = useRef<number>(1000)
  const currentStreamingIdRef = useRef<string | null>(null)
  const currentToolCallsRef = useRef<Map<string, ToolCall>>(new Map())

  const setConnectionStatus = useChatStore((state) => state.setConnectionStatus)
  const addMessage = useChatStore((state) => state.addMessage)
  const updateMessage = useChatStore((state) => state.updateMessage)
  const setStreamingMessageId = useChatStore((state) => state.setStreamingMessageId)
  const setModel = useChatStore((state) => state.setModel)

  const handleMessage = useCallback((msg: WebSocketMessage) => {
    console.log('WebSocket message:', msg)

    switch (msg.type) {
      case 'model':
        {
          const avail = useChatStore.getState().availableModels
          const found = avail.find((m) => m.id === msg.name)
          setModel({
            name: msg.name,
            provider: (found?.provider as any) ?? 'local',
            displayName: found?.name ?? msg.name,
            supportsTools: found?.supportsTools ?? true,
          })
        }
        break

      case 'thinking':
        // Create or update a "thinking" placeholder message
        if (!currentStreamingIdRef.current) {
          const id = addMessage({
            role: 'assistant',
            content: '',
            isStreaming: true,
            isThinking: true,
          })
          currentStreamingIdRef.current = id
          setStreamingMessageId(id)
        } else {
          updateMessage(currentStreamingIdRef.current, {
            isThinking: true,
          })
        }
        break

      case 'token':
        if (!currentStreamingIdRef.current) {
          const id = addMessage({
            role: 'assistant',
            content: msg.text,
            isStreaming: true,
          })
          currentStreamingIdRef.current = id
          setStreamingMessageId(id)
        } else {
          const currentMsg = useChatStore.getState().messages.find(m => m.id === currentStreamingIdRef.current)
          if (currentMsg) {
            updateMessage(currentStreamingIdRef.current, {
              content: currentMsg.content + msg.text,
              isThinking: false,
            })
          }
        }
        break

      case 'tool_start':
        if (currentStreamingIdRef.current) {
          const toolId = msg.id || `${msg.name}_${Date.now()}`
          const toolCall: ToolCall = {
            id: toolId,
            name: msg.name,
            input: msg.input || '',
            status: 'running',
            timestamp: new Date(),
          }
          currentToolCallsRef.current.set(toolId, toolCall)

          const currentMessage = useChatStore.getState().messages.find(m => m.id === currentStreamingIdRef.current)
          if (currentMessage) {
            updateMessage(currentStreamingIdRef.current, {
              toolCalls: [...(currentMessage.toolCalls || []), toolCall],
            })
          }
        }
        break

      case 'tool_end':
        if (currentStreamingIdRef.current) {
          // Find the tool call by name (since backend doesn't send id in tool_end)
          const currentMessage = useChatStore.getState().messages.find(m => m.id === currentStreamingIdRef.current)
          if (currentMessage?.toolCalls) {
            const updatedToolCalls: ToolCall[] = currentMessage.toolCalls.map(tc =>
              tc.name === msg.name && tc.status === 'running'
                ? { ...tc, output: msg.output, isError: msg.is_error, status: msg.is_error ? 'error' : 'completed' }
                : tc
            )
            updateMessage(currentStreamingIdRef.current, { toolCalls: updatedToolCalls })
          }
        }
        break

      case 'tool_request':
        // Server asks us to execute a file tool locally (PWA mode)
        {
          const fs = useLocalFSStore.getState()
          if (fs.isActive) {
            fs.executeTool(msg.name, msg.input || {}).then(({ output, isError }) => {
              // Send result back to server
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  type: 'tool_result',
                  id: msg.id,
                  output,
                  is_error: isError,
                }))
              }
            })
          } else {
            // No local FS — send error back
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'tool_result',
                id: msg.id,
                output: 'No local workspace selected. Please open a workspace folder first.',
                is_error: true,
              }))
            }
          }
        }
        break

      case 'done':
        if (currentStreamingIdRef.current) {
          updateMessage(currentStreamingIdRef.current, { isStreaming: false, isThinking: false })
          currentStreamingIdRef.current = null
          currentToolCallsRef.current.clear()
          setStreamingMessageId(null)
          // Flush conversation to backend immediately when response is complete
          useChatStore.getState().flushSync()
        }
        break

      case 'error':
        addMessage({
          role: 'error',
          content: msg.message,
        })
        currentStreamingIdRef.current = null
        currentToolCallsRef.current.clear()
        setStreamingMessageId(null)
        break
    }
  }, [addMessage, updateMessage, setStreamingMessageId, setModel])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setConnectionStatus('connecting')
    const wsUrl = getWebSocketUrl()
    console.log('Connecting to WebSocket:', wsUrl)

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      setConnectionStatus('connected')
      reconnectDelayRef.current = 1000 // reset backoff on successful connect
      console.log('WebSocket connected')
    }

    ws.onclose = () => {
      setConnectionStatus('disconnected')
      wsRef.current = null

      // If we were streaming, finalize the message so the UI doesn't get stuck
      if (currentStreamingIdRef.current) {
        updateMessage(currentStreamingIdRef.current, { isStreaming: false, isThinking: false })
        currentStreamingIdRef.current = null
        currentToolCallsRef.current.clear()
        setStreamingMessageId(null)
      }

      const delay = reconnectDelayRef.current
      reconnectDelayRef.current = Math.min(delay * 1.5, 15000) // backoff up to 15s
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect()
      }, delay)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setConnectionStatus('disconnected')
    }

    ws.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data)
        handleMessage(msg)
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }

    wsRef.current = ws
  }, [setConnectionStatus, handleMessage])

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Ensure a session exists before adding the message
      const state = useChatStore.getState()
      if (!state.currentSessionId) {
        state.createSession()
      }
      // On remote devices, always use local FS mode (files on user's device)
      const localFs = useLocalFSStore.getState().isActive || isRemoteDevice()
      wsRef.current.send(JSON.stringify({ type: 'chat', content, local_fs: localFs }))
      addMessage({
        role: 'user',
        content,
      })
    } else {
      console.error('WebSocket not connected')
    }
  }, [addMessage])

  const stopGeneration = useCallback(() => {
    // Close the socket to abort the server-side stream, then reconnect
    if (currentStreamingIdRef.current) {
      updateMessage(currentStreamingIdRef.current, { isStreaming: false, isThinking: false })
      currentStreamingIdRef.current = null
      currentToolCallsRef.current.clear()
      setStreamingMessageId(null)
    }
    // Kill connection — onclose will trigger reconnect automatically
    if (wsRef.current) {
      wsRef.current.close()
    }
  }, [updateMessage, setStreamingMessageId])

  const sendModelUpdate = useCallback((modelName: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'set_model', model: modelName }))
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      wsRef.current?.close()
    }
  }, [connect])

  return {
    sendMessage,
    stopGeneration,
    setModel: sendModelUpdate,
    isConnected: useChatStore((state) => state.connectionStatus === 'connected'),
  }
}
