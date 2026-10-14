"""Upload and inspect workbooks: /workbooks, /workbooks/{id}/columns,
/workbooks/{id}/inspect."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app import config
from app.excel_utils import SheetNotFoundError, WorkbookReadError, load_workbook_from_path, read_sheet_columns
from app.dependencies import get_stored_workbook
from app.models import SheetInspection, UploadedWorkbook, WorkbookSlot
from app.storage import StoredWorkbook, workbook_store
from app.tag_detection import detect_tag_column

router = APIRouter(tags=["workbooks"])


def _validate_extension(filename: str) -> None:
    suffix = Path(filename).suffix.lower()
    if suffix not in config.ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(config.ALLOWED_EXTENSIONS))
        raise HTTPException(status_code=400, detail={"message": f"Unsupported file type \"{suffix}\". Allowed: {allowed}."})


@router.post("/workbooks", response_model=UploadedWorkbook)
async def upload_workbook(file: UploadFile = File(...), slot: WorkbookSlot = Form(...)) -> UploadedWorkbook:
    del slot  # not needed server-side today; kept for symmetry with the client API and future per-slot handling

    if not file.filename:
        raise HTTPException(status_code=400, detail={"message": "No file was provided."})
    _validate_extension(file.filename)

    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=400, detail={"message": "The uploaded file is empty."})
    if len(data) > config.MAX_UPLOAD_SIZE_BYTES:
        limit_mb = config.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail={"message": f"File is too large. The limit is {limit_mb:.0f} MB."},
        )

    config.TEMP_DIR.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename).suffix.lower()
    temp_path = config.TEMP_DIR / f"{uuid.uuid4().hex}{suffix}"
    try:
        temp_path.write_bytes(data)
        try:
            workbook = load_workbook_from_path(temp_path)
        except WorkbookReadError as exc:
            raise HTTPException(status_code=400, detail={"message": str(exc)}) from exc
    finally:
        # The file's only job was to hand bytes to openpyxl; it never needs
        # to outlive this request.
        temp_path.unlink(missing_ok=True)

    if not workbook.sheetnames:
        raise HTTPException(status_code=400, detail={"message": "This workbook has no worksheets."})

    workbook_id = f"wb_{uuid.uuid4().hex[:12]}"
    uploaded_at = datetime.now(timezone.utc).isoformat()
    workbook_store.put(
        workbook_id,
        StoredWorkbook(
            workbook=workbook,
            file_name=file.filename,
            size_bytes=len(data),
            uploaded_at=uploaded_at,
            sheet_names=list(workbook.sheetnames),
        ),
    )

    return UploadedWorkbook(
        id=workbook_id,
        fileName=file.filename,
        sizeBytes=len(data),
        uploadedAt=uploaded_at,
        sheetNames=list(workbook.sheetnames),
    )


@router.get("/workbooks/{workbook_id}/columns", response_model=list[str])
async def get_sheet_columns(workbook_id: str, sheet: str) -> list[str]:
    stored = get_stored_workbook(workbook_id)
    try:
        return read_sheet_columns(stored.workbook, sheet)
    except SheetNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"message": str(exc)}) from exc


@router.get("/workbooks/{workbook_id}/inspect", response_model=SheetInspection)
async def inspect_sheet(workbook_id: str, sheet: str) -> SheetInspection:
    """Columns plus tag-column detection, so a frontend confirmation step
    can be built against this without re-parsing anything."""
    stored = get_stored_workbook(workbook_id)
    try:
        columns = read_sheet_columns(stored.workbook, sheet)
    except SheetNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"message": str(exc)}) from exc

    detection = detect_tag_column(columns)
    return SheetInspection(
        columns=columns,
        detectedTagColumn=detection.detected,
        candidateTagColumns=detection.candidates,
        isAmbiguous=detection.is_ambiguous,
    )
