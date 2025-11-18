from __future__ import annotations

from typing import Any, Dict, Optional

import httpx
from fastapi import HTTPException, UploadFile

from app.core.config import Settings


class TranscriptionService:
    """Proxy Gladia's speech-to-text API."""

    def __init__(self, settings: Settings) -> None:
        if not settings.gladia_api_key:
            raise ValueError("GLADIA_API_KEY is required for transcription services.")
        self.settings = settings
        self.endpoint = "https://api.gladia.io/audio/text/audio-transcription/"
        self.timeout = httpx.Timeout(120.0)

    async def transcribe_upload(self, upload: UploadFile) -> str:
        audio_bytes = await upload.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Audio file was empty.")

        files = {
            "audio": (
                upload.filename or "capture.webm",
                audio_bytes,
                upload.content_type or "audio/webm",
            )
        }

        data = {"language": "english"}
        headers = {"x-gladia-key": self.settings.gladia_api_key}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                self.endpoint,
                headers=headers,
                data=data,
                files=files,
            )

        if response.status_code >= 400:
            detail = self._extract_error(response)
            raise HTTPException(status_code=502, detail=f"Gladia error: {detail}")

        transcript = self._extract_transcript(response)
        if not transcript:
            raise HTTPException(status_code=502, detail="Gladia response missing transcript.")
        return transcript

    def _extract_transcript(self, response: httpx.Response) -> Optional[str]:
        try:
            payload: Dict[str, Any] = response.json()
        except ValueError:
            return None

        result_block = payload.get("result")
        if isinstance(result_block, dict):
            transcription = result_block.get("transcription")
            if isinstance(transcription, dict):
                full_text = transcription.get("full_text")
                if isinstance(full_text, str) and full_text.strip():
                    return full_text.strip()
            if isinstance(result_block.get("text"), str):
                text_value = result_block["text"].strip()
                if text_value:
                    return text_value

        for key in ("transcription", "text", "prediction"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

        if isinstance(result_block, str) and result_block.strip():
            return result_block.strip()

        return None

    def _extract_error(self, response: httpx.Response) -> str:
        try:
            payload = response.json()
        except ValueError:
            return response.text or "Unknown error"

        for key in ("detail", "message", "error"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value

        return response.text or "Unknown error"
