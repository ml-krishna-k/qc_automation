import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Alert } from '@/components/ui/Alert'
import { SummaryCards } from './SummaryCards'
import { DifferencesToolbar } from './DifferencesToolbar'
import { DifferencesTable } from './DifferencesTable'
import { DownloadReportButton } from './DownloadReportButton'
import { AlertCircleIcon, TableIcon } from '@/components/ui/icons'
import { formatDateTime } from '@/utils/format'
import { useDifferenceFilters } from '@/hooks/useDifferenceFilters'
import type { ComparisonResult, ComparisonRunStatus } from '@/types/domain'

interface ResultsSectionProps {
  status: ComparisonRunStatus
  result: ComparisonResult | null
  error: string | null
}

function LoadingState() {
  return (
    <div className="space-y-4 px-6 py-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-sunken" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-sunken" style={{ opacity: 1 - i * 0.15 }} />
        ))}
      </div>
    </div>
  )
}

function ResultsBody({ result }: { result: ComparisonResult }) {
  const filterState = useDifferenceFilters(result.differences)
  return (
    <div className="space-y-6 animate-fade">
      <SummaryCards summary={result.summary} />
      <div className="space-y-4">
        <DifferencesToolbar {...filterState} />
        <DifferencesTable rows={filterState.filtered} />
      </div>
    </div>
  )
}

export function ResultsSection({ status, result, error }: ResultsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div>
          <h3 className="text-sm font-semibold text-ink">Results</h3>
          <p className="text-xs text-ink-faint">
            {result ? `Run completed ${formatDateTime(result.runAt)}` : 'Configure both worksheets and run a comparison to see results.'}
          </p>
        </div>
        {status === 'success' && result && <DownloadReportButton result={result} />}
      </CardHeader>
      <CardBody>
        {status === 'idle' && (
          <EmptyState
            icon={<TableIcon className="size-5" />}
            title="No comparison yet"
            description="Upload both workbooks, choose their worksheets, and run a comparison to populate this dashboard."
          />
        )}
        {status === 'running' && <LoadingState />}
        {status === 'error' && error && (
          <Alert tone="error" title="Comparison failed" icon={<AlertCircleIcon className="size-5" />}>
            {error}
          </Alert>
        )}
        {status === 'success' && result && <ResultsBody result={result} />}
      </CardBody>
    </Card>
  )
}
