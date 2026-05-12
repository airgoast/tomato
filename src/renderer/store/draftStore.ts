import { create } from 'zustand'
import type { Draft, Chapter } from '../types/draft'
import { getAllDrafts, saveDraft, saveAllDrafts, deleteDraft, exportDrafts, importDrafts, loadAppState, saveAppState, type AppState } from '../lib/db'

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

interface Store {
  drafts: Draft[]
  currentDraft: Draft | null
  currentChapterId: string | null
  loading: boolean
  searchQuery: string
  message: string | null
  appState: AppState
  loadDrafts: () => Promise<void>
  selectDraft: (draft: Draft | null) => void
  selectChapter: (id: string | null) => void
  createDraft: () => Promise<void>
  updateDraft: (updates: Partial<Draft>) => Promise<void>
  removeDraft: (id: string) => Promise<void>
  moveDraft: (id: string, direction: 'up' | 'down') => Promise<void>
  addChapter: () => Promise<void>
  updateChapter: (id: string, updates: Partial<Chapter>) => Promise<void>
  removeChapter: (id: string) => Promise<void>
  setSearchQuery: (q: string) => void
  handleExport: () => Promise<void>
  handleImport: () => Promise<void>
  clearMessage: () => void
  restoreAppState: () => Promise<AppState>
  persistAppState: (state: Partial<AppState>) => Promise<void>
}

export const useStore = create<Store>((set, get) => ({
  drafts: [],
  currentDraft: null,
  currentChapterId: null,
  loading: false,
  searchQuery: '',
  message: null,
  appState: { currentDraftId: null, currentChapterId: null, sidebarOpen: true, chapterNavOpen: true, aiSidebarOpen: false, showSystemPrompt: false },

  loadDrafts: async () => {
    set({ loading: true })
    const drafts = await getAllDrafts()
    set({ drafts, loading: false })
  },

  selectDraft: (draft) => {
    const first = draft?.chapters?.[0]?.id ?? null
    set({ currentDraft: draft, currentChapterId: first })
  },

  selectChapter: (id) => set({ currentChapterId: id }),

  createDraft: async () => {
    const now = Date.now()
    const ch: Chapter = { id: uid(), title: '第1章', content: '', createdAt: now, updatedAt: now }
    const draft: Draft = { id: uid(), title: '未命名灵感', chapters: [ch], createdAt: now, updatedAt: now, tags: [], systemPrompt: { worldSetting: '', characterBuilding: '', writingStyle: '', plotProgression: '' } }
    await saveDraft(draft)
    const drafts = await getAllDrafts()
    set({ drafts, currentDraft: draft, currentChapterId: ch.id })
  },

  updateDraft: async (updates) => {
    const { currentDraft } = get()
    if (!currentDraft) return
    const updated: Draft = { ...currentDraft, ...updates, updatedAt: Date.now() }
    await saveDraft(updated)
    const drafts = await getAllDrafts()
    set({ drafts, currentDraft: updated })
  },

  removeDraft: async (id) => {
    await deleteDraft(id)
    const drafts = await getAllDrafts()
    const cur = get().currentDraft
    set({ drafts, currentDraft: cur?.id === id ? null : cur, currentChapterId: cur?.id === id ? null : get().currentChapterId })
  },

  moveDraft: async (id, direction) => {
    const { drafts } = get()
    const idx = drafts.findIndex((d) => d.id === id)
    if (idx < 0) return
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= drafts.length) return
    const newDrafts = [...drafts]
    const temp = newDrafts[idx]
    newDrafts[idx] = newDrafts[targetIdx]
    newDrafts[targetIdx] = temp
    await saveAllDrafts(newDrafts)
    set({ drafts: newDrafts })
  },

  addChapter: async () => {
    const { currentDraft } = get()
    if (!currentDraft) return
    const now = Date.now()
    const ch: Chapter = { id: uid(), title: `第${currentDraft.chapters.length + 1}章`, content: '', createdAt: now, updatedAt: now }
    const updated: Draft = { ...currentDraft, chapters: [...currentDraft.chapters, ch], updatedAt: now }
    await saveDraft(updated)
    const drafts = await getAllDrafts()
    set({ drafts, currentDraft: updated, currentChapterId: ch.id })
  },

  updateChapter: async (chapterId, updates) => {
    const { currentDraft } = get()
    if (!currentDraft) return
    const chapters = currentDraft.chapters.map((ch) => ch.id === chapterId ? { ...ch, ...updates, updatedAt: Date.now() } : ch)
    const updated: Draft = { ...currentDraft, chapters, updatedAt: Date.now() }
    await saveDraft(updated)
    const drafts = await getAllDrafts()
    set({ drafts, currentDraft: updated })
  },

  removeChapter: async (chapterId) => {
    const { currentDraft } = get()
    if (!currentDraft || currentDraft.chapters.length <= 1) return
    const chapters = currentDraft.chapters.filter((ch) => ch.id !== chapterId)
    const updated: Draft = { ...currentDraft, chapters, updatedAt: Date.now() }
    await saveDraft(updated)
    const drafts = await getAllDrafts()
    const newId = get().currentChapterId === chapterId ? chapters[0]?.id ?? null : get().currentChapterId
    set({ drafts, currentDraft: updated, currentChapterId: newId })
  },

  setSearchQuery: (q) => set({ searchQuery: q }),

  handleExport: async () => {
    const ok = await exportDrafts()
    if (ok) set({ message: '导出成功！' })
  },

  handleImport: async () => {
    try {
      const count = await importDrafts()
      if (count > 0) { const drafts = await getAllDrafts(); set({ drafts, message: `导入成功！共 ${count} 篇灵感` }) }
    } catch { set({ message: '导入失败，请检查文件格式' }) }
  },

  clearMessage: () => set({ message: null }),

  restoreAppState: async () => {
    const saved = await loadAppState()
    if (!saved) return get().appState
    set({ appState: saved })
    if (saved.currentDraftId) {
      const drafts = await getAllDrafts()
      const draft = drafts.find((d) => d.id === saved.currentDraftId) ?? null
      if (draft) {
        const chId = draft.chapters.some((ch) => ch.id === saved.currentChapterId) ? saved.currentChapterId : (draft.chapters[0]?.id ?? null)
        set({ currentDraft: draft, currentChapterId: chId })
      }
    }
    return saved
  },

  persistAppState: async (state) => {
    const merged = { ...get().appState, ...state }
    set({ appState: merged })
    await saveAppState(merged)
  },
}))
