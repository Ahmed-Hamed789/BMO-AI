from __future__ import annotations

import json
import uuid
from typing import Any, Dict

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

    async def start_session(self) -> Dict[str, str]:
        session_id = str(uuid.uuid4())
        await self.session_store.create(session_id)
        await self.session_store.append(session_id, "assistant", self.settings.default_greeting)
        return {"session_id": session_id, "message": self.settings.default_greeting}

    async def generate_response(self, session_id: str, transcript: str) -> Dict[str, Any]:
        await self.session_store.append(session_id, "user", transcript)
        history = await self.session_store.get_history(session_id)
        messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history

        raw_json = await self.openrouter.chat(messages)
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
