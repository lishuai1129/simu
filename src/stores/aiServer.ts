import { ref } from 'vue'
import { defineStore } from 'pinia'

export type AiMessageRole = 'user' | 'assistant'
export type AiMessageState = 'complete' | 'streaming' | 'error'

export interface AiMessage {
  id: string
  role: AiMessageRole
  content: string
  state: AiMessageState
  createdAt: number
}

const CONVERSATION_KEY = 'simu20-ai-conversation-id'
const MESSAGE_KEY = 'simu20-ai-messages'
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

function createId(prefix: string) {
  const uuid = globalThis.crypto?.randomUUID?.()
  return `${prefix}-${uuid ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`
}

function loadConversationId() {
  const stored = localStorage.getItem(CONVERSATION_KEY)
  if (stored) return stored
  const conversationId = createId('conv')
  localStorage.setItem(CONVERSATION_KEY, conversationId)
  return conversationId
}

function loadMessages(): AiMessage[] {
  try {
    const stored = localStorage.getItem(MESSAGE_KEY)
    if (!stored) return []
    const messages = JSON.parse(stored) as AiMessage[]
    return messages
      .filter((message) => message.id && message.role && typeof message.content === 'string')
      .map((message) => ({
        ...message,
        state: message.state === 'streaming' ? 'complete' : message.state,
      }))
      .slice(-80)
  } catch {
    return []
  }
}

function responseErrorMessage(text: string, status: number) {
  try {
    const payload = JSON.parse(text) as { msg?: string; message?: string }
    return payload.msg || payload.message || `AI 请求失败（HTTP ${status}）`
  } catch {
    return text || `AI 请求失败（HTTP ${status}）`
  }
}

export const useAiStore = defineStore('ai', () => {
  const conversationId = ref(loadConversationId())
  const messages = ref<AiMessage[]>(loadMessages())
  const streaming = ref(false)
  const clearing = ref(false)
  const lastError = ref('')
  let activeController: AbortController | null = null

  function persistMessages() {
    localStorage.setItem(MESSAGE_KEY, JSON.stringify(messages.value.slice(-80)))
  }

  function appendChunk(messageId: string, chunk: string) {
    const message = messages.value.find((item) => item.id === messageId)
    if (message) message.content += chunk
  }

  async function consumeEventStream(response: Response, messageId: string) {
    if (!response.body) throw new Error('当前浏览器无法读取 AI 流式响应')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let streamFinished = false

    const processEvent = (eventText: string) => {
      const data = eventText
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).replace(/^ /, ''))
        .join('\n')

      if (!data) return
      if (data.trim() === '[DONE]') {
        streamFinished = true
        return
      }
      appendChunk(messageId, data)
    }

    while (!streamFinished) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let separator = buffer.match(/\r?\n\r?\n/)
      while (separator?.index !== undefined) {
        processEvent(buffer.slice(0, separator.index))
        buffer = buffer.slice(separator.index + separator[0].length)
        if (streamFinished) {
          await reader.cancel()
          break
        }
        separator = buffer.match(/\r?\n\r?\n/)
      }
    }

    buffer += decoder.decode()
    if (!streamFinished && buffer.trim()) processEvent(buffer)
  }

  async function sendMessage(content: string) {
    const text = content.trim()
    if (!text || streaming.value) return

    const userMessage: AiMessage = {
      id: createId('user'),
      role: 'user',
      content: text,
      state: 'complete',
      createdAt: Date.now(),
    }
    const assistantMessage: AiMessage = {
      id: createId('assistant'),
      role: 'assistant',
      content: '',
      state: 'streaming',
      createdAt: Date.now(),
    }
    messages.value.push(userMessage, assistantMessage)
    persistMessages()

    const controller = new AbortController()
    activeController = controller
    streaming.value = true
    lastError.value = ''

    try {
      const response = await fetch(`${apiBaseUrl}/api/ai/stream`, {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId: conversationId.value, message: text }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(responseErrorMessage(await response.text(), response.status))
      }

      await consumeEventStream(response, assistantMessage.id)
      assistantMessage.state = 'complete'
      if (!assistantMessage.content.trim()) assistantMessage.content = '任务已处理完成。'
    } catch (error) {
      if (controller.signal.aborted) {
        assistantMessage.state = 'complete'
        if (!assistantMessage.content.trim()) assistantMessage.content = '已停止生成。'
      } else {
        const message = error instanceof Error ? error.message : 'AI 对话请求失败'
        assistantMessage.state = 'error'
        assistantMessage.content ||= message
        lastError.value = message
        throw error
      }
    } finally {
      if (activeController === controller) activeController = null
      streaming.value = false
      persistMessages()
    }
  }

  function stopStreaming() {
    activeController?.abort()
  }

  async function clearHistory() {
    if (streaming.value) stopStreaming()
    clearing.value = true
    lastError.value = ''
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/ai/history/${encodeURIComponent(conversationId.value)}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        throw new Error(responseErrorMessage(await response.text(), response.status))
      }
      messages.value = []
      localStorage.removeItem(MESSAGE_KEY)
    } finally {
      clearing.value = false
    }
  }

  return {
    conversationId,
    messages,
    streaming,
    clearing,
    lastError,
    sendMessage,
    stopStreaming,
    clearHistory,
  }
})
