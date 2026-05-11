import { useState, useRef, useCallback } from 'react'
import { useStore } from '../store/draftStore'
import type { SystemPrompt as SystemPromptType } from '../types/draft'

const fields: { key: keyof SystemPromptType; label: string; placeholder: string }[] = [
  { key: 'worldSetting', label: '🌍 世界观设定', placeholder: '描述故事发生的世界、时代背景、社会结构、魔法体系等...' },
  { key: 'characterBuilding', label: '👤 人物塑造', placeholder: '描述主要角色的性格、外貌、动机、关系、成长弧线等...' },
  { key: 'writingStyle', label: '✍ 写作风格', placeholder: '描述偏好的文风、叙事视角、语言特色、参考作品等...' },
  { key: 'plotProgression', label: '📖 情节推进', placeholder: '描述当前剧情进展、关键转折、伏笔线索、未来走向等...' },
]

export default function SystemPromptPage() {
  const { currentDraft, updateDraft } = useStore()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [localValues, setLocalValues] = useState<SystemPromptType>(
    currentDraft?.systemPrompt || { worldSetting: '', characterBuilding: '', writingStyle: '', plotProgression: '' }
  )

  const onChange = useCallback((key: keyof SystemPromptType, value: string) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }))
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      updateDraft({ systemPrompt: { ...localValues, [key]: value } })
    }, 500)
  }, [localValues, updateDraft])

  return (
    <div className="system-prompt-page">
      <div className="system-prompt-header">
        <h2>系统提示词</h2>
        <p className="system-prompt-desc">为 AI 助手设定创作背景，让辅助更贴合你的故事</p>
      </div>
      <div className="system-prompt-fields">
        {fields.map((f) => (
          <div key={f.key} className="system-prompt-field">
            <label className="system-prompt-label">{f.label}</label>
            <textarea
              className="system-prompt-textarea"
              placeholder={f.placeholder}
              value={localValues[f.key]}
              onChange={(e) => onChange(f.key, e.target.value)}
              rows={4}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
