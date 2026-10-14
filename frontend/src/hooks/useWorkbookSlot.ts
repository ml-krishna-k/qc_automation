import { useCallback, useMemo, useState } from 'react'
import { comparisonApi } from '@/api'
import type { UploadSlotState, WorkbookSlot } from '@/types/domain'
import { isSupportedWorkbookFile } from '@/utils/workbook'

const EMPTY_STATE: UploadSlotState = {
  status: 'idle',
  workbook: null,
  selectedSheet: null,
  error: null,
}

export interface UseWorkbookSlotResult {
  state: UploadSlotState
  handleFile: (file: File) => Promise<void>
  selectSheet: (sheetName: string) => void
  reset: () => void
}

/** Owns the lifecycle of one upload dropzone: idle → reading → ready/error, plus sheet selection. */
export function useWorkbookSlot(slot: WorkbookSlot): UseWorkbookSlotResult {
  const [state, setState] = useState<UploadSlotState>(EMPTY_STATE)

  const handleFile = useCallback(
    async (file: File) => {
      if (!isSupportedWorkbookFile(file)) {
        setState({ ...EMPTY_STATE, status: 'error', error: 'Unsupported file type. Please upload an .xlsx or .xls workbook.' })
        return
      }

      setState({ status: 'reading', workbook: null, selectedSheet: null, error: null })
      try {
        const workbook = await comparisonApi.uploadWorkbook(file, slot)
        setState({
          status: 'ready',
          workbook,
          selectedSheet: workbook.sheetNames[0] ?? null,
          error: null,
        })
      } catch (error) {
        setState({
          status: 'error',
          workbook: null,
          selectedSheet: null,
          error: error instanceof Error ? error.message : 'Could not read this workbook.',
        })
      }
    },
    [slot],
  )

  const selectSheet = useCallback((sheetName: string) => {
    setState((prev) => (prev.workbook ? { ...prev, selectedSheet: sheetName } : prev))
  }, [])

  const reset = useCallback(() => setState(EMPTY_STATE), [])

  return useMemo(() => ({ state, handleFile, selectSheet, reset }), [state, handleFile, selectSheet, reset])
}
