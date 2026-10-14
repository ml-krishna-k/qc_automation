import { useCallback, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { SectionHeading } from '@/components/layout/SectionHeading'
import { UploadCard } from '@/components/upload/UploadCard'
import { ComparisonConfigPanel } from '@/components/config/ComparisonConfigPanel'
import { ResultsSection } from '@/components/results/ResultsSection'
import { Button } from '@/components/ui/Button'
import { SparkleIcon } from '@/components/ui/icons'
import { useWorkbookSlot } from '@/hooks/useWorkbookSlot'
import { useComparisonConfig } from '@/hooks/useComparisonConfig'
import { useComparisonRun } from '@/hooks/useComparisonRun'
import { comparisonApi } from '@/api'
import { TAG_COLUMN_NAME } from '@/types/domain'

export default function App() {
  const originalSlot = useWorkbookSlot('original')
  const revisedSlot = useWorkbookSlot('revised')
  const [isLoadingSample, setIsLoadingSample] = useState(false)

  const config = useComparisonConfig(
    originalSlot.state.workbook?.id ?? null,
    originalSlot.state.selectedSheet,
    revisedSlot.state.workbook?.id ?? null,
    revisedSlot.state.selectedSheet,
  )

  const comparison = useComparisonRun()

  const canRun =
    originalSlot.state.status === 'ready' &&
    revisedSlot.state.status === 'ready' &&
    Boolean(originalSlot.state.selectedSheet) &&
    Boolean(revisedSlot.state.selectedSheet) &&
    comparison.status !== 'running'

  const handleRun = useCallback(() => {
    if (!originalSlot.state.workbook || !revisedSlot.state.workbook) return
    if (!originalSlot.state.selectedSheet || !revisedSlot.state.selectedSheet) return

    void comparison.run({
      originalWorkbookId: originalSlot.state.workbook.id,
      revisedWorkbookId: revisedSlot.state.workbook.id,
      config: {
        originalSheet: originalSlot.state.selectedSheet,
        revisedSheet: revisedSlot.state.selectedSheet,
        tagColumn: TAG_COLUMN_NAME,
        ignoredColumns: config.ignoredColumns,
        trimWhitespace: config.trimWhitespace,
        ignoreCase: config.ignoreCase,
      },
    })
  }, [originalSlot.state, revisedSlot.state, config.ignoredColumns, config.trimWhitespace, config.ignoreCase, comparison])

  const handleLoadSample = useCallback(async () => {
    setIsLoadingSample(true)
    try {
      const { original, revised } = await comparisonApi.loadSampleWorkbooks()
      await Promise.all([originalSlot.handleFile(original), revisedSlot.handleFile(revised)])
    } finally {
      setIsLoadingSample(false)
    }
  }, [originalSlot, revisedSlot])

  return (
    <AppShell>
      <div className="space-y-10">
        <section>
          <SectionHeading
            step={1}
            title="Upload workbooks"
            description="Add the original register and its revision. Both must contain a Tag Number column."
            action={
              <Button variant="ghost" size="sm" icon={<SparkleIcon className="size-4" />} loading={isLoadingSample} onClick={() => void handleLoadSample()}>
                Load sample files
              </Button>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <UploadCard title="Original workbook" subtitle="The baseline revision" slot={originalSlot} accentLabel="Original" />
            <UploadCard title="Revised workbook" subtitle="The updated revision" slot={revisedSlot} accentLabel="Revised" />
          </div>
        </section>

        <section>
          <SectionHeading step={2} title="Configure comparison" description="Tag Number is always the row identifier; everything else is optional." />
          <ComparisonConfigPanel config={config} canRun={canRun} isRunning={comparison.status === 'running'} onRun={handleRun} />
        </section>

        <section>
          <SectionHeading step={3} title="Review differences" description="Search, filter, and export the comparison results." />
          <ResultsSection status={comparison.status} result={comparison.result} error={comparison.error} />
        </section>
      </div>
    </AppShell>
  )
}
