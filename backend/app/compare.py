"""Pure comparison engine: two `ParsedSheet`s + a config in, a `ComparisonResult`
out. No I/O, no framework types — easy to unit test and to reason about."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from app.excel_utils import ParsedSheet, display_value
from app.models import ComparisonConfig, ComparisonResult, ComparisonSummary, DifferenceRow
from app.tag_detection import resolve_tag_column


def _normalize_for_compare(value: Any, trim_whitespace: bool, ignore_case: bool) -> Any:
    """Values are compared exactly as stored — no rounding, no implicit type
    coercion. `trimWhitespace`/`ignoreCase` only ever affect string values;
    numbers, dates and booleans are always compared by raw equality."""
    if value is None:
        return None
    if isinstance(value, str):
        text = value
        if trim_whitespace:
            text = " ".join(text.strip().split())
        if ignore_case:
            text = text.lower()
        return text if text != "" else None
    return value


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def compare_sheets(
    original: ParsedSheet,
    revised: ParsedSheet,
    config: ComparisonConfig,
) -> ComparisonResult:
    original_tag_column = resolve_tag_column(original.columns, config.tagColumn)
    revised_tag_column = resolve_tag_column(revised.columns, config.tagColumn)

    differences: list[DifferenceRow] = []

    # --- Column-level issues (not tied to any single tag) ------------------
    ignored = set(config.ignoredColumns)
    original_cols = {c for c in original.columns if c != original_tag_column} - ignored
    revised_cols = {c for c in revised.columns if c != revised_tag_column} - ignored
    common_columns = sorted(original_cols & revised_cols)
    only_in_original = sorted(original_cols - revised_cols)
    only_in_revised = sorted(revised_cols - original_cols)

    for column in only_in_original:
        differences.append(
            DifferenceRow(
                id=_new_id("diff"),
                tagNumber="",
                columnName=column,
                originalValue=column,
                revisedValue=None,
                changeType="error",
                errorMessage=f'Column "{column}" exists in the original sheet but not in the revised sheet.',
            )
        )
    for column in only_in_revised:
        differences.append(
            DifferenceRow(
                id=_new_id("diff"),
                tagNumber="",
                columnName=column,
                originalValue=None,
                revisedValue=column,
                changeType="error",
                errorMessage=f'Column "{column}" exists in the revised sheet but not in the original sheet.',
            )
        )
    for column in original.duplicate_headers:
        differences.append(
            DifferenceRow(
                id=_new_id("diff"),
                tagNumber="",
                columnName=column,
                changeType="error",
                errorMessage=f'Duplicate column header "{column}" found in the original sheet; only the last occurrence was used.',
            )
        )
    for column in revised.duplicate_headers:
        differences.append(
            DifferenceRow(
                id=_new_id("diff"),
                tagNumber="",
                columnName=column,
                changeType="error",
                errorMessage=f'Duplicate column header "{column}" found in the revised sheet; only the last occurrence was used.',
            )
        )

    # --- Build tag -> row maps, flagging duplicate/blank tags --------------
    def build_tag_map(sheet: ParsedSheet, tag_column: str, label: str):
        tag_map: dict[str, Any] = {}
        duplicate_rows: dict[str, list[int]] = {}
        blank_rows: list[int] = []
        for row in sheet.rows:
            raw_tag = row.values.get(tag_column)
            tag = raw_tag.strip() if isinstance(raw_tag, str) else raw_tag
            if tag is None or tag == "":
                blank_rows.append(row.row_number)
                continue
            tag = str(tag)
            if tag in tag_map:
                duplicate_rows.setdefault(tag, [tag_map[tag].row_number]).append(row.row_number)
            else:
                tag_map[tag] = row
        if blank_rows:
            differences.append(
                DifferenceRow(
                    id=_new_id("diff"),
                    tagNumber="",
                    columnName=tag_column,
                    changeType="error",
                    errorMessage=(
                        f"{len(blank_rows)} row(s) in the {label} sheet have a blank Tag Number "
                        f"and were skipped (rows: {', '.join(map(str, blank_rows))})."
                    ),
                )
            )
        for tag, row_numbers in duplicate_rows.items():
            differences.append(
                DifferenceRow(
                    id=_new_id("diff"),
                    tagNumber=tag,
                    columnName=tag_column,
                    changeType="error",
                    errorMessage=(
                        f"Duplicate Tag Number found in the {label} sheet "
                        f"(rows: {', '.join(map(str, row_numbers))})."
                    ),
                )
            )
        return tag_map, set(duplicate_rows.keys())

    original_map, original_duplicate_tags = build_tag_map(original, original_tag_column, "original")
    revised_map, revised_duplicate_tags = build_tag_map(revised, revised_tag_column, "revised")
    duplicate_tags = original_duplicate_tags | revised_duplicate_tags

    all_tags = (set(original_map.keys()) | set(revised_map.keys())) - duplicate_tags

    changed_count = 0
    added_count = 0
    removed_count = 0
    unchanged_count = 0

    for tag in sorted(all_tags):
        original_row = original_map.get(tag)
        revised_row = revised_map.get(tag)

        if original_row is not None and revised_row is None:
            removed_count += 1
            differences.append(
                DifferenceRow(
                    id=_new_id("diff"),
                    tagNumber=tag,
                    columnName=original_tag_column,
                    originalValue=tag,
                    revisedValue=None,
                    changeType="removed",
                    originalRow=original_row.row_number,
                )
            )
            continue

        if original_row is None and revised_row is not None:
            added_count += 1
            differences.append(
                DifferenceRow(
                    id=_new_id("diff"),
                    tagNumber=tag,
                    columnName=revised_tag_column,
                    originalValue=None,
                    revisedValue=tag,
                    changeType="added",
                    revisedRow=revised_row.row_number,
                )
            )
            continue

        assert original_row is not None and revised_row is not None
        row_changed = False
        for column in common_columns:
            original_raw = original_row.values.get(column)
            revised_raw = revised_row.values.get(column)
            if _normalize_for_compare(original_raw, config.trimWhitespace, config.ignoreCase) != _normalize_for_compare(
                revised_raw, config.trimWhitespace, config.ignoreCase
            ):
                row_changed = True
                changed_count += 1
                differences.append(
                    DifferenceRow(
                        id=_new_id("diff"),
                        tagNumber=tag,
                        columnName=column,
                        originalValue=display_value(original_raw),
                        revisedValue=display_value(revised_raw),
                        changeType="changed",
                        originalRow=original_row.row_number,
                        revisedRow=revised_row.row_number,
                    )
                )
        if not row_changed:
            unchanged_count += 1

    error_count = sum(1 for d in differences if d.changeType == "error")

    summary = ComparisonSummary(
        totalTagsCompared=len(all_tags) + len(duplicate_tags),
        changedCount=changed_count,
        addedCount=added_count,
        removedCount=removed_count,
        errorCount=error_count,
        unchangedCount=unchanged_count,
        columnsCompared=len(common_columns),
    )

    differences.sort(key=lambda d: (d.tagNumber, d.columnName))

    return ComparisonResult(
        id=_new_id("run"),
        runAt=datetime.now(timezone.utc).isoformat(),
        config=config,
        summary=summary,
        differences=differences,
    )
