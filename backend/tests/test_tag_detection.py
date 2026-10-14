from app.tag_detection import (
    AmbiguousTagColumnError,
    TagColumnNotFoundError,
    detect_tag_column,
    normalize_header,
    resolve_tag_column,
)


def test_normalize_header_strips_punctuation_and_case():
    assert normalize_header("Tag No.") == normalize_header("TAG_NO") == normalize_header("tag no")


def test_detect_tag_column_single_match():
    detection = detect_tag_column(["Description", "Tag No.", "Status"])
    assert detection.detected == "Tag No."
    assert detection.is_ambiguous is False


def test_detect_tag_column_no_match():
    detection = detect_tag_column(["Description", "Status"])
    assert detection.detected is None
    assert detection.candidates == []
    assert detection.is_ambiguous is False


def test_detect_tag_column_ambiguous_when_multiple_alias_columns_present():
    # Two columns that both normalize to a known alias spelling.
    detection = detect_tag_column(["Asset Tag", "Equipment Tag", "Description"])
    assert detection.detected is None
    assert detection.is_ambiguous is True
    assert set(detection.candidates) == {"Asset Tag", "Equipment Tag"}


def test_resolve_tag_column_prefers_exact_requested_name():
    assert resolve_tag_column(["Tag Number", "Tag No."], "Tag Number") == "Tag Number"


def test_resolve_tag_column_falls_back_to_alias_detection():
    assert resolve_tag_column(["Tag No.", "Description"], "Tag Number") == "Tag No."


def test_resolve_tag_column_raises_when_ambiguous():
    try:
        resolve_tag_column(["Asset Tag", "Equipment Tag"], "Tag Number")
        assert False, "expected AmbiguousTagColumnError"
    except AmbiguousTagColumnError as exc:
        assert set(exc.candidates) == {"Asset Tag", "Equipment Tag"}


def test_resolve_tag_column_raises_when_not_found():
    try:
        resolve_tag_column(["Description", "Status"], "Tag Number")
        assert False, "expected TagColumnNotFoundError"
    except TagColumnNotFoundError:
        pass
