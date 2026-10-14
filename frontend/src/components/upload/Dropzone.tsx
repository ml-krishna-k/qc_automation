import { useCallback, useId, useRef, useState } from 'react'
import { cn } from '@/utils/cn'
import { UploadIcon } from '@/components/ui/icons'

interface DropzoneProps {
  onFile: (file: File) => void
  disabled?: boolean
  label: string
}

/** Drag-and-drop + click-to-browse surface. Only emits a File; parsing happens upstream. */
export function Dropzone({ onFile, disabled, label }: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      const file = fileList?.[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        if (!disabled) handleFiles(e.dataTransfer.files)
      }}
      className={cn(
        'group relative flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed px-5 py-8 text-center transition-colors duration-150',
        isDragOver ? 'border-brand-500 bg-brand-50' : 'border-line-strong bg-sunken/50 hover:border-brand-500/60 hover:bg-brand-50/50',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept=".xlsx,.xlsm,.xls"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <div
        className={cn(
          'flex size-10 items-center justify-center rounded-full bg-surface text-brand-700 shadow-sm transition-transform duration-150',
          isDragOver && 'scale-110',
        )}
      >
        <UploadIcon className="size-5" />
      </div>
      <label htmlFor={inputId} className="cursor-pointer text-sm">
        <span className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2">Browse</span>
        <span className="text-ink-faint"> or drag a file here</span>
      </label>
      <p className="text-xs text-ink-faint">{label} · .xlsx, .xlsm, .xls</p>
    </div>
  )
}
