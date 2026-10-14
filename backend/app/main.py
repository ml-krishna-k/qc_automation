"""FastAPI entrypoint. Routes are mounted under /api to match the frontend's
Vite dev proxy (`vite.config.ts` forwards `/api/*` to this server unchanged)."""

from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import config
from app.routers import comparisons, workbooks

logger = logging.getLogger("qc_automation")

app = FastAPI(title="QC Automation API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ALLOW_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workbooks.router, prefix="/api")
app.include_router(comparisons.router, prefix="/api")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Routers raise `HTTPException(detail={"message": ..., "candidates": [...]})`.
    FastAPI's default handler would nest that under a `"detail"` key; the
    frontend's API client reads `body.message` at the top level, so this
    flattens it to match (and still handles a plain-string `detail`)."""
    del request
    body = exc.detail if isinstance(exc.detail, dict) else {"message": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content=body, headers=exc.headers)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Last-resort safety net: never leak a stack trace to the client."""
    del request
    logger.exception("Unhandled error")
    return JSONResponse(status_code=500, content={"message": "An unexpected error occurred."})
