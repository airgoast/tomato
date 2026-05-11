import { create } from 'zustand'
import type { SystemPrompt } from '../types/draft'

export interface AiMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export interface AiConfig {
  apiUrl: string
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
}

interface AiStore {
  config: AiConfig
  messages: AiMessage[]
  loading: boolean
  error: string | null
  systemPromptEnabled: boolean
  selectedText: string
  updateConfig: (updates: Partial<AiConfig>) => void
  sendMessage: (content: string, systemPrompt?: SystemPrompt) => Promise<void>
  clearMessages: () => void
  clearError: () => void
  validateConfig: () => string | null
  toggleSystemPrompt: () => void
  setSelectedText: (text: string) => void
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

export const useAiStore = create<AiStore>((set, get) => ({
  config: {
    apiUrl: '',
    apiKey: '',
    model: '',
    maxTokens: 2048,
    temperature: 0.7,
  },
  messages: [],
  loading: false,
  error: null,
  systemPromptEnabled: true,
  selectedText: '',

  updateConfig: (updates) => {
    const config = { ...get().config, ...updates }
    set({ config })
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
    set((s) => ({ messages: [...s.messages, userMsg], loading: true, error: null }))

    const assistantId = uid()
    const assistantMsg: AiMessage = { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() }
    set((s) => ({ messages: [...s.messages, assistantMsg] }))

    try {
      const apiMessages: { role: string; content: string }[] = []

      if (systemPromptEnabled && systemPrompt) {
        const sysContent = buildSystemContent(systemPrompt)
        if (sysContent) apiMessages.push({ role: 'system', content: sysContent })
      }

      const history = get().messages.filter((m) => m.id !== assistantId)
      for (const m of history) {
        apiMessages.push({ role: m.role, content: m.content })
      }

      const response = await fetch(config.apiUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: config.model.trim(),
          messages: apiMessages,
          max_tokens: config.maxTokens,
          temperature: config.temperature,
          stream: true,
        }),
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        throw new Error(`API 请求失败 (${response.status}): ${errText || response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取响应流')

      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data:')) continue
          const data = trimmed.slice(5).trim()
          if (data === '[DONE]') continue

          try {
            const json = JSON.parse(data)
            const delta = json.choices?.[0]?.delta?.content
            if (delta) {
              accumulated += delta
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.id === assistantId ? { ...m, content: accumulated } : m
                ),
              }))
            }
          } catch {
            continue
          }
        }
      }

      if (!accumulated) {
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === assistantId ? { ...m, content: '（AI 未返回内容）' } : m
          ),
        }))
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '未知错误'
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantId ? { ...m, content: `❌ ${msg}` } : m
        ),
        error: msg,
      }))
    } finally {
      set({ loading: false })
    }
  },

  clearMessages: () => set({ messages: [], error: null }),
  clearError: () => set({ error: null }),
}))
