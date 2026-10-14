"""Run a comparison and download its report: /comparisons, /comparisons/{id}/report."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Response

from app.compare import compare_sheets
from app.dependencies import get_stored_workbook
from app.excel_utils import SheetNotFoundError, parse_sheet
from app.models import ComparisonResult, RunComparisonRequest
from app.report import build_comparison_report
from app.storage import comparison_store
from app.tag_detection import AmbiguousTagColumnError, TagColumnNotFoundError

router = APIRouter(tags=["comparisons"])


@router.post("/comparisons", response_model=ComparisonResult)
async def run_comparison(request: RunComparisonRequest) -> ComparisonResult:
    original_stored = get_stored_workbook(request.originalWorkbookId, "Original")
    revised_stored = get_stored_workbook(request.revisedWorkbookId, "Revised")

    try:
        original_sheet = parse_sheet(original_stored.workbook, request.config.originalSheet)
    except SheetNotFoundError as exc:
        raise HTTPException(status_code=400, detail={"message": f"Original sheet: {exc}"}) from exc
    try:
        revised_sheet = parse_sheet(revised_stored.workbook, request.config.revisedSheet)
    except SheetNotFoundError as exc:
        raise HTTPException(status_code=400, detail={"message": f"Revised sheet: {exc}"}) from exc

    if len(original_sheet.rows) == 0:
        raise HTTPException(status_code=400, detail={"message": f'"{request.config.originalSheet}" has no data rows.'})
    if len(revised_sheet.rows) == 0:
        raise HTTPException(status_code=400, detail={"message": f'"{request.config.revisedSheet}" has no data rows.'})

    try:
        result = compare_sheets(original_sheet, revised_sheet, request.config)
    except AmbiguousTagColumnError as exc:
        raise HTTPException(status_code=422, detail={"message": str(exc), "candidates": exc.candidates}) from exc
    except TagColumnNotFoundError as exc:
        raise HTTPException(status_code=422, detail={"message": str(exc)}) from exc

    comparison_store.put(result.id, result)
    return result


@router.get("/comparisons/{comparison_id}/report")
async def download_report(comparison_id: str) -> Response:
    result = comparison_store.get(comparison_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail={"message": "This comparison result is no longer available. Please run the comparison again."},
        )

    report_bytes = build_comparison_report(result)
    filename = f"comparison-report-{result.runAt[:10]}.xlsx"
    return Response(
        content=report_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
