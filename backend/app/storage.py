"""In-memory, process-lifetime stores. No database, per the brief — just two
capacity-capped dicts guarded by a lock, since FastAPI may serve sync
endpoints from a thread pool."""

from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Generic, TypeVar

from openpyxl import Workbook

from app import config
from app.models import ComparisonResult

T = TypeVar("T")


class _BoundedStore(Generic[T]):
    def __init__(self, max_items: int):
        self._max_items = max_items
        self._items: dict[str, T] = {}
        self._lock = threading.Lock()

    def put(self, key: str, value: T) -> None:
        with self._lock:
            self._items[key] = value
            while len(self._items) > self._max_items:
                oldest_key = next(iter(self._items))
                del self._items[oldest_key]

    def get(self, key: str) -> T | None:
        with self._lock:
            return self._items.get(key)

    def delete(self, key: str) -> None:
        with self._lock:
            self._items.pop(key, None)


@dataclass
class StoredWorkbook:
    workbook: Workbook
    file_name: str
    size_bytes: int
    uploaded_at: str
    sheet_names: list[str]


def create_workbook_store(max_items: int) -> _BoundedStore[StoredWorkbook]:
    return _BoundedStore(max_items)


def create_comparison_store(max_items: int) -> _BoundedStore[ComparisonResult]:
    return _BoundedStore(max_items)


# Process-lifetime singletons. A single FastAPI process is the whole
# deployment unit here — no multi-worker/shared-state concern in scope.
workbook_store = create_workbook_store(config.MAX_STORED_WORKBOOKS)
comparison_store = create_comparison_store(config.MAX_STORED_COMPARISONS)
