"""Small shared helpers used by more than one router."""

from __future__ import annotations

from fastapi import HTTPException

from app.storage import StoredWorkbook, workbook_store


def get_stored_workbook(workbook_id: str, label: str = "Workbook") -> StoredWorkbook:
    stored = workbook_store.get(workbook_id)
    if stored is None:
        raise HTTPException(
            status_code=404,
            detail={"message": f"{label} workbook is no longer available. Please re-upload it."},
        )
    return stored
