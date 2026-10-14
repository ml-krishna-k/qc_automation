"""Shared helpers for building in-memory .xlsx files for tests."""

from __future__ import annotations

from io import BytesIO

from openpyxl import Workbook


def build_xlsx_bytes(headers: list[str], rows: list[list], sheet_name: str = "Sheet1") -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = sheet_name
    sheet.append(headers)
    for row in rows:
        sheet.append(row)
    buffer = BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()
