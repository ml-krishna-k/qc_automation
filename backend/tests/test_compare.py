from app.compare import compare_sheets
from app.excel_utils import ParsedSheet, SheetRow
from app.models import ComparisonConfig
from app.tag_detection import AmbiguousTagColumnError, TagColumnNotFoundError


def make_sheet(columns, rows, duplicate_headers=None):
    return ParsedSheet(
        columns=columns,
        duplicate_headers=duplicate_headers or [],
        rows=[SheetRow(row_number=i + 2, values=values) for i, values in enumerate(rows)],
    )


def default_config(**overrides):
    base = dict(
        originalSheet="Original",
        revisedSheet="Revised",
        tagColumn="Tag Number",
        ignoredColumns=[],
        trimWhitespace=True,
        ignoreCase=False,
    )
    base.update(overrides)
    return ComparisonConfig(**base)


def test_detects_changed_value():
    original = make_sheet(["Tag Number", "Status"], [{"Tag Number": "T-1", "Status": "Approved"}])
    revised = make_sheet(["Tag Number", "Status"], [{"Tag Number": "T-1", "Status": "Superseded"}])

    result = compare_sheets(original, revised, default_config())

    assert result.summary.changedCount == 1
    assert result.summary.unchangedCount == 0
    diff = result.differences[0]
    assert diff.tagNumber == "T-1"
    assert diff.columnName == "Status"
    assert diff.originalValue == "Approved"
    assert diff.revisedValue == "Superseded"
    assert diff.changeType == "changed"


def test_detects_added_and_removed_tags():
    original = make_sheet(["Tag Number", "Status"], [{"Tag Number": "T-1", "Status": "Approved"}])
    revised = make_sheet(
        ["Tag Number", "Status"],
        [{"Tag Number": "T-2", "Status": "Approved"}],
    )

    result = compare_sheets(original, revised, default_config())

    types = {d.changeType for d in result.differences}
    assert types == {"added", "removed"}
    assert result.summary.addedCount == 1
    assert result.summary.removedCount == 1


def test_unchanged_rows_are_not_reported_as_differences():
    row = {"Tag Number": "T-1", "Status": "Approved"}
    original = make_sheet(["Tag Number", "Status"], [row])
    revised = make_sheet(["Tag Number", "Status"], [dict(row)])

    result = compare_sheets(original, revised, default_config())

    assert result.differences == []
    assert result.summary.unchangedCount == 1


def test_duplicate_tag_number_reported_as_error_and_excluded_from_diff():
    original = make_sheet(
        ["Tag Number", "Status"],
        [
            {"Tag Number": "T-1", "Status": "Approved"},
            {"Tag Number": "T-1", "Status": "Pending"},
        ],
    )
    revised = make_sheet(["Tag Number", "Status"], [{"Tag Number": "T-1", "Status": "Approved"}])

    result = compare_sheets(original, revised, default_config())

    assert result.summary.errorCount == 1
    assert result.summary.changedCount == 0
    error = next(d for d in result.differences if d.changeType == "error")
    assert "Duplicate Tag Number" in error.errorMessage


def test_blank_tag_rows_are_skipped_and_reported():
    original = make_sheet(
        ["Tag Number", "Status"],
        [{"Tag Number": "", "Status": "Approved"}, {"Tag Number": "T-1", "Status": "Approved"}],
    )
    revised = make_sheet(["Tag Number", "Status"], [{"Tag Number": "T-1", "Status": "Approved"}])

    result = compare_sheets(original, revised, default_config())

    assert result.summary.unchangedCount == 1
    blank_error = next(d for d in result.differences if "blank Tag Number" in (d.errorMessage or ""))
    assert "original sheet" in blank_error.errorMessage


def test_missing_column_reported_as_error():
    original = make_sheet(["Tag Number", "Status", "Material"], [{"Tag Number": "T-1", "Status": "A", "Material": "SS"}])
    revised = make_sheet(["Tag Number", "Status"], [{"Tag Number": "T-1", "Status": "A"}])

    result = compare_sheets(original, revised, default_config())

    assert result.summary.columnsCompared == 1  # only "Status" is shared
    error = next(d for d in result.differences if d.columnName == "Material")
    assert error.changeType == "error"
    assert "not in the revised sheet" in error.errorMessage


