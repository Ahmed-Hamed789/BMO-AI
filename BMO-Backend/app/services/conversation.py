from __future__ import annotations

import asyncio
import json
import uuid
from typing import Any, Dict, List

import httpx
from fastapi import HTTPException

from app.core.config import Settings
from app.services.openrouter import OpenRouterClient
from app.services.session_store import SessionStore
from app.services.speech import SpeechService

SYSTEM_PROMPT = (
    "You are BMO, an autonomous campus tour guide robot at Alamein International University. "
    "Respond with helpful directions, friendly tone, and actionable navigation steps. "
    "Always answer using compact JSON with the keys: narration (string), destination (string), "
    "directions (array of strings), and mode (one of: NAVIGATING, SPEAKING). "
    "If the user request does not require navigation, set destination to \"General\" and mode to SPEAKING." 
)


class ConversationService:
    def __init__(
        self,
        *,
        settings: Settings,
        session_store: SessionStore,
        openrouter: OpenRouterClient,
        speech_service: SpeechService,
    ) -> None:
        self.settings = settings
        self.session_store = session_store
        self.openrouter = openrouter
        self.speech_service = speech_service
        models = list(settings.openrouter_models or [])
        if settings.openrouter_model and settings.openrouter_model not in models:
            models.insert(0, settings.openrouter_model)
        self.model_candidates = models or [settings.openrouter_model]

    async def start_session(self) -> Dict[str, str]:
        session_id = str(uuid.uuid4())
        await self.session_store.create(session_id)
        await self.session_store.append(session_id, "assistant", self.settings.default_greeting)
        return {"session_id": session_id, "message": self.settings.default_greeting}

    async def generate_response(self, session_id: str, transcript: str) -> Dict[str, Any]:
        await self.session_store.append(session_id, "user", transcript)
        history = await self.session_store.get_history(session_id)
        messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history
        raw_json = await self._chat_with_models(messages)
        try:
            parsed = json.loads(raw_json)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=502, detail="Model returned invalid JSON") from exc

        narration = parsed.get("narration") or "Let me find that for you."
        destination = parsed.get("destination") or "General"
        directions = parsed.get("directions") or []
        mode = parsed.get("mode") or "SPEAKING"

        await self.session_store.append(session_id, "assistant", narration)
        speech_payload = await self.speech_service.synthesize(narration)

        return {
            "session_id": session_id,
            "transcript": transcript,
            "narration": narration,
            "destination": destination,
            "directions": directions,
            "mode": mode,
            "speech": speech_payload,
        }

    async def _chat_with_models(self, messages: List[Dict[str, str]]) -> str:
        errors: List[str] = []
        for model in self.model_candidates:
            try:
                return await self._chat_with_retry(messages, model=model)
            except HTTPException as exc:
                if exc.status_code == 401:
                    raise
                errors.append(f"{model}: {exc.detail}")
        detail = "All OpenRouter models failed. "
        if errors:
            detail += " | ".join(errors)
        raise HTTPException(status_code=502, detail=detail)

    async def _chat_with_retry(
        self,
        messages: List[Dict[str, str]],
        *,
        model: str,
        retries: int = 3,
    ) -> str:
        delay = 1.0
        for attempt in range(retries):
            try:
                return await self.openrouter.chat(messages, model=model)
            except httpx.HTTPStatusError as exc:
                status_code = exc.response.status_code
                if status_code == 401:
                    detail = (
                        "OpenRouter rejected the API key (401). "
                        "Verify OPENROUTER_API_KEY and that the model is accessible."
                    )
                    raise HTTPException(status_code=401, detail=detail) from exc
                if status_code == 429 and attempt < retries - 1:
                    await asyncio.sleep(delay)
                    delay *= 2
                    continue
                detail = (
                    "OpenRouter rate limit reached. Please retry in a moment."
                    if status_code == 429
                    else "OpenRouter rejected the request"
                )
                raise HTTPException(status_code=status_code or 502, detail=detail) from exc
            except httpx.RequestError as exc:
                if attempt < retries - 1:
                    await asyncio.sleep(delay)
                    delay *= 2
                    continue
                raise HTTPException(status_code=502, detail="Could not reach OpenRouter") from exc

        raise HTTPException(status_code=502, detail="OpenRouter is unavailable right now")
