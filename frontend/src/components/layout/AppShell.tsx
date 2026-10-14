import type { ReactNode } from 'react'
import { ScaleIcon } from '@/components/ui/icons'
import { apiMode } from '@/api'

export function AppShell({ children }: { children: ReactNode }) {
  const isHttp = apiMode === 'http'

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand-800 text-brand-300">
              <ScaleIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold leading-tight text-ink">QC Automation</h1>
              <p className="text-xs leading-tight text-ink-faint">Excel register comparison</p>
            </div>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-line-strong px-3 py-1 text-xs font-medium text-ink-faint sm:inline-flex">
            <span className={isHttp ? 'size-1.5 rounded-full bg-added' : 'size-1.5 rounded-full bg-ink-faint'} />
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
