# Backend Logic Reference

The core algorithms behind the Excel comparison, explained module by
module in the order a request actually flows through them: upload and
parse, resolve the tag column, diff, cache the result, then render a
report. For routes and setup, see `README.md` — this file is about how the
comparison itself works.

---

## 1. Tag column detection (`app/tag_detection.py`)

Every header is normalized before it's compared: converted to upper case
and stripped down to just its letters and digits. This means "Tag No.",
"TAG_NO", and "tag no" are all treated as identical, regardless of
punctuation, spacing, or underscores. A fixed list of known aliases
("Tag Number", "Tag No", "Instrument Tag", "Equipment Tag", "Asset Tag",
and a handful of others) is normalized the same way once, up front.

Resolving the tag column for a sheet works in three steps, tried in order:
first, if the requested name (the frontend always asks for "Tag Number")
appears literally among the sheet's headers, it's used as-is — this is the
common case. Second, if no literal match exists, the normalized headers are
checked against the alias list; if exactly one column matches an alias,
that column is used instead. Third, if more than one column matches an
alias, the sheet is ambiguous and detection refuses to guess, raising an
error that names the candidates so the caller can ask the user to confirm.
If nothing matches at all, a different error says no tag column could be
found. Each worksheet is resolved independently, so the original and
revised sheet are even allowed to use different header spellings for the
same underlying concept.

---

## 2. Parsing (`app/excel_utils.py`)

A worksheet is read into a small in-memory structure: a list of its unique
column headers in file order, a list of any header names that appeared
more than once (a data-quality problem reported later, not silently
ignored), and a list of data rows. Each row keeps its original spreadsheet
row number — so later output can point back to exactly where a value came
from — alongside its values as a mapping from header name to cell value.

Row one is always treated as the header row; blank header cells are
skipped. A header that repeats is recorded as a duplicate, and when that
happens, the last occurrence of that column is the one used for its
values — but the duplication itself is still flagged. Fully blank data rows
are skipped entirely rather than being treated as empty records.

Critically, cell values keep their original type — numbers stay numbers,
dates stay dates, text stays text — nothing is converted to a string at
this stage. That's what allows later value comparisons to be exact, with no
rounding or implicit type coercion. Converting a value into its final
display string only happens afterward, right before it's shown: a blank or
whitespace-only string and a genuinely empty cell are both treated as
"blank"; a whole-number float displays without a trailing ".0"; dates
display in ISO format.

---

## 3. The diff engine (`app/compare.py`)

This is the heart of the system: a single function that takes the parsed
original sheet, the parsed revised sheet, and the comparison options, and
produces a complete result. It has no awareness of HTTP, files, or storage
— it only works with the data already parsed in memory, which makes its
behavior easy to reason about and test in isolation.

It proceeds in four stages. First, it resolves the actual tag column for
each sheet independently, exactly as described above. Second, it looks at
which columns exist in only one of the two sheets (ignoring the tag column
and anything the user explicitly chose to ignore) and records each such
column as a validation error — the comparison doesn't stop, but the user is
told a column is missing on one side. Duplicate headers detected during
parsing are reported the same way.

Third, it builds a lookup from tag value to row, separately for each
sheet. While doing so, it watches for two kinds of trouble: a tag value
that's blank, and a tag value that appears more than once. Both are
recorded as validation errors — naming the affected row numbers — and both
are excluded from the rest of the comparison, since there's no reliable
single row to compare for them.

Fourth, it walks every remaining tag that appears in either sheet. A tag
present only in the revised sheet is reported as added; a tag present only
in the original sheet is reported as removed. A tag present in both is
compared column by column, for every column shared by both sheets: if a
value differs, that's reported as a changed value, naming the column and
both the original and revised value. If nothing differs across any shared
column for a tag, it's simply counted as unchanged — no row is produced
for it.

The value comparison itself is exact by construction. Text values can
optionally be trimmed of extra whitespace and/or compared case-insensitively,
depending on the options chosen — but numbers, dates, and true/false values
are never touched by those options; they're always compared exactly as
stored, with no rounding and no type coercion. Everything the engine finds
is tallied into a set of summary counts and returned alongside the full,
sorted list of differences.

---

## 4. Report rendering (`app/report.py`)

The downloadable spreadsheet is built directly from the same result the
API returns, with one deliberate presentation adjustment kept entirely out
of the engine above: the engine represents an added or removed tag by
reusing the tag column's name together with the tag ID as its value, which
is accurate but reads as redundant next to the tag number already shown in
its own column. For display and for the report only, an added tag is
relabeled as "Added Tag" and a removed tag as "Removed Tag", with their
value cells left blank, since the tag ID is already visible elsewhere in
the same row. Every other kind of row — changed values and validation
errors — is shown exactly as the engine produced it. This relabeling is
purely cosmetic: the underlying result object handed back by the API is
never altered, and the frontend applies the identical relabeling so the
on-screen table and the downloaded report always agree.

---

## 5. Storage (`app/storage.py` and `app/dependencies.py`)

There is no database. Uploaded workbooks and comparison results are kept
in two simple in-memory stores for the lifetime of the running process,
each capped at a fixed number of entries; once that cap is reached, the
oldest entry is discarded to make room for the newest. One small shared
helper is responsible for looking up a stored workbook by its id and
producing a clear "not found" error if it's missing or has since been
evicted — every route that needs a workbook goes through that same helper,
so that failure is handled identically everywhere rather than being
reimplemented per route.

---

## Design choices worth knowing

The requested tag column name is always treated as a hint, never a
guarantee — the column actually used is resolved fresh, per sheet, at
comparison time, so nothing upstream needs to know a sheet's real header
in advance. Rows are matched purely by tag value, never by position, so
column order and row order never matter. Most problems discovered during a
comparison — a duplicate tag, a missing column, a blank identifier — are
treated as data to report, not as reasons to abort; the comparison still
completes and the issue is simply listed alongside everything else. Only a
tag column that genuinely can't be resolved stops the comparison outright.
Finally, nothing is persisted: an uploaded file touches disk only for the
brief moment it takes to read it into memory, and every other piece of
state disappears the moment the process restarts.
