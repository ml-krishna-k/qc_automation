import { useCallback, useState } from 'react'
import { comparisonApi } from '@/api'
import type { ComparisonConfig, ComparisonResult, ComparisonRunStatus } from '@/types/domain'

export interface UseComparisonRunResult {
  status: ComparisonRunStatus
  result: ComparisonResult | null
  error: string | null
  run: (params: { originalWorkbookId: string; revisedWorkbookId: string; config: ComparisonConfig }) => Promise<void>
  reset: () => void
}

/** Drives the run → success/error lifecycle for a comparison, independent of how the diff is computed. */
export function useComparisonRun(): UseComparisonRunResult {
  const [status, setStatus] = useState<ComparisonRunStatus>('idle')
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback<UseComparisonRunResult['run']>(async (params) => {
    setStatus('running')
    setError(null)
    try {
      const comparison = await comparisonApi.runComparison(params)
      setResult(comparison)
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The comparison could not be completed.')
      setStatus('error')
    }
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setError(null)
  }, [])

  return { status, result, error, run, reset }
}
