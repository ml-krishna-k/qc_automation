/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "mock" (default) serves demo data in-browser; "http" calls the FastAPI backend. */
  readonly VITE_API_MODE?: 'mock' | 'http'
  /** Base URL of the FastAPI backend when VITE_API_MODE=http. Defaults to "/api". */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
