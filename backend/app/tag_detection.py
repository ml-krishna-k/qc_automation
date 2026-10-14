"""Detects which column of a worksheet holds the Tag Number, from a set of
known header aliases, independent of spacing/punctuation/case."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

# Header spellings seen in the wild for the same concept. Compared after
# normalization, so "Tag No.", "TAG_NO", "tag no" all match "TAG NO" here.
TAG_COLUMN_ALIASES = {
    "TAG NUMBER",
    "TAG NO",
    "TAG NO.",
    "TAG #",
    "TAG",
    "INSTRUMENT TAG",
    "INSTRUMENT TAG NUMBER",
    "INSTRUMENT TAG NO",
    "EQUIPMENT TAG",
    "EQUIPMENT TAG NUMBER",
    "EQUIP TAG",
    "COMPONENT TAG",
    "DEVICE TAG",
    "ITEM TAG",
    "ASSET TAG",
    "ASSET NUMBER",
    "ASSET NO",
}


def normalize_header(header: str) -> str:
    """Collapses a header to just its letters/digits, upper-cased, so
    formatting differences never cause a false mismatch."""
    return re.sub(r"[^A-Z0-9]", "", header.upper())


_NORMALIZED_ALIASES = {normalize_header(alias) for alias in TAG_COLUMN_ALIASES}


@dataclass
class TagColumnDetection:
    detected: str | None
    candidates: list[str] = field(default_factory=list)
    is_ambiguous: bool = False


def detect_tag_column(columns: list[str]) -> TagColumnDetection:
    """Looks for columns whose normalized header matches a known alias.

    - Exactly one match -> confidently detected.
    - More than one match -> ambiguous; caller must ask the user to confirm.
    - No match -> undetected; caller must ask the user to pick manually.
    """
    matches = [c for c in columns if normalize_header(c) in _NORMALIZED_ALIASES]
    if len(matches) == 1:
        return TagColumnDetection(detected=matches[0], candidates=matches, is_ambiguous=False)
    if len(matches) > 1:
        return TagColumnDetection(detected=None, candidates=matches, is_ambiguous=True)
    return TagColumnDetection(detected=None, candidates=[], is_ambiguous=False)


class TagColumnNotFoundError(ValueError):
    """No column name matched the requested tag column or any known alias."""


class AmbiguousTagColumnError(ValueError):
    """More than one column could plausibly be the tag column."""

    def __init__(self, candidates: list[str]):
        self.candidates = candidates
        super().__init__(
            f"Multiple possible Tag Number columns found: {', '.join(candidates)}. "
            "Please confirm which one to use."
        )


def resolve_tag_column(columns: list[str], requested: str) -> str:
    """Resolves the tag column to use for one worksheet.

    If `requested` names an actual column, it is used verbatim (this is the
    common case — the frontend always sends "Tag Number"). Otherwise, alias
    detection is attempted so headers like "Tag No." still work without the
    user having to rename anything.
    """
    if requested in columns:
        return requested

    detection = detect_tag_column(columns)
    if detection.detected:
        return detection.detected
    if detection.is_ambiguous:
        raise AmbiguousTagColumnError(detection.candidates)
    raise TagColumnNotFoundError(
        f'No column matching "{requested}" or a known Tag Number alias was found. '
        "Please select the tag column manually."
    )
