import { useCallback, useEffect, useState, type ChangeEvent } from 'react'

interface Props {
  content: string
  onChange: (val: string) => void
  placeholder?: string
}

export default function Editor({ content, onChange, placeholder }: Props) {
  const [value, setValue] = useState(content)

  useEffect(() => { setValue(content) }, [content])

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.target.value
      setValue(v)
      onChange(v)
    },
    [onChange]
  )

  return (
    <div className="editor-wrapper">
      <textarea
        className="editor-textarea"
        value={value}
        onChange={handleChange}
        placeholder={placeholder || '在此写下你的灵感...'}
        spellCheck={false}
      />
    </div>
  )
}
