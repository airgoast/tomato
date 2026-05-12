import type { Draft } from '../types/draft'

const api = window.api

function migrateDraft(raw: any): Draft {
  const now = raw.updatedAt || raw.createdAt || Date.now()
  const ch = raw.chapters && Array.isArray(raw.chapters)
    ? raw.chapters
    : [{ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 9), title: '第1章', content: raw.content || '', createdAt: now, updatedAt: now }]
  return {
    id: raw.id,
    title: raw.title || '未命名灵感',
    chapters: ch,
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
    tags: raw.tags || [],
    systemPrompt: raw.systemPrompt || { worldSetting: '', characterBuilding: '', writingStyle: '', plotProgression: '' },
  }
}

export async function getAllDrafts(): Promise<Draft[]> {
  const json = await api.loadDrafts()
  const raw: any[] = JSON.parse(json)
  return raw.map(migrateDraft).sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function saveAllDrafts(drafts: Draft[]): Promise<void> {
  await api.saveDrafts(JSON.stringify(drafts, null, 2))
}

export async function saveDraft(draft: Draft): Promise<void> {
  const all = await getAllDrafts()
  const idx = all.findIndex((d) => d.id === draft.id)
  if (idx >= 0) all[idx] = draft
  else all.unshift(draft)
  await saveAllDrafts(all)
}

export async function deleteDraft(id: string): Promise<void> {
  const all = await getAllDrafts()
  await saveAllDrafts(all.filter((d) => d.id !== id))
}

export async function exportDrafts(): Promise<boolean> {
  const filePath = await api.saveFileDialog()
  if (!filePath) return false
  const json = await api.loadDrafts()
  await api.exportDrafts(filePath, json)
  return true
}

export async function importDrafts(): Promise<number> {
  const filePath = await api.openFileDialog()
  if (!filePath) return 0
  const importedJson = await api.importDrafts(filePath)
  const imported: Draft[] = JSON.parse(importedJson).map(migrateDraft)
  const existing = await getAllDrafts()
  const map = new Map<string, Draft>()
  for (const d of [...imported, ...existing]) map.set(d.id, d)
  await saveAllDrafts(Array.from(map.values()))
  return imported.length
}

export interface AppState {
  currentDraftId: string | null
  currentChapterId: string | null
  sidebarOpen: boolean
  chapterNavOpen: boolean
  aiSidebarOpen: boolean
  showSystemPrompt: boolean
  editorFontSize: number
  aiFontSize: number
}

export async function loadAppState(): Promise<AppState | null> {
  try {
    const json = await api.loadAppState()
    return JSON.parse(json) as AppState
  } catch {
    return null
  }
}

export async function saveAppState(state: AppState): Promise<void> {
  await api.saveAppState(JSON.stringify(state))
}
