"""Process-wide settings, overridable via environment variables. No framework
needed for this — a handful of plain constants is all this service has."""

import os
import tempfile
from pathlib import Path

# Largest upload accepted, in bytes. Default: 15 MB.
MAX_UPLOAD_SIZE_BYTES = int(os.environ.get("MAX_UPLOAD_SIZE_BYTES", 15 * 1024 * 1024))

# openpyxl only reads the modern, XML-based Excel formats.
ALLOWED_EXTENSIONS = {".xlsx", ".xlsm"}

# Directory used for the brief window between receiving an upload and
# parsing it. Files here are deleted immediately after use (see
# routers/workbooks.py); this is not a cache or persistent store.
TEMP_DIR = Path(os.environ.get("QC_TEMP_DIR", tempfile.gettempdir())) / "qc_automation_uploads"

# In-memory stores are capped so a long-running dev/demo process can't grow
# without bound. Oldest entries are evicted first (see app/storage.py).
MAX_STORED_WORKBOOKS = int(os.environ.get("MAX_STORED_WORKBOOKS", 50))
MAX_STORED_COMPARISONS = int(os.environ.get("MAX_STORED_COMPARISONS", 50))

CORS_ALLOW_ORIGINS = os.environ.get(
    "CORS_ALLOW_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")
