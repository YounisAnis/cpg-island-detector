import asyncio
import json
import logging
from contextlib import asynccontextmanager
from functools import partial

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool
from starlette.staticfiles import StaticFiles

from . import settings as cfg
from .fasta import InputError
from .model import load_model
from .pipeline import detect
from .schemas import DetectInput, DetectResult

log = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app):
    app.state.booster = load_model()
    app.state.gate = asyncio.Semaphore(1)
    log.info("model loaded, sha256 ok")
    yield


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
}


def error_response(status, code, message, details=None, headers=None):
    return JSONResponse({"error": {"code": code, "message": message, "details": details or {}}},
                        status_code=status, headers={**SECURITY_HEADERS, **(headers or {})})


@app.exception_handler(InputError)
async def input_error(request, exc):
    headers = {"Retry-After": str(cfg.BUSY_WAIT)} if exc.code == "busy" else {}
    return error_response(exc.status, exc.code, str(exc), exc.details, headers)


@app.exception_handler(Exception)
async def internal_error(request, exc):
    return error_response(500, "internal_error", "The server could not complete this request.")


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers.update(SECURITY_HEADERS)
    return response


@app.get("/api/v1/health")
async def health():
    return dict(status="ok", model_loaded=True, model_sha256=cfg.MODEL_SHA256, version=cfg.VERSION)


@app.get("/api/v1/config")
async def config():
    return dict(parameters=cfg.PARAMETERS, model=cfg.MODEL_INFO,
                limits=dict(min_bases=cfg.WIDTH, max_bases=cfg.MAX_BASES, max_records=cfg.MAX_RECORDS,
                            max_body_bytes=cfg.MAX_BODY_BYTES))


async def read_payload(request):
    def too_large():
        return InputError(413, "payload_too_large", "Request exceeds the byte limit.")

    declared = request.headers.get("content-length")
    if declared and declared.isascii() and declared.isdecimal() and int(declared) > cfg.MAX_BODY_BYTES:
        raise too_large()
    raw = bytearray()
    async for chunk in request.stream():
        if len(raw) + len(chunk) > cfg.MAX_BODY_BYTES:
            raise too_large()
        raw.extend(chunk)
    try:
        return DetectInput.model_validate(json.loads(raw))
    except (ValueError, ValidationError, RecursionError):
        raise InputError(400, "invalid_fasta", "Send JSON with an input string and optional include_scores boolean.") from None


@app.post("/api/v1/detect", response_model=DetectResult, response_model_exclude_none=True)
async def detect_endpoint(request: Request):
    payload = await read_payload(request)
    gate = request.app.state.gate
    try:
        await asyncio.wait_for(gate.acquire(), timeout=cfg.BUSY_WAIT)
    except TimeoutError:
        raise InputError(503, "busy", "Server is scoring another request. Please retry.") from None
    # Release only once the worker finishes, including if the client disconnects.
    task = asyncio.create_task(run_in_threadpool(partial(detect, request.app.state.booster, payload)))
    task.add_done_callback(lambda finished: gate.release())
    return await asyncio.shield(task)


if (cfg.ROOT / "static").is_dir():
    app.mount("/", StaticFiles(directory=cfg.ROOT / "static", html=True), name="static")
