#!/usr/bin/env python3
"""Simple heartbeat probe for Docker HEALTHCHECK."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

HEALTH_URL = os.getenv("BMO_HEALTHCHECK_URL", "http://localhost:8000/health")


def main() -> int:
    request = urllib.request.Request(HEALTH_URL)
    try:
        with urllib.request.urlopen(request, timeout=5) as response:  # noqa: S310
            if response.status != 200:
                return 1
            payload = response.read().decode("utf-8")
            try:
                data = json.loads(payload)
            except json.JSONDecodeError:
                return 1
            if data.get("status") != "ok":
                return 1
            return 0
    except (urllib.error.URLError, TimeoutError, ConnectionError):  # pragma: no cover - network errors
        return 1
    except Exception:
        return 1


if __name__ == "__main__":
    sys.exit(main())
