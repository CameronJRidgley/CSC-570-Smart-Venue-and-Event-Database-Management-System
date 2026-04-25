"""Request-ID and basic access-log middleware."""
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.logging import logger

_HEADER = "X-Request-ID"


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Attach a request id to request.state and response headers, plus log
    a one-line access record including latency.
    """

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get(_HEADER) or uuid.uuid4().hex
        request.state.request_id = request_id

        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000

        response.headers[_HEADER] = request_id
        logger.info(
            "%s %s -> %s in %.1fms rid=%s",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
            request_id,
        )
        return response
