import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DownloadIcon } from '@/components/ui/icons'
import { comparisonApi } from '@/api'
import { downloadBlob } from '@/utils/download'
import type { ComparisonResult } from '@/types/domain'

export function DownloadReportButton({ result }: { result: ComparisonResult }) {
  const [isBuilding, setIsBuilding] = useState(false)

  const handleDownload = async () => {
    setIsBuilding(true)
    try {
      const blob = await comparisonApi.buildReport(result)
      const stamp = new Date(result.runAt).toISOString().slice(0, 10)
      downloadBlob(blob, `comparison-report-${stamp}.xlsx`)
    } finally {
      setIsBuilding(false)
    }
  }

  return (
    <Button variant="secondary" size="sm" icon={<DownloadIcon className="size-4" />} loading={isBuilding} onClick={() => void handleDownload()}>
      Download report
    </Button>
  )
}