def test_ignored_columns_are_excluded_from_comparison():
    original = make_sheet(["Tag Number", "Status", "Notes"], [{"Tag Number": "T-1", "Status": "A", "Notes": "old"}])
    revised = make_sheet(["Tag Number", "Status", "Notes"], [{"Tag Number": "T-1", "Status": "A", "Notes": "new"}])

    result = compare_sheets(original, revised, default_config(ignoredColumns=["Notes"]))

    assert result.differences == []
    assert result.summary.columnsCompared == 1


def test_trim_whitespace_and_ignore_case_options():
    original = make_sheet(["Tag Number", "Status"], [{"Tag Number": "T-1", "Status": "Approved"}])
    revised = make_sheet(["Tag Number", "Status"], [{"Tag Number": "T-1", "Status": "  approved  "}])

    # Defaults (trim + no ignore-case) still differ because of case.
    result_case_sensitive = compare_sheets(original, revised, default_config())
    assert result_case_sensitive.summary.changedCount == 1

    result_ignore_case = compare_sheets(original, revised, default_config(ignoreCase=True))
    assert result_ignore_case.summary.changedCount == 0
    assert result_ignore_case.summary.unchangedCount == 1


def test_numeric_values_compared_exactly_without_rounding():
    original = make_sheet(["Tag Number", "Reading"], [{"Tag Number": "T-1", "Reading": 10.1}])
    revised_equal = make_sheet(["Tag Number", "Reading"], [{"Tag Number": "T-1", "Reading": 10.1}])
    revised_different = make_sheet(["Tag Number", "Reading"], [{"Tag Number": "T-1", "Reading": 10.100001}])

    assert compare_sheets(original, revised_equal, default_config()).summary.changedCount == 0
    assert compare_sheets(original, revised_different, default_config()).summary.changedCount == 1


def test_duplicate_headers_reported_as_error():
    original = make_sheet(["Tag Number", "Status"], [{"Tag Number": "T-1", "Status": "A"}], duplicate_headers=["Status"])
    revised = make_sheet(["Tag Number", "Status"], [{"Tag Number": "T-1", "Status": "A"}])

    result = compare_sheets(original, revised, default_config())

    error = next(d for d in result.differences if "Duplicate column header" in (d.errorMessage or ""))
    assert error.columnName == "Status"


def test_resolve_tag_column_alias_fallback_when_sheet_uses_different_header():
    original = make_sheet(["Tag No.", "Status"], [{"Tag No.": "T-1", "Status": "A"}])
    revised = make_sheet(["Tag No.", "Status"], [{"Tag No.": "T-1", "Status": "B"}])

    # config.tagColumn is the frontend's fixed "Tag Number", but the sheet
    # actually uses the "Tag No." alias — this should still resolve.
    result = compare_sheets(original, revised, default_config(tagColumn="Tag Number"))
    assert result.summary.changedCount == 1


def test_ambiguous_tag_column_raises():
    original = make_sheet(["Asset Tag", "Equipment Tag"], [{"Asset Tag": "T-1", "Equipment Tag": "x"}])
    revised = make_sheet(["Asset Tag", "Equipment Tag"], [{"Asset Tag": "T-1", "Equipment Tag": "x"}])

    try:
        compare_sheets(original, revised, default_config(tagColumn="Tag Number"))
        assert False, "expected AmbiguousTagColumnError"
    except AmbiguousTagColumnError:
        pass


def test_tag_column_not_found_raises():
    original = make_sheet(["Description"], [{"Description": "x"}])
    revised = make_sheet(["Description"], [{"Description": "x"}])

    try:
        compare_sheets(original, revised, default_config(tagColumn="Tag Number"))
        assert False, "expected TagColumnNotFoundError"
    except TagColumnNotFoundError:
        pass
