"""Pydantic schemas. These mirror `frontend/src/types/domain.ts` field-for-field
so the existing React client can deserialize responses without any changes."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class WorkbookSlot(str, Enum):
    original = "original"
    revised = "revised"


class UploadedWorkbook(BaseModel):
    id: str
    fileName: str
    sizeBytes: int
    uploadedAt: str
    sheetNames: list[str]


class SheetInspection(BaseModel):
    """Extra detail beyond the current frontend contract, for the tag-column
    confirmation flow described in the brief. Additive — existing clients
    that don't call this endpoint are unaffected."""

    columns: list[str]
    detectedTagColumn: Optional[str] = None
    candidateTagColumns: list[str] = Field(default_factory=list)
    isAmbiguous: bool = False


class ComparisonConfig(BaseModel):
    originalSheet: str
    revisedSheet: str
    tagColumn: str
    ignoredColumns: list[str] = Field(default_factory=list)
    trimWhitespace: bool = True
    ignoreCase: bool = False


class RunComparisonRequest(BaseModel):
    originalWorkbookId: str
    revisedWorkbookId: str
    config: ComparisonConfig


class ChangeType(str, Enum):
    changed = "changed"
    added = "added"
    removed = "removed"
    error = "error"


class DifferenceRow(BaseModel):
    id: str
    tagNumber: str
    columnName: str
    originalValue: Optional[str] = None
    revisedValue: Optional[str] = None
    changeType: ChangeType
    errorMessage: Optional[str] = None
    # Source row numbers (1-indexed, header is row 1). Omitted for
    # column-level issues that aren't tied to a single row.
    originalRow: Optional[int] = None
    revisedRow: Optional[int] = None


class ComparisonSummary(BaseModel):
    totalTagsCompared: int
    changedCount: int
    addedCount: int
    removedCount: int
    errorCount: int
    unchangedCount: int
    columnsCompared: int


class ComparisonResult(BaseModel):
    id: str
    runAt: str
    config: ComparisonConfig
    summary: ComparisonSummary
    differences: list[DifferenceRow]


class ErrorResponse(BaseModel):
    message: str
    candidates: list[str] = Field(default_factory=list)
