import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useAiStore } from '../store/aiStore'
import { useStore } from '../store/draftStore'
import { marked } from 'marked'

const AI_FONT_SIZES = [12, 13, 14, 15, 16]

interface Props {
  open: boolean
  fontSize: number
  onFontSizeChange: (size: number) => void
}

export default function AiSidebar({ open, fontSize, onFontSizeChange }: Props) {
  const { config, messages, loading, error, systemPromptEnabled, selectedText, conversations, currentConversationId, updateConfig, sendMessage, clearMessages, clearError, toggleSystemPrompt, setSelectedText, switchConversation, addConversation, deleteConversation } = useAiStore()
  const { currentDraft } = useStore()
  const [configOpen, setConfigOpen] = useState(false)
  const [inputOpen, setInputOpen] = useState(true)
  const [input, setInput] = useState('')
  const [width, setWidth] = useState(320)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  const fontIdx = AI_FONT_SIZES.indexOf(fontSize)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    startX.current = e.clientX
    startW.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [width])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = startX.current - e.clientX
      const next = Math.min(600, Math.max(240, startW.current + delta))
      setWidth(next)
    }
    const onMouseUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    await sendMessage(text, currentDraft?.systemPrompt)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <aside className={`ai-sidebar ${open ? 'ai-sidebar-open' : 'ai-sidebar-closed'}`} style={open ? { width, minWidth: width } : undefined}>
      <div className="ai-resize-handle" onMouseDown={onMouseDown} />
      <div className="ai-sidebar-inner" style={{ width, minWidth: width }}>
        <div className="ai-config-section">
          <div className="ai-section-header" onClick={() => setConfigOpen(!configOpen)}>
            <span className="ai-section-title">API 配置</span>
            <span className={`ai-arrow ${configOpen ? 'ai-arrow-up' : 'ai-arrow-down'}`}>▲</span>
          </div>
          <div className={`ai-section-body ${configOpen ? 'ai-section-body-open' : 'ai-section-body-closed'}`}>
            <div className="ai-field">
              <label>API 地址</label>
              <input type="text" className="ai-input" placeholder="https://api.example.com/v1/chat/completions" value={config.apiUrl} onChange={(e) => updateConfig({ apiUrl: e.target.value })} />
            </div>
            <div className="ai-field">
              <label>API Key</label>
              <input type="password" className="ai-input" placeholder="sk-..." value={config.apiKey} onChange={(e) => updateConfig({ apiKey: e.target.value })} />
            </div>
            <div className="ai-field">
              <label>模型名称</label>
              <input type="text" className="ai-input" placeholder="gpt-3.5-turbo / deepseek-chat / ..." value={config.model} onChange={(e) => updateConfig({ model: e.target.value })} />
            </div>
            <div className="ai-field-row">
              <div className="ai-field ai-field-half">
                <label>最大 Tokens</label>
                <input type="number" className="ai-input" value={config.maxTokens} onChange={(e) => updateConfig({ maxTokens: Number(e.target.value) || 2048 })} />
              </div>
              <div className="ai-field ai-field-half">
                <label>Temperature</label>
                <input type="number" className="ai-input" step="0.1" min="0" max="2" value={config.temperature} onChange={(e) => updateConfig({ temperature: Number(e.target.value) || 0.7 })} />
              </div>
            </div>
          </div>
        </div>

        <div className="ai-divider" />

        <div className="ai-conversations-bar">
          <div className="ai-conv-tabs">
            {conversations.map((conv) => (
              <div key={conv.id} className={`ai-conv-tab ${conv.id === currentConversationId ? 'ai-conv-tab-active' : ''}`} onClick={() => switchConversation(conv.id)}>
                <span className="ai-conv-tab-name">{conv.name}</span>
                {conversations.length > 1 && (
                  <button className="ai-conv-tab-close" onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}>✕</button>
                )}
              </div>
            ))}
          </div>
          {conversations.length < 5 && (
            <button className="ai-conv-add" onClick={addConversation} title="新建对话">+</button>
          )}
          <div className="ai-font-control">
            <button className="ai-font-btn" onClick={() => onFontSizeChange(AI_FONT_SIZES[Math.max(0, fontIdx - 1)])} disabled={fontIdx <= 0} title="缩小字体">A-</button>
            <button className="ai-font-btn" onClick={() => onFontSizeChange(AI_FONT_SIZES[Math.min(AI_FONT_SIZES.length - 1, fontIdx + 1)])} disabled={fontIdx >= AI_FONT_SIZES.length - 1} title="放大字体">A+</button>
          </div>
        </div>

        <div className="ai-messages-section">
          <div className="ai-messages-list">
            {messages.length === 0 ? (
              <div className="ai-messages-empty">配置 API 后，在此与 AI 对话辅助创作</div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`ai-message ai-message-${msg.role}`} style={{ fontSize }}>
                  <div className="ai-message-role">{msg.role === 'user' ? '你' : 'AI'}</div>
                  {msg.role === 'assistant' ? (
                    <div className="ai-message-content ai-message-md" dangerouslySetInnerHTML={{ __html: msg.content ? marked.parse(msg.content) : '' }} />
                  ) : (
                    <div className="ai-message-content">{msg.content}</div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="ai-divider" />

        <div className="ai-input-section">
          <div className="ai-section-header" onClick={() => setInputOpen(!inputOpen)}>
            <span className="ai-section-title">提问</span>
            <span className={`ai-arrow ${inputOpen ? 'ai-arrow-down' : 'ai-arrow-up'}`}>▲</span>
          </div>
          <div className={`ai-input-body ${inputOpen ? 'ai-input-body-open' : 'ai-input-body-closed'}`}>
            {selectedText && (
              <div className="ai-selected-preview">
                <span className="ai-selected-label">已选中内容</span>
                <button className="ai-selected-clear" onClick={() => setSelectedText('')}>✕</button>
                <div className="ai-selected-text">{selectedText.length > 80 ? selectedText.slice(0, 80) + '...' : selectedText}</div>
              </div>
            )}
            <textarea
              className="ai-textarea"
              placeholder="输入你的问题..."
              value={input}
              onChange={(e) => { setInput(e.target.value); clearError() }}
              onKeyDown={handleKeyDown}
              rows={3}
            />
            <div className="ai-send-row">
              {error && <span className="ai-error">{error}</span>}
              <div className="ai-toggle-wrap" onClick={toggleSystemPrompt} title={systemPromptEnabled ? '系统提示词已开启' : '系统提示词已关闭'}>
                <span className={`ai-toggle-label ${systemPromptEnabled ? 'ai-toggle-label-on' : 'ai-toggle-label-off'}`}>{systemPromptEnabled ? '提示词开' : '提示词关'}</span>
                <div className={`ai-toggle ${systemPromptEnabled ? 'ai-toggle-on' : 'ai-toggle-off'}`}>
                  <div className="ai-toggle-thumb" />
                </div>
              </div>
              <button className={`ai-send-btn ${loading ? 'ai-send-btn-loading' : ''}`} onClick={handleSend} disabled={loading}>
                {loading ? '等待中...' : '发送'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
