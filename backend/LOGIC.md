# Backend Logic Reference

The core algorithms behind the Excel comparison, documented module by
module in the order a request actually flows through them. For API routes
and setup, see `README.md` — this file is about *how* the comparison
itself works.

```
upload ──▶ parse & cache ──▶ resolve tag column ──▶ diff ──▶ cache result ──▶ report
 (workbooks.py)  (excel_utils.py)   (tag_detection.py)  (compare.py)  (storage.py)  (report.py)
```

---

## 1. Tag column detection — `app/tag_detection.py`

Headers are normalized to just their letters/digits, upper-cased, so
formatting never causes a false mismatch:

```python
def normalize_header(header: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", header.upper())
```

`"Tag No."`, `"TAG_NO"`, and `"tag no"` all normalize to `"TAGNO"`. A fixed
list of known aliases (`TAG NUMBER`, `TAG NO`, `INSTRUMENT TAG`,
`EQUIPMENT TAG`, `ASSET TAG`, …) is normalized the same way once, at import
time.

```python
def resolve_tag_column(columns: list[str], requested: str) -> str:
    if requested in columns:
        return requested                         # exact match wins

    detection = detect_tag_column(columns)
    if detection.detected:
        return detection.detected                # exactly one alias match
    if detection.is_ambiguous:
        raise AmbiguousTagColumnError(detection.candidates)
    raise TagColumnNotFoundError(...)
```

The frontend always sends the literal string `"Tag Number"` as `requested`.
If a sheet's real header is something else (`"Tag No."`, `"Instrument Tag"`),
this still resolves it — **without the user renaming anything**. Each
worksheet is resolved independently, so the original and revised sheet can
even use different aliases for the same concept.

---

## 2. Parsing — `app/excel_utils.py`

`parse_sheet()` turns one worksheet into a `ParsedSheet`:

```python
@dataclass
class SheetRow:
    row_number: int          # real spreadsheet row, for traceability
    values: dict[str, Any]   # header -> raw cell value (native type)

@dataclass
class ParsedSheet:
    columns: list[str]           # unique headers, in file order
    duplicate_headers: list[str] # data-quality issue, reported later
    rows: list[SheetRow]
```

Key decisions:
- **Row 1 is always the header row.** Blank header cells are skipped;
  a header seen twice is recorded in `duplicate_headers` (last occurrence
  wins for value lookup, but the duplicate itself is reported as an error).
- **Fully blank data rows are skipped** (`all(cell.value in (None, ""))`).
- **Cell values keep their native Python type** (`int`/`float`/`str`/
  `bool`/`datetime`/`None`) — nothing is stringified yet. This is what lets
  later comparisons be exact, with no rounding.

`display_value()` only runs at the very end, to turn a raw value into the
string the API/report actually show (`None` and blank strings → `None`;
whole floats → `"5"` not `"5.0"`; dates → ISO format).

---

## 3. The diff engine — `app/compare.py`

Pure function: `compare_sheets(original, revised, config) -> ComparisonResult`.
No I/O, no FastAPI types — just data in, data out. Four stages:

**a. Resolve each sheet's tag column independently:**
```python
original_tag_column = resolve_tag_column(original.columns, config.tagColumn)
revised_tag_column = resolve_tag_column(revised.columns, config.tagColumn)
```

**b. Flag column-level problems** that aren't tied to any one row —
a column present in only one sheet, or a duplicate header — each becomes
an `error`-type `DifferenceRow` with `tagNumber=""`.

**c. Build a `tag -> row` map per sheet**, flagging data-quality issues as
they're found instead of silently dropping anything:
```python
if tag in tag_map:
    duplicate_rows[tag].append(row.row_number)   # reported as an error row, excluded below
elif tag is None or tag == "":
    blank_rows.append(row.row_number)             # reported as an error row, skipped
else:
    tag_map[tag] = row
```

**d. Walk every tag** (`original_map.keys() | revised_map.keys()`, minus
duplicates) and classify it:

| Case | Result |
|---|---|
| only in revised | `added` |
| only in original | `removed` |
| in both, some shared column differs | `changed` (one row *per differing column*) |
| in both, nothing differs | counted in `unchangedCount`, no row emitted |

Value comparison is **exact by construction** — numbers/dates/booleans are
compared with Python's native `!=`, never rounded or coerced:
```python
def _normalize_for_compare(value, trim_whitespace, ignore_case):
    if value is None:
        return None
    if isinstance(value, str):          # options only ever touch strings
        ...
        return text
    return value                        # numbers/dates/bools: compared as-is
```

Everything accumulates into one `ComparisonSummary` (counts) and a sorted
list of `DifferenceRow`s.

---

## 4. Report rendering — `app/report.py`

Writes the downloadable `.xlsx` (Summary + Differences sheets) from the
same `ComparisonResult` the API returns. One presentation rule lives here,
deliberately kept out of the engine above:

```python
def _display_difference(diff: DifferenceRow) -> tuple[str, str, str]:
    if diff.changeType.value == "added":
        return "Added Tag", "", ""
    if diff.changeType.value == "removed":
        return "Removed Tag", "", ""
    return diff.columnName, diff.originalValue or "", diff.revisedValue or ""
```

The engine represents an added/removed tag by reusing the tag column name
with the tag ID as the value (accurate, but redundant next to the row's own
Tag Number cell). This function relabels it for display only — the engine's
actual `DifferenceRow` data is untouched. The frontend has the identical
mapping (`frontend/src/utils/differenceDisplay.ts`), so the UI table and
this report always agree.

---

## 5. Storage — `app/storage.py` + `app/dependencies.py`

No database. `_BoundedStore` is a `dict` + a `threading.Lock`, capped at
`N` items (default 50) with oldest-first eviction:
```python
def put(self, key, value):
    with self._lock:
        self._items[key] = value
        while len(self._items) > self._max_items:
            del self._items[next(iter(self._items))]   # dict preserves insertion order
```
Two singletons — `workbook_store` (parsed `openpyxl.Workbook` objects) and
`comparison_store` (`ComparisonResult`s, so the report endpoint can re-fetch
by id). `dependencies.get_stored_workbook()` is the one shared "look it up
or raise 404" helper both routers use, so that error is handled identically
everywhere instead of being duplicated.

---

## Design choices worth knowing

- **Config is a hint, not a guarantee.** `config.tagColumn` is whatever the
  caller asked for; the actual column used is always *resolved*, per sheet,
  at compare time. Nothing upstream needs to know a sheet's real header.
- **Row matching is by tag, not position.** Column order and row order
  never matter — only the header name and the tag value do.
- **Errors are data, not exceptions, once inside the diff.** A duplicate
  tag or a missing column doesn't abort the comparison — it becomes an
  `error`-type `DifferenceRow` alongside everything else. Only a genuinely
  unresolvable tag column (`TagColumnNotFoundError`/`AmbiguousTagColumnError`)
  aborts the whole run, surfaced as HTTP `422`.
- **Nothing persists.** Uploaded files live on disk only for the few
  milliseconds `openpyxl` needs to read them; everything else is in-process
  memory, gone on restart.
