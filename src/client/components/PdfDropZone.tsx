import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { extractPdfText } from '~/client/utils/pdfExtract'

interface Props {
  onText: (text: string) => void
  children: React.ReactNode
}

/**
 * Wraps a textarea (or any content) with PDF drop-zone behaviour.
 * - Drag a PDF over the area to see a drop overlay; drop to extract text.
 * - Click the "📎 PDF" button to open a file picker.
 * The extracted text is passed to `onText`.
 */
export function PdfDropZone({ onText, children }: Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const dragCounter = useRef(0)

  async function handleFile(file: File) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return
    setExtracting(true)
    try {
      const text = await extractPdfText(file)
      onText(text)
    } finally {
      setExtracting(false)
    }
  }

  return (
    <div
      style={{ position: 'relative' }}
      onDragEnter={(e) => {
        e.preventDefault()
        dragCounter.current++
        if (dragCounter.current === 1) setDragging(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        dragCounter.current--
        if (dragCounter.current === 0) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        dragCounter.current = 0
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
      }}
    >
      {children}

      {/* Drop overlay */}
      {dragging && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'color-mix(in srgb, var(--color-primary-600) 12%, transparent)',
            border: '2px dashed var(--color-primary-600)',
            borderRadius: 8,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--color-primary-600)', fontWeight: 500 }}>
            {t('common.pdfDrop')}
          </span>
        </div>
      )}

      {/* Extracting overlay */}
      {extracting && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'color-mix(in srgb, var(--color-bg) 75%, transparent)',
            zIndex: 10,
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            {t('common.pdfExtracting')}
          </span>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />

      {/* Upload button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={extracting}
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          padding: '2px 7px',
          fontSize: 11,
          borderRadius: 4,
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          zIndex: 5,
        }}
      >
        📎 {t('common.pdfUpload')}
      </button>
    </div>
  )
}
