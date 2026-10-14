import { LocalComparisonApi } from './localComparisonApi'
import { HttpComparisonApi } from './httpComparisonApi'
import type { ComparisonApi } from './types'

export type { ComparisonApi, RunComparisonParams } from './types'

export const apiMode: 'mock' | 'http' = import.meta.env.VITE_API_MODE === 'http' ? 'http' : 'mock'

/** Single entry point the UI imports — swapping backends happens only here. */
export const comparisonApi: ComparisonApi = apiMode === 'http' ? new HttpComparisonApi() : new LocalComparisonApi()
