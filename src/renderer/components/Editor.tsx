import { useCallback, useEffect, useState, useRef, type ChangeEvent } from 'react'
import { useAiStore } from '../store/aiStore'

interface Props {
  content: string
  onChange: (val: string) => void
  placeholder?: string
}

export default function Editor({ content, onChange, placeholder }: Props) {
  const [value, setValue] = useState(content)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [highlightRange, setHighlightRange] = useState<{ start: number; end: number } | null>(null)
  const { selectedText, setSelectedText } = useAiStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setValue(content) }, [content])

  useEffect(() => {
    if (!menu) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menu])

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.target.value
      setValue(v)
      onChange(v)
    },
    [onChange]
  )

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current
    if (!textarea) return
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const indent = '\u3000\u3000'
      const newValue = value.substring(0, start) + indent + value.substring(end)
      setValue(newValue)
      onChange(newValue)
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + indent.length
      })
    } else if (e.key === ' ') {
      e.preventDefault()
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const space = '\u3000'
      const newValue = value.substring(0, start) + space + value.substring(end)
      setValue(newValue)
      onChange(newValue)
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + space.length
      })
    }
  }, [value, onChange])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const textarea = textareaRef.current
    if (!textarea) return

    const sel = textarea.selectionStart !== textarea.selectionEnd
    if (sel) {
      setMenu({ x: e.clientX, y: e.clientY })
    } else {
      setMenu(null)
      if (selectedText) {
        setSelectedText('')
        setHighlightRange(null)
      }
    }
  }, [selectedText, setSelectedText])

  const handleSelect = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    if (start === end) return
    const text = value.substring(start, end)
    setSelectedText(text)
    setHighlightRange({ start, end })
    setMenu(null)
  }, [value, setSelectedText])

  const displayValue = highlightRange
    ? value.substring(0, highlightRange.start) + '\u0016' + value.substring(highlightRange.start, highlightRange.end) + '\u0016' + value.substring(highlightRange.end)
    : value

  return (
    <div className="editor-wrapper">
      <textarea
        ref={textareaRef}
        className={`editor-textarea ${highlightRange ? 'editor-has-highlight' : ''}`}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        placeholder={placeholder || '在此写下你的灵感...'}
        spellCheck={false}
      />
      {highlightRange && (
        <div className="editor-highlight-overlay">
          <span className="editor-highlight-before">{value.substring(0, highlightRange.start)}</span>
          <span className="editor-highlight-mark">{value.substring(highlightRange.start, highlightRange.end)}</span>
          <span className="editor-highlight-after">{value.substring(highlightRange.end)}</span>
        </div>
      )}
      {menu && (
        <div
          ref={menuRef}
          className="editor-context-menu"
          style={{ left: menu.x, top: menu.y }}
        >
          <button className="editor-context-item" onClick={handleSelect}>
            📌 选中此段
          </button>
        </div>
      )}
    </div>
  )
}
