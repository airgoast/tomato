import { useCallback, useState, useRef, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import AiSidebar from './components/AiSidebar'
import SystemPromptPage from './components/SystemPromptPage'
import { useStore } from './store/draftStore'
import { useAiStore } from './store/aiStore'

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

function wc(text: string): number {
  return text.replace(/\s/g, '').length
}

export default function App() {
  const { currentDraft, currentChapterId, updateDraft, createDraft, addChapter, updateChapter, removeChapter, selectChapter, handleExport, handleImport, message, clearMessage, restoreAppState, persistAppState } = useStore()
  const { loadConfig } = useAiStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [chapterNavOpen, setChapterNavOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false)
  const [showSystemPrompt, setShowSystemPrompt] = useState(false)
  const [title, setTitle] = useState('')
  const [chTitle, setChTitle] = useState('')
  const [isMax, setIsMax] = useState(false)
  const [tick, setTick] = useState(0)
  const [restored, setRestored] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const curCh = (currentDraft?.chapters || []).find((ch) => ch.id === currentChapterId) ?? null
  const totalWords = currentDraft ? (currentDraft.chapters || []).reduce((s, ch) => s + wc(ch.content), 0) : 0

  useEffect(() => {
    restoreAppState().then((saved) => {
      if (saved) {
        setSidebarOpen(saved.sidebarOpen)
        setChapterNavOpen(saved.chapterNavOpen)
        setAiSidebarOpen(saved.aiSidebarOpen)
        setShowSystemPrompt(saved.showSystemPrompt)
      }
      setRestored(true)
    })
    loadConfig()
  }, [])

  useEffect(() => { if (currentDraft) setTitle(currentDraft.title) }, [currentDraft?.id])
  useEffect(() => { if (curCh) setChTitle(curCh.title) }, [currentChapterId])
  useEffect(() => { if (message) { const t = setTimeout(clearMessage, 3000); return () => clearTimeout(t) } }, [message, clearMessage])
  useEffect(() => {
    const api = window.api
    if (api?.onMenuNew) api.onMenuNew(() => createDraft())
    if (api?.onMenuExport) api.onMenuExport(() => handleExport())
    if (api?.onMenuImport) api.onMenuImport(() => handleImport())
  }, [])
  useEffect(() => { window.api?.isMaximized?.().then(setIsMax) }, [])
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!restored) return
    persistAppState({
      currentDraftId: currentDraft?.id ?? null,
      currentChapterId,
      sidebarOpen,
      chapterNavOpen,
      aiSidebarOpen,
      showSystemPrompt,
    })
  }, [restored, currentDraft?.id, currentChapterId, sidebarOpen, chapterNavOpen, aiSidebarOpen, showSystemPrompt, persistAppState])

  const onTitleChange = useCallback((v: string) => {
    setTitle(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => updateDraft({ title: v }), 500)
  }, [updateDraft])

  const onChTitleChange = useCallback((v: string) => {
    if (!currentChapterId) return
    setChTitle(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => updateChapter(currentChapterId, { title: v }), 500)
  }, [currentChapterId, updateChapter])

  const onContentChange = useCallback((content: string) => {
    if (!currentChapterId) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => updateChapter(currentChapterId, { content }), 500)
  }, [currentChapterId, updateChapter])

  const titleBar = (
    <div className="titlebar">
      <div className="titlebar-drag"><span className="titlebar-title">灵感草稿箱</span></div>
      <div className="titlebar-controls">
        <button className="titlebar-btn" onClick={() => window.api?.minimizeWindow?.()} title="最小化">─</button>
        <button className="titlebar-btn" onClick={async () => { await window.api?.maximizeWindow?.(); const m = await window.api?.isMaximized?.(); setIsMax(!!m) }} title={isMax ? '还原' : '最大化'}>{isMax ? '❐' : '□'}</button>
        <button className="titlebar-btn titlebar-close" onClick={() => window.api?.closeWindow?.()} title="关闭">✕</button>
      </div>
    </div>
  )

  const header = (
    <header className="editor-header">
      <div className="header-left">
        <button className="btn-icon hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} title={sidebarOpen ? '关闭侧栏' : '打开侧栏'}>☰</button>
        <button className="btn-icon" onClick={() => setChapterNavOpen(!chapterNavOpen)} title={chapterNavOpen ? '关闭章节栏' : '打开章节栏'}>📖</button>
      </div>
      <div className="header-right">
        <div className="header-actions">
          {currentDraft && <span className="header-words">共 {totalWords} 字</span>}
          <button className={`btn-icon prompt-btn ${showSystemPrompt ? 'active' : ''}`} onClick={() => setShowSystemPrompt(!showSystemPrompt)} title={showSystemPrompt ? '返回撰写' : '系统提示词'}>📝</button>
          <button className={`btn-icon ai-btn ${aiSidebarOpen ? 'active' : ''}`} onClick={() => setAiSidebarOpen(!aiSidebarOpen)} title={aiSidebarOpen ? '关闭 AI 助手' : 'AI 助手'}>🤖</button>
          <button className="btn-icon settings-btn" onClick={() => setSettingsOpen(!settingsOpen)} title="设置">⚙</button>
          {curCh && <span className="header-time" key={tick}>{fmtTime(curCh.updatedAt)}</span>}
        </div>
      </div>
    </header>
  )

  const chapterNav = currentDraft && currentDraft.chapters.length > 0 && (
    <nav className={`chapter-nav ${chapterNavOpen ? 'chapter-nav-open' : 'chapter-nav-closed'}`}>
      <div className="chapter-nav-header">
        <span>章节</span>
        <div className="chapter-nav-actions">
          <button className={`btn-icon chapter-delete-mode-btn ${deleteMode ? 'active' : ''}`} onClick={() => setDeleteMode(!deleteMode)} title={deleteMode ? '退出删除模式' : '删除模式'}>🗑</button>
          <button className="btn-icon chapter-add-btn" onClick={addChapter} title="添加章节">+</button>
        </div>
      </div>
      <div className="chapter-nav-list">
        {currentDraft.chapters.map((ch) => (
          <div key={ch.id} className={`chapter-nav-item ${currentChapterId === ch.id ? 'active' : ''}`} onClick={() => selectChapter(ch.id)}>
            <span className="chapter-nav-title">{ch.title}</span>
            <span className="chapter-nav-words">{wc(ch.content)}字</span>
            {deleteMode && currentDraft.chapters.length > 1 && (
              <button className="chapter-nav-delete" onClick={(e) => { e.stopPropagation(); removeChapter(ch.id) }} title="删除章节">×</button>
            )}
          </div>
        ))}
      </div>
    </nav>
  )

  const settingsPanel = settingsOpen && (
    <div className="settings-overlay" onClick={() => setSettingsOpen(false)}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>设置</h3>
          <button className="btn-icon" onClick={() => setSettingsOpen(false)}>✕</button>
        </div>
        <div className="settings-body">
          <div className="settings-section">
            <h4>数据管理</h4>
            <p className="settings-desc">导出备份你的所有灵感，或从备份中恢复数据</p>
            <div className="settings-actions">
              <button className="btn-secondary" onClick={handleExport}>📥 导出备份</button>
              <button className="btn-secondary" onClick={handleImport}>📤 导入备份</button>
            </div>
          </div>
          <div className="settings-section">
            <h4>关于</h4>
            <p className="settings-desc">灵感草稿箱 v1.0.0<br />捕捉每一个闪烁的灵感火花 ✍</p>
          </div>
        </div>
      </div>
    </div>
  )

  const toast = message && <div className="toast">{message}</div>

  if (!currentDraft) {
    return (
      <div className="app">
        {titleBar}
        <div className="app-body">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="main-content">
            {header}{settingsPanel}{toast}
            <div className="empty-state">
              <div className="empty-icon">✍</div>
              <h2>灵感草稿箱</h2>
              <p>捕捉每一个闪烁的灵感火花</p>
              <button className="btn-primary btn-lg" onClick={() => createDraft()}>写下第一个灵感</button>
            </div>
          </main>
          <AiSidebar open={aiSidebarOpen} />
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {titleBar}
      <div className="app-body">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="main-content">
          {header}{settingsPanel}{toast}
          <div className="editor-area">
            {chapterNav}
            <div className="editor-container">
              {showSystemPrompt ? (
                <SystemPromptPage />
              ) : (
                <>
                  <input className="title-input" value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="给灵感取个名字..." />
                  {curCh && (
                    <>
                      <input className="chapter-title-input" value={chTitle} onChange={(e) => onChTitleChange(e.target.value)} placeholder="章节标题..." />
                      <Editor content={curCh.content} onChange={onContentChange} placeholder="夜深人静的时候，思绪开始涌动..." />
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
        <AiSidebar open={aiSidebarOpen} />
      </div>
    </div>
  )
}
