from __future__ import annotations

import base64
from typing import Dict

import edge_tts
from fastapi import HTTPException

from app.core.config import Settings


class SpeechService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def synthesize(self, text: str) -> Dict[str, str]:
        try:
            audio_bytes = await self._synthesize_edge_audio(text)
            mime_type = "audio/mpeg"
            return {
                "mime_type": mime_type,
                "base64": base64.b64encode(audio_bytes).decode("utf-8"),
            }
        except Exception as exc:  # pragma: no cover
            raise HTTPException(status_code=502, detail=f"TTS failed: {exc}") from exc

    async def _synthesize_edge_audio(self, text: str) -> bytes:
        communicate = edge_tts.Communicate(
            text,
            self.settings.edge_tts_voice,
            rate=self.settings.edge_tts_rate,
            volume=self.settings.edge_tts_volume,
        )
        audio_chunks: list[bytes] = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio" and chunk.get("data"):
                audio_chunks.append(chunk["data"])

        if not audio_chunks:
            raise HTTPException(status_code=502, detail="TTS failed to produce audio data")

        return b"".join(audio_chunks)
