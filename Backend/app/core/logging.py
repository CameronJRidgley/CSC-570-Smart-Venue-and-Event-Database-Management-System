import logging
import sys


def configure_logging(level: str = "INFO") -> None:
    """Configure root logging once. Idempotent — safe to call repeatedly."""
    root = logging.getLogger()
    if root.handlers:
        # already configured (e.g. by uvicorn); just set the level.
        root.setLevel(level)
        return
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
        stream=sys.stdout,
    )


logger = logging.getLogger("app")
