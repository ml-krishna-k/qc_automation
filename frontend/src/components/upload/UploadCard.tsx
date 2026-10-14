import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { AlertCircleIcon, FileIcon, XIcon } from '@/components/ui/icons'
import { formatBytes } from '@/utils/format'
import { Dropzone } from './Dropzone'
import type { UseWorkbookSlotResult } from '@/hooks/useWorkbookSlot'

interface UploadCardProps {
  title: string
  subtitle: string
  slot: UseWorkbookSlotResult
  accentLabel: 'Original' | 'Revised'
}

export function UploadCard({ title, subtitle, slot, accentLabel }: UploadCardProps) {
  const { state, handleFile, selectSheet, reset } = slot
  const isBusy = state.status === 'reading'

  return (
    <Card className="animate-rise">
      <CardHeader>
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Badge tone={accentLabel === 'Original' ? 'neutral' : 'brand'}>{accentLabel}</Badge>
            {state.status === 'ready' && <Badge tone="added">Ready</Badge>}
          </div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="text-xs text-ink-faint">{subtitle}</p>
        </div>
        {state.workbook && (
          <Button variant="ghost" size="sm" aria-label="Remove file" onClick={reset}>
            <XIcon className="size-4" />
          </Button>
        )}
      </CardHeader>
      <CardBody className="space-y-3">
        {!state.workbook ? (
          <Dropzone label={accentLabel} disabled={isBusy} onFile={(file) => void handleFile(file)} />
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-sunken/60 px-3.5 py-3 animate-fade">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <FileIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{state.workbook.fileName}</p>
              <p className="text-xs text-ink-faint">{formatBytes(state.workbook.sizeBytes)}</p>
            </div>
          </div>
        )}

        {isBusy && (
          <div className="flex items-center gap-2 text-xs text-ink-faint">
            <span className="relative h-1 w-full overflow-hidden rounded-full bg-sunken">
              <span className="absolute inset-y-0 w-1/3 rounded-full bg-brand-500 animate-sweep" />
            </span>
            <span className="shrink-0">Reading…</span>
          </div>
        )}

        {state.status === 'error' && state.error && (
          <div className="flex items-start gap-2 rounded-lg bg-removed-bg px-3 py-2 text-xs text-removed">
            <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        {state.workbook && state.workbook.sheetNames.length > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-soft">Worksheet</label>
            <Select
              options={state.workbook.sheetNames}
              value={state.selectedSheet ?? ''}
              onChange={(e) => selectSheet(e.target.value)}
            />
          </div>
        )}
      </CardBody>
    </Card>
  )
}
