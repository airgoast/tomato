export interface AiMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export interface Chapter {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface SystemPrompt {
  worldSetting: string
  characterBuilding: string
  writingStyle: string
  plotProgression: string
}

export interface Draft {
  id: string
  title: string
  chapters: Chapter[]
  createdAt: number
  updatedAt: number
  tags: string[]
  systemPrompt: SystemPrompt
}

export interface ElectronAPI {
  loadDrafts: () => Promise<string>
  saveDrafts: (json: string) => Promise<boolean>
  saveFileDialog: () => Promise<string | null>
  openFileDialog: () => Promise<string | null>
  exportDrafts: (path: string, json: string) => Promise<boolean>
  importDrafts: (path: string) => Promise<string>
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  isMaximized: () => Promise<boolean>
  onMenuNew: (cb: () => void) => void
  onMenuExport: (cb: () => void) => void
  onMenuImport: (cb: () => void) => void
  loadAppState: () => Promise<string>
  saveAppState: (json: string) => Promise<boolean>
  loadAiConfig: () => Promise<string>
  saveAiConfig: (json: string) => Promise<boolean>
  loadAiConversations: () => Promise<string>
  saveAiConversations: (json: string) => Promise<boolean>
  aiChat: (apiUrl: string, apiKey: string, body: string) => Promise<void>
  onAiChunk: (cb: (delta: string) => void) => void
  onAiDone: (cb: () => void) => void
  onAiError: (cb: (msg: string) => void) => void
  removeAiListeners: () => void
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
