import { useRef, useState, useEffect, useCallback } from 'react'
import { useStore } from '../store/draftStore'
import type { Draft } from '../types/draft'

function fmtTime(ts: number): string {
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - ts
  const day = 86400000
  if (diff < day) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (diff < 7 * day) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return days[d.getDay()] + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function wordCount(text: string): number {
  return text.replace(/\s/g, '').length
}

function totalWords(draft: Draft): number {
  return (draft.chapters || []).reduce((s, ch) => s + wordCount(ch.content), 0)
}

function preview(draft: Draft): string {
  if (!draft.chapters?.length) return '暂无内容'
  const t = draft.chapters[0].content.replace(/<[^>]*>/g, '').trim()
  return t ? (t.length > 50 ? t.slice(0, 50) + '...' : t) : '暂无内容'
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: Props) {
  const { drafts, currentDraft, searchQuery, loadDrafts, selectDraft, createDraft, removeDraft, setSearchQuery } = useStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [delId, setDelId] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadDrafts() }, [loadDrafts])
  useEffect(() => { if (editingId && inputRef.current) { inputRef.current.focus(); inputRef.current.select() } }, [editingId])
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

  const filtered = searchQuery
    ? drafts.filter((d) => d.title.toLowerCase().includes(searchQuery.toLowerCase()) || (d.chapters || []).some((ch) => ch.content.toLowerCase().includes(searchQuery.toLowerCase())))
    : drafts

  const handleCreate = useCallback(async () => { await createDraft() }, [createDraft])
  const handleRename = useCallback(() => {
    useStore.getState().updateDraft({ title: editVal.trim() || '未命名灵感' })
    setEditingId(null)
  }, [editVal])

  return (
    <aside className={`sidebar ${open ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-title">灵感列表</h2>
        <button className="btn-icon sidebar-close" onClick={onClose} title="关闭侧栏">✕</button>
      </div>
      <div className="sidebar-actions">
        <button className="btn-primary sidebar-new-btn" onClick={handleCreate}>+ 新灵感</button>
      </div>
      <div className="sidebar-search">
        <input type="text" className="search-input" placeholder="搜索灵感..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>
      <div className="sidebar-list">
        {filtered.length === 0 ? (
          <div className="sidebar-empty">{searchQuery ? '没有找到匹配的灵感' : '还没有灵感，点击上方按钮记录一个吧'}</div>
        ) : filtered.map((draft) => (
          <div key={draft.id} className={`sidebar-item ${currentDraft?.id === draft.id ? 'active' : ''}`} onClick={() => selectDraft(draft)}>
            <div className="sidebar-item-top">
              {editingId === draft.id ? (
                <input ref={inputRef} className="sidebar-item-edit" value={editVal} onChange={(e) => setEditVal(e.target.value)} onBlur={handleRename} onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingId(null) }} onClick={(e) => e.stopPropagation()} />
              ) : (
                <span className="sidebar-item-title" onDoubleClick={(e) => { e.stopPropagation(); setEditingId(draft.id); setEditVal(draft.title) }}>{draft.title}</span>
              )}
              <button className="btn-icon btn-delete" onClick={(e) => { e.stopPropagation(); setDelId(delId === draft.id ? null : draft.id) }} title="删除">🗑</button>
            </div>
            {delId === draft.id && (
              <div className="delete-confirm">
                <span>确认删除？</span>
                <button className="btn-danger-sm" onClick={(e) => { e.stopPropagation(); removeDraft(draft.id); setDelId(null) }}>删除</button>
                <button className="btn-cancel-sm" onClick={(e) => { e.stopPropagation(); setDelId(null) }}>取消</button>
              </div>
            )}
            <div className="sidebar-item-meta">
              <span className="sidebar-item-words">{totalWords(draft)}字</span>
              <span className="sidebar-item-chapters">{draft.chapters.length}章</span>
            </div>
            <div className="sidebar-item-preview">{preview(draft)}</div>
            <div className="sidebar-item-time" key={tick}>{fmtTime(draft.updatedAt)}</div>
          </div>
        ))}
      </div>
    </aside>
  )
}
