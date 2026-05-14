import { create } from 'zustand'
import type { SystemPrompt, AiMessage } from '../types/draft'

export type { AiMessage }

export interface AiConversation {
  id: string
  name: string
  messages: AiMessage[]
}

export interface AiConfig {
  apiUrl: string
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
  thinkingEnabled: boolean
}

const MAX_CONVERSATIONS = 5
const API_HISTORY_ROUNDS = 10

interface AiStore {
  config: AiConfig
  conversations: AiConversation[]
  currentConversationId: string | null
  messages: AiMessage[]
  loading: boolean
  error: string | null
  systemPromptEnabled: boolean
  selectedText: string
  configLoaded: boolean
  updateConfig: (updates: Partial<AiConfig>) => void
  sendMessage: (content: string, systemPrompt?: SystemPrompt) => Promise<void>
  clearMessages: () => void
  clearError: () => void
  validateConfig: () => string | null
  toggleSystemPrompt: () => void
  setSelectedText: (text: string) => void
  loadConfig: () => Promise<void>
  loadConversations: () => Promise<void>
  switchConversation: (id: string) => void
  addConversation: () => void
  deleteConversation: (id: string) => void
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function buildSystemContent(sp: SystemPrompt): string {
  const parts: string[] = []
  if (sp.worldSetting.trim()) parts.push(`【世界观设定】\n${sp.worldSetting.trim()}`)
  if (sp.characterBuilding.trim()) parts.push(`【人物塑造】\n${sp.characterBuilding.trim()}`)
  if (sp.writingStyle.trim()) parts.push(`【写作风格】\n${sp.writingStyle.trim()}`)
  if (sp.plotProgression.trim()) parts.push(`【情节推进】\n${sp.plotProgression.trim()}`)
  if (parts.length === 0) return ''
  return `你是一位专业的小说创作助手。以下是当前作品的创作背景信息，请基于这些信息来辅助创作：\n\n${parts.join('\n\n')}`
}

const defaultConfig: AiConfig = {
  apiUrl: '',
  apiKey: '',
  model: '',
  maxTokens: 2048,
  temperature: 0.7,
  thinkingEnabled: false,
}

const defaultConversation: AiConversation = { id: uid(), name: '对话1', messages: [] }

function persistConversations(conversations: AiConversation[], currentId: string | null, messages: AiMessage[]) {
  const updated = conversations.map((c) =>
    c.id === currentId ? { ...c, messages: [...messages] } : c
  )
  window.api.saveAiConversations(JSON.stringify(updated)).catch(() => {})
}

export const useAiStore = create<AiStore>((set, get) => ({
  config: { ...defaultConfig },
  conversations: [{ ...defaultConversation }],
  currentConversationId: defaultConversation.id,
  messages: [],
  loading: false,
  error: null,
  systemPromptEnabled: true,
  selectedText: '',
  configLoaded: false,

  loadConfig: async () => {
    try {
      const json = await window.api.loadAiConfig()
      const saved = JSON.parse(json)
      if (saved && typeof saved === 'object') {
        set({ config: { ...defaultConfig, ...saved }, configLoaded: true })
      } else {
        set({ configLoaded: true })
      }
    } catch {
      set({ configLoaded: true })
    }
  },

  loadConversations: async () => {
    try {
      const json = await window.api.loadAiConversations()
      const saved: AiConversation[] = JSON.parse(json)
      if (Array.isArray(saved) && saved.length > 0) {
        const first = saved[0]
        set({
          conversations: saved,
          currentConversationId: first.id,
          messages: [...first.messages],
        })
      }
    } catch {
      // keep defaults
    }
  },

  updateConfig: (updates) => {
    const config = { ...get().config, ...updates }
    set({ config })
    window.api.saveAiConfig(JSON.stringify(config)).catch(() => {})
  },

  validateConfig: () => {
    const { apiUrl, apiKey, model } = get().config
    if (!apiUrl.trim()) return '请填写 API 地址'
    if (!apiKey.trim()) return '请填写 API Key'
    if (!model.trim()) return '请填写模型名称'
    try { new URL(apiUrl.trim()) } catch { return 'API 地址格式不正确' }
    return null
  },

  toggleSystemPrompt: () => set((s) => ({ systemPromptEnabled: !s.systemPromptEnabled })),
  setSelectedText: (text) => set({ selectedText: text }),

  switchConversation: (id) => {
    const { conversations, currentConversationId, messages } = get()
    const updated = conversations.map((c) =>
      c.id === currentConversationId ? { ...c, messages: [...messages] } : c
    )
    const target = updated.find((c) => c.id === id)
    if (!target) return
    set({ conversations: updated, currentConversationId: id, messages: [...target.messages] })
    persistConversations(updated, id, [...target.messages])
  },

  addConversation: () => {
    const { conversations, currentConversationId, messages } = get()
    if (conversations.length >= MAX_CONVERSATIONS) return
    const updated = conversations.map((c) =>
      c.id === currentConversationId ? { ...c, messages: [...messages] } : c
    )
    const num = updated.reduce((max, c) => {
      const m = c.name.match(/^对话(\d+)$/)
      return m ? Math.max(max, Number(m[1])) : max
    }, 0) + 1
    const newConv: AiConversation = { id: uid(), name: `对话${num}`, messages: [] }
    const all = [...updated, newConv]
    set({ conversations: all, currentConversationId: newConv.id, messages: [] })
    persistConversations(all, newConv.id, [])
  },

  deleteConversation: (id) => {
    const { conversations, currentConversationId, messages } = get()
    if (conversations.length <= 1) return
    const updated = conversations.map((c) =>
      c.id === currentConversationId ? { ...c, messages: [...messages] } : c
    )
    const remaining = updated.filter((c) => c.id !== id)
    let newId = currentConversationId
    let newMsgs: AiMessage[] = []
    if (currentConversationId === id) {
      newId = remaining[0].id
      newMsgs = [...remaining[0].messages]
    } else {
      const cur = remaining.find((c) => c.id === currentConversationId)
      newMsgs = cur ? [...cur.messages] : []
    }
    set({ conversations: remaining, currentConversationId: newId, messages: newMsgs })
    persistConversations(remaining, newId, newMsgs)
  },

  sendMessage: async (content: string, systemPrompt?: SystemPrompt) => {
    const { config, validateConfig, systemPromptEnabled, selectedText } = get()
    const configError = validateConfig()
    if (configError) {
      set({ error: configError })
      return
    }

    let fullContent = content
    if (selectedText) {
      fullContent = `[针对以下选中内容进行分析/润色/优化]\n"${selectedText}"\n\n${content}`
    }

    const userMsg: AiMessage = { id: uid(), role: 'user', content: fullContent, timestamp: Date.now() }
    const newMessages = [...get().messages, userMsg]
    set({ messages: newMessages, loading: true, error: null })

    const assistantId = uid()
    set({ messages: [...newMessages, { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() }] })

    const apiMessages: { role: string; content: string }[] = []

    if (systemPromptEnabled && systemPrompt) {
      const sysContent = buildSystemContent(systemPrompt)
      if (sysContent) apiMessages.push({ role: 'system', content: sysContent })
    }

    const historyForApi = newMessages.slice(-(API_HISTORY_ROUNDS * 2))
    for (const m of historyForApi) {
      apiMessages.push({ role: m.role, content: m.content })
    }

    const bodyObj: Record<string, unknown> = {
      model: config.model.trim(),
      messages: apiMessages,
      max_tokens: config.maxTokens,
      stream: true,
    }
    if (config.thinkingEnabled) {
      bodyObj.thinking = { type: 'enabled' }
    } else {
      bodyObj.temperature = config.temperature
    }
    const body = JSON.stringify(bodyObj)

    let accumulated = ''

    window.api.onAiChunk((delta: string) => {
      accumulated += delta
      set((s) => ({ messages: s.messages.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m) }))
    })

    window.api.onAiDone(() => {
      const finalMsgs = get().messages.map((m) => m.id === assistantId ? { ...m, content: accumulated || '（AI 未返回内容）' } : m)
      set({ messages: finalMsgs, loading: false })
      window.api.removeAiListeners()
      const { conversations, currentConversationId } = get()
      persistConversations(conversations, currentConversationId, finalMsgs)
    })

    window.api.onAiError((msg: string) => {
      const finalMsgs = get().messages.map((m) => m.id === assistantId ? { ...m, content: `❌ ${msg}` } : m)
      set({ messages: finalMsgs, error: msg, loading: false })
      window.api.removeAiListeners()
      const { conversations, currentConversationId } = get()
      persistConversations(conversations, currentConversationId, finalMsgs)
    })

    try {
      await window.api.aiChat(config.apiUrl.trim(), config.apiKey.trim(), body)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '请求异常'
      if (get().loading) {
        const finalMsgs = get().messages.map((m) => m.id === assistantId ? { ...m, content: `❌ ${msg}` } : m)
        set({ messages: finalMsgs, error: msg, loading: false })
        window.api.removeAiListeners()
        const { conversations, currentConversationId } = get()
        persistConversations(conversations, currentConversationId, finalMsgs)
      }
    }
  },

  clearMessages: () => {
    set({ messages: [], error: null })
    const { conversations, currentConversationId } = get()
    persistConversations(conversations, currentConversationId, [])
  },
  clearError: () => set({ error: null }),
}))
