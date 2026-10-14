# QC Automation API

A minimal FastAPI backend that compares two Excel worksheets by Tag Number
and returns structured differences, matching the contract already consumed
by the React frontend's `ComparisonApi` interface.

## Stack

- FastAPI + Starlette
- openpyxl (reads/writes `.xlsx`/`.xlsm` only — no legacy `.xls`)
- No database, no auth, no persistent storage — everything lives in
  process memory for the life of the server (see **Storage model** below)

## Getting started

```bash
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt   # Windows
# source .venv/bin/activate && pip install -r requirements.txt   # macOS/Linux

.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

The frontend's Vite dev server proxies `/api/*` straight through to
`http://localhost:8000` with no path rewrite (see `frontend/vite.config.ts`),
so all routes here are mounted under `/api`.

To point the frontend at this backend instead of its built-in client-side
engine, set in `frontend/.env.local`:

```
VITE_API_MODE=http
```

## Run the tests

```bash
.venv\Scripts\python -m pytest -q
```

32 tests covering tag-column alias detection, the diff engine's edge cases
(changed/added/removed, duplicate tags, blank tags, missing columns,
duplicate headers, ignored columns, trim/ignore-case, exact numeric
comparison), and a full upload → compare → report API flow via
`TestClient`.

## API

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/workbooks` | Upload a workbook (`multipart/form-data`: `file`, `slot`). Returns sheet names. |
| `GET` | `/api/workbooks/{id}/columns?sheet=` | Column headers for a worksheet. |
| `GET` | `/api/workbooks/{id}/inspect?sheet=` | Columns + Tag Number detection (`detectedTagColumn`, `candidateTagColumns`, `isAmbiguous`) — for a future confirmation UI; additive, not yet called by the frontend. |
| `POST` | `/api/comparisons` | Run a comparison. Body: `{ originalWorkbookId, revisedWorkbookId, config }`. |
| `GET` | `/api/comparisons/{id}/report` | Download the `.xlsx` report (Summary + Differences sheets). |

Errors are returned as `{"message": "...", "candidates"?: [...]}` with an
appropriate status code (`400` bad input, `404` unknown id/sheet, `413` file
too large, `422` ambiguous/unresolvable Tag Number column, `500` unexpected).

## How comparison works

1. **Tag column resolution** (`app/tag_detection.py`) — the frontend always
   sends `"Tag Number"`. If a sheet's header literally matches, it's used
   as-is. Otherwise the backend normalizes headers (case/punctuation/spacing
   insensitive) and matches against a list of known aliases (`TAG NO`,
   `INSTRUMENT TAG`, `EQUIPMENT TAG`, `ASSET TAG`, …). Exactly one alias
   match → auto-detected. More than one → `422` with `candidates` for the
   user to confirm. None → `422` asking for manual selection.
2. **Parsing** (`app/excel_utils.py`) — openpyxl reads each row into a dict
   keyed by header name (column order doesn't matter), tracking the
   original spreadsheet row number and flagging duplicate header names.
   Blank rows are skipped. Cell values keep their native type (no premature
   stringification), so numeric comparisons stay exact.
3. **Diffing** (`app/compare.py`) — pure function: rows are matched by Tag
   Number; duplicate or blank tags are reported as `error` rows and excluded
   from further comparison; columns present in only one sheet are reported
   as `error` rows; every remaining shared column is compared value-for-value
   (`trimWhitespace`/`ignoreCase` apply only to strings — numbers, dates and
   booleans are always compared exactly, never rounded).
4. **Report** (`app/report.py`) — writes a real `.xlsx` with a Summary sheet
   and a Differences sheet (tag, column, original/revised value, change
   type, source row numbers, notes).

## Storage model

Uploaded workbooks are parsed with openpyxl, held in an in-memory,
capacity-capped dict (`app/storage.py`, default 50 items, oldest evicted
first), and comparison results are cached the same way so the report
endpoint can re-fetch them by id. Nothing is written to disk except a
briefly-lived temp file per upload, deleted in a `finally` block immediately
after parsing — restarting the process clears everything, by design (no
persistence was requested).

## Project structure

```
app/
  main.py            FastAPI app, CORS, routers, error handling
  config.py           File-size limit, allowed extensions, temp dir, store caps
  models.py            Pydantic schemas (mirrors frontend/src/types/domain.ts)
  tag_detection.py      Header normalization + alias matching
  excel_utils.py        openpyxl parsing (sheets, columns, rows, duplicate headers)
  compare.py             Pure diff engine
  report.py               .xlsx report writer
  storage.py                In-memory bounded stores
  dependencies.py             Shared "look up a stored workbook or 404" helper
  routers/
    workbooks.py              Upload, columns, inspect
    comparisons.py            Run comparison, download report
tests/
  helpers.py            Build in-memory .xlsx files for tests
  test_tag_detection.py  Alias normalization, detection, resolution
  test_excel_utils.py     Parsing, row numbers, duplicate headers, value display
  test_compare.py          Diff engine edge cases
  test_api.py               Full HTTP flow + error paths via TestClient
```
