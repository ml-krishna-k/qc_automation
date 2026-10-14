from app.excel_utils import display_value, load_workbook_from_bytes, parse_sheet, read_sheet_columns
from tests.helpers import build_xlsx_bytes


def test_read_sheet_columns_skips_blank_headers():
    data = build_xlsx_bytes(["Tag Number", "", "Status"], [["T-1", None, "OK"]])
    workbook = load_workbook_from_bytes(data)
    assert read_sheet_columns(workbook, "Sheet1") == ["Tag Number", "Status"]


def test_parse_sheet_tracks_row_numbers_and_skips_blank_rows():
    data = build_xlsx_bytes(
        ["Tag Number", "Status"],
        [
            ["T-1", "Approved"],
            [None, None],  # fully blank row, skipped
            ["T-2", "Pending"],
        ],
    )
    workbook = load_workbook_from_bytes(data)
    sheet = parse_sheet(workbook, "Sheet1")

    assert [r.values["Tag Number"] for r in sheet.rows] == ["T-1", "T-2"]
    # Header is row 1; first data row is row 2, blank row 3 is skipped, next real row is 4.
    assert [r.row_number for r in sheet.rows] == [2, 4]


def test_parse_sheet_detects_duplicate_headers():
    data = build_xlsx_bytes(["Tag Number", "Status", "Status"], [["T-1", "Approved", "Reviewed"]])
    workbook = load_workbook_from_bytes(data)
    sheet = parse_sheet(workbook, "Sheet1")

    assert sheet.duplicate_headers == ["Status"]
    # The last occurrence of a duplicated header wins when reading values.
    assert sheet.rows[0].values["Status"] == "Reviewed"


def test_display_value_exact_no_rounding():
    assert display_value(10.1) == "10.1"
    assert display_value(5.0) == "5"
    assert display_value(0) == "0"
    assert display_value(None) == None
    assert display_value("  ") is None
    assert display_value("Approved") == "Approved"
