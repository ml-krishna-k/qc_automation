import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import { TAG_COLUMN_NAME } from '@/types/domain'
import { cn } from '@/utils/cn'
import type { UseComparisonConfigResult } from '@/hooks/useComparisonConfig'

interface ComparisonConfigPanelProps {
  config: UseComparisonConfigResult
  canRun: boolean
  isRunning: boolean
  onRun: () => void
}

export function ComparisonConfigPanel({ config, canRun, isRunning, onRun }: ComparisonConfigPanelProps) {
  const { availableColumns, ignoredColumns, toggleIgnoredColumn, trimWhitespace, setTrimWhitespace, ignoreCase, setIgnoreCase, columnsLoading } = config

  return (
    <Card className="animate-rise">
      <CardHeader>
        <div>
          <h3 className="text-sm font-semibold text-ink">Comparison configuration</h3>
          <p className="text-xs text-ink-faint">Rows are matched by the fixed identifier below.</p>
        </div>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="flex items-center justify-between rounded-xl border border-brand-300/40 bg-brand-50 px-4 py-3">
          <div>
            <p className="text-xs font-medium text-brand-800">Row identifier</p>
            <p className="text-sm font-semibold text-brand-900">{TAG_COLUMN_NAME}</p>
          </div>
          <Badge tone="brand">Fixed</Badge>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-ink-soft">Ignore columns (optional)</label>
            {columnsLoading && <span className="text-xs text-ink-faint">Loading columns…</span>}
          </div>
          {availableColumns.length === 0 ? (
            <p className="text-xs text-ink-faint">
              Upload and select a worksheet on both sides to see shared columns here.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {availableColumns.map((column) => {
                const active = ignoredColumns.includes(column)
                return (
                  <button
                    key={column}
                    type="button"
                    onClick={() => toggleIgnoredColumn(column)}
                    aria-pressed={active}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150',
                      active
                        ? 'border-removed/30 bg-removed-bg text-removed'
                        : 'border-line-strong bg-surface text-ink-soft hover:border-brand-500 hover:text-brand-700',
                    )}
                  >
                    {column}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="divide-y divide-line">
          <Switch
            id="trim-whitespace"
            checked={trimWhitespace}
            onChange={setTrimWhitespace}
            label="Trim whitespace"
            description="Ignore leading/trailing spaces and repeated internal spaces."
          />
          <Switch
            id="ignore-case"
            checked={ignoreCase}
            onChange={setIgnoreCase}
            label="Ignore case"
            description="Treat “Approved” and “approved” as identical."
          />
        </div>

        <Button className="w-full" onClick={onRun} disabled={!canRun} loading={isRunning}>
          {isRunning ? 'Comparing…' : 'Run comparison'}
        </Button>
      </CardBody>
    </Card>
  )
}
