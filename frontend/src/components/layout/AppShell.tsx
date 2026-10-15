import type { ReactNode } from 'react'
import { apiMode } from '@/api'

export function AppShell({ children }: { children: ReactNode }) {
  const isHttp = apiMode === 'http'

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-20 border-b border-accent-dark/40 bg-accent">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/logo-circle.png"
              alt="Arsène Technology Services"
              className="size-11 shrink-0 rounded-full object-cover shadow-[0_1px_2px_rgba(5,43,18,0.25)] ring-1 ring-brand-900/10"
            />
            <div>
              <h1 className="text-[15px] font-semibold leading-tight text-brand-900">QC Automation</h1>
              <p className="text-xs leading-tight text-brand-800/70">Excel register comparison</p>
            </div>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-brand-900/15 bg-accent-soft/70 px-3 py-1 text-xs font-medium text-brand-800 sm:inline-flex">
            <span className={isHttp ? 'size-1.5 rounded-full bg-brand-700' : 'size-1.5 rounded-full bg-brand-800/50'} />
            {isHttp ? 'Connected · FastAPI backend' : 'Local engine · runs in your browser'}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">{children}</main>
      <footer className="mx-auto max-w-6xl px-5 py-10 text-xs text-ink-faint sm:px-8">
        {isHttp
          ? 'Comparisons are computed by the FastAPI backend at ' + apiBaseUrlLabel() + '.'
          : 'Comparisons run entirely in your browser. No files are uploaded to a server.'}
      </footer>
    </div>
  )
}

function apiBaseUrlLabel(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api'
}
