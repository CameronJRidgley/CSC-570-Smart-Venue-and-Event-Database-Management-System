"""QR code helpers.

`generate_token` produces the opaque string stored on the Ticket row.
`render_png_base64` renders that token as a PNG and returns it
base64-encoded, ready to embed in JSON responses.
"""
import base64
import io
import uuid

import qrcode


def generate_token() -> str:
    """Unique, opaque QR token persisted on the Ticket row."""
    return uuid.uuid4().hex


def render_png_base64(token: str) -> str:
    img = qrcode.make(token)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")
