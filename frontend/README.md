# QC Automation — Excel Comparison Dashboard

A React + TypeScript dashboard for comparing two revisions of an Excel
register (e.g. an engineering tag list) by a fixed **Tag Number** identifier,
surfacing changed/added/removed rows and validation errors, with a
downloadable `.xlsx` report.

## Stack

- React 19 + TypeScript (strict)
- Vite 8
- Tailwind CSS 4 (CSS-first `@theme`, no `tailwind.config.js`)
- [`xlsx`](https://www.npmjs.com/package/xlsx) for parsing/writing workbooks client-side

## Getting started

```bash
npm install
npm run dev       # starts Vite on http://localhost:5173
npm run typecheck # tsc --noEmit
npm run build     # production build to dist/
```

Click **Load sample files** on the upload step to populate both sides with a
generated demo tag register (no file hunting required) and run a comparison
immediately.

## How comparison works today (no backend yet)

There is **no mocked comparison result** — everything the UI shows is
computed for real, in the browser:

1. `src/utils/workbook.ts` parses the uploaded `.xlsx`/`.xls` file with
   `xlsx`, reporting real sheet names and columns.
2. `src/api/compareEngine.ts` is a pure function that diffs two worksheets
   row-by-row, keyed by `Tag Number`, honoring the ignored-columns,
   trim-whitespace and ignore-case options from the config panel.
3. `src/api/localComparisonApi.ts` wires the two together behind the
   `ComparisonApi` interface (`src/api/types.ts`), plus a real `.xlsx`
   report writer (`src/api/buildReport.ts`).

No component calls `xlsx`, the diff engine, or the report writer directly —
they only ever talk to `comparisonApi` from `src/api/index.ts`.

## Swapping in the FastAPI backend

`src/api/httpComparisonApi.ts` already implements the same `ComparisonApi`
interface against REST endpoints (`POST /workbooks`, `POST /comparisons`,
`GET /comparisons/:id/report`, `GET /workbooks/:id/columns`). To switch:

1. Point `VITE_API_BASE_URL` at the FastAPI server (defaults to `/api`,
   proxied to `http://localhost:8000` in dev — see `vite.config.ts`).
2. Set `VITE_API_MODE=http` (an `.env.local` or build-time env var).
3. No component or hook changes — `src/api/index.ts` is the only place that
   decides which implementation backs `comparisonApi`.

The backend should implement the diff semantics currently in
`compareEngine.ts` (duplicate-tag detection, add/remove/change
classification) so results match what the frontend already demonstrates.

## Project structure

```
src/
  types/domain.ts          Shared domain types (the API contract)
  api/                     Service layer: ComparisonApi + local/http impls, diff engine, report builder
  hooks/                   Stateful glue between api/ and components (upload, config, run, filters)
  components/
    ui/                    Reusable primitives (Button, Card, Badge, Select, Switch, Alert, EmptyState, icons)
    layout/                Page shell and section headings
    upload/                Dropzone + upload card (file + worksheet picker)
    config/                Comparison configuration panel
    results/                Summary cards, filter toolbar, differences table, report download
  utils/                   Formatting, id generation, workbook parsing, sample data, download helper
```

## Accessibility & responsiveness notes

- All interactive controls are real `<button>`/`<select>`/`<input>` elements
  with labels or `aria-*` attributes (dropzone, filter toggles, ignored-column
  chips, remove-file button).
- Focus states are visible (`:focus-visible` ring defined globally).
- Motion respects `prefers-reduced-motion`.
- Layout is a responsive grid that collapses to a single column on mobile;
  the differences table scrolls horizontally on narrow viewports instead of
  clipping.
