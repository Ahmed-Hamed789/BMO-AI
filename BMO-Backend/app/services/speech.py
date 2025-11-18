from __future__ import annotations

import base64
from typing import Dict

from fastapi import HTTPException
from openai import OpenAI

from app.core.config import Settings


class SpeechService:
    def __init__(self, settings: Settings) -> None:
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required for speech services.")
        self.settings = settings
        self.client = OpenAI(api_key=settings.openai_api_key)

    async def synthesize(self, text: str) -> Dict[str, str]:
        try:
            response = await self._run_in_thread(
                lambda: self.client.audio.speech.create(
                    model=self.settings.tts_model,
                    voice=self.settings.tts_voice,
                    input=text,
                    format="mp3",
                )
            )
            audio_bytes = response.read()
            return {
                "mime_type": "audio/mpeg",
                "base64": base64.b64encode(audio_bytes).decode("utf-8"),
            }
        except Exception as exc:  # pragma: no cover
            raise HTTPException(status_code=502, detail=f"TTS failed: {exc}") from exc

    async def _run_in_thread(self, func):
        import anyio

        return await anyio.to_thread.run_sync(func)
