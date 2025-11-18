from __future__ import annotations

import json
from typing import Any, Dict, List

import httpx

from app.core.config import Settings


class OpenRouterClient:
    BASE_URL = "https://openrouter.ai/api/v1"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._client = httpx.AsyncClient(timeout=60)

    async def chat(self, messages: List[Dict[str, str]]) -> str:
        payload = {
            "model": self.settings.openrouter_model,
            "temperature": self.settings.openrouter_temperature,
            "messages": messages,
            "response_format": {"type": "json_object"},
        }
        headers = {
            "Authorization": f"Bearer {self.settings.openrouter_api_key}",
            "HTTP-Referer": self.settings.app_url,
            "X-Title": self.settings.app_name,
        }
        response = await self._client.post(
            f"{self.BASE_URL}/chat/completions", json=payload, headers=headers
        )
        response.raise_for_status()
        data = response.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            raise RuntimeError("Unexpected OpenRouter response structure") from exc

    async def aclose(self) -> None:
        await self._client.aclose()

    async def __aenter__(self) -> "OpenRouterClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        await self.aclose()
