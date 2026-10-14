import type { ComparisonResult, UploadedWorkbook, WorkbookSlot } from '@/types/domain'
import { generateSampleWorkbooks } from '@/utils/sampleData'
import type { ComparisonApi, RunComparisonParams } from './types'

/**
 * HTTP client for the FastAPI backend in `backend/`. Endpoints follow the
 * same contract as `ComparisonApi` so switching `VITE_API_MODE=http` is a
 * drop-in change — no component code changes with it. See `backend/README.md`
 * for the server-side implementation of these routes.
 */
export class HttpComparisonApi implements ComparisonApi {
  constructor(private readonly baseUrl: string = import.meta.env.VITE_API_BASE_URL ?? '/api') {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, init)
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.message ?? `Request to ${path} failed (${response.status}).`)
    }
    return response.json() as Promise<T>
  }

  async uploadWorkbook(file: File, slot: WorkbookSlot): Promise<UploadedWorkbook> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('slot', slot)
    return this.request<UploadedWorkbook>('/workbooks', { method: 'POST', body: formData })
  }

  async getSheetColumns(workbookId: string, sheetName: string): Promise<string[]> {
    return this.request<string[]>(`/workbooks/${workbookId}/columns?sheet=${encodeURIComponent(sheetName)}`)
  }

  async runComparison(params: RunComparisonParams): Promise<ComparisonResult> {
    return this.request<ComparisonResult>('/comparisons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  }

  async buildReport(result: ComparisonResult): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/comparisons/${result.id}/report`)
    if (!response.ok) throw new Error('Failed to generate the report.')
    return response.blob()
  }

  async loadSampleWorkbooks(): Promise<{ original: File; revised: File }> {
    // Sample file generation is just building a real .xlsx client-side —
    // it doesn't depend on which engine runs the actual comparison.
    return generateSampleWorkbooks()
  }
}
