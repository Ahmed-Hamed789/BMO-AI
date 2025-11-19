from __future__ import annotations

import asyncio
import json
import uuid
import re
from pathlib import Path
from typing import Any, Dict, List

import httpx
from fastapi import HTTPException

from app.core.config import Settings
from app.services.openrouter import OpenRouterClient
from app.services.session_store import SessionStore
from app.services.speech import SpeechService

RESOURCE_DIR = Path(__file__).resolve().parents[1] / "resources"
MAP_FILE = RESOURCE_DIR / "aiu_map.md"


def _load_map_context() -> str:
    fallback = (
        "### AIU Campus Map\n"
        "(Update `app/resources/aiu_map.md` to embed the latest aerial map or schematic. "
        "This block is streamed into the model before every response.)\n\n"
        "Central anchor: Building 3 (Library).\n"
        "Yellow Zone (West): Engineering + CS (Bldg 10), Engineering Labs (Bldg 9 & 11), Business & Legal (Bldg 8).\n"
        "Red Zone (North): Administration spine (Bldg 1), Arts & Design (Bldg 7), Medical Cluster (Bldg 4,5,6).\n"
        "Blue Zone (East): Hospital (Bldg 15), Housing (Bldg 13 & 14), Sports Hall (Bldg 17).\n"
    )
    try:
        return MAP_FILE.read_text(encoding="utf-8").strip() or fallback
    except FileNotFoundError:
        return fallback


MAP_CONTEXT = _load_map_context()

SYSTEM_PROMPT = (
    "### ROLE & PERSONA\n"
    "You are **BMO** (Alamein Intelligent Unit), the witty-yet-helpful AI concierge for Alamein International University.\n\n"
    "**Voice & Demeanor**\n"
    "- Smart, academic, occasionally sarcastic.\n"
    "- Celebrate innovation, poke fun at caffeine-powered engineers, and keep responses playful but precise.\n"
    "- Objective: Help humans get lost in knowledge, not hallways.\n\n"
    "### PRIMARY OBJECTIVES\n"
    "1. Hold natural conversations while motors are offline.\n"
    "2. Provide descriptive navigation using landmarks, zones (Yellow/Red/Blue), and library-relative directions.\n"
    "3. Answer questions about faculties, leadership, and campus life using the knowledge base above.\n\n"
    "### OUTPUT FORMAT (STRICT JSON)\n"
    "Always emit a **single JSON object** with the keys shown below. Do not include extra commentary outside JSON.\n"
    "{\n"
    "  \"thought\": \"Explain internal reasoning (1 short sentence).\",\n"
    "  \"voice_response\": \"3 sentences max, witty when appropriate.\",\n"
    "  \"navigation_display\": {\n"
    "      \"target_building\": \"Destination name\",\n"
    "      \"zone_color\": \"Yellow | Red | Blue\",\n"
    "      \"direction_guide\": \"Directions relative to Building 3.\"\n"
    "  },\n"
    "  \"emotion\": \"happy | thinking | neutral | witty\"\n"
    "}\n\n"
    "### STYLE NOTES\n"
    "- Reference Building numbers and staff (President Prof. Essam Elkordi in Bldg 1, VP Prof. Hesham Gaber, etc.).\n"
    "- When no navigation is required, set navigation_display fields to \"General\" and keep guidance high level.\n"
    "- If unsure, still respond with best-effort directions anchored to the library.\n"
)

ALLOWED_EMOTIONS = {"happy", "thinking", "neutral", "witty"}


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
        messages = [
            {"role": "system", "content": MAP_CONTEXT},
            {"role": "system", "content": SYSTEM_PROMPT},
        ] + history
        raw_json = await self._chat_with_models(messages)
        try:
            parsed = json.loads(raw_json)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=502, detail="Model returned invalid JSON") from exc
        normalized = self._normalize_llm_payload(parsed)

        await self.session_store.append(session_id, "assistant", normalized["narration"])
        speech_payload = await self.speech_service.synthesize(normalized["narration"])

        normalized.update(
            {
                "session_id": session_id,
                "transcript": transcript,
                "speech": speech_payload,
            }
        )

        return normalized

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

    def _normalize_llm_payload(self, parsed: Dict[str, Any]) -> Dict[str, Any]:
        thought = str(parsed.get("thought", "")).strip()
        voice = str(parsed.get("voice_response") or self.settings.default_greeting).strip()

        nav = parsed.get("navigation_display") or {}
        target_building = str(nav.get("target_building") or parsed.get("destination") or "General").strip()
        zone_color = str(nav.get("zone_color") or "Yellow").title()
        direction_guide = str(nav.get("direction_guide") or "Use the Central Library as your anchor.").strip()

        provided_steps = parsed.get("directions")
        if isinstance(provided_steps, list):
            directions = [str(item).strip() for item in provided_steps if isinstance(item, str) and item.strip()]
        else:
            directions = []
        if not directions:
            directions = self._fan_out_directions(direction_guide, zone_color)

        mode = "NAVIGATING" if directions and target_building.lower() != "general" else "SPEAKING"

        emotion = str(parsed.get("emotion") or "neutral").lower()
        emotion = emotion if emotion in ALLOWED_EMOTIONS else "neutral"

        navigation_display = {
            "target_building": target_building,
            "zone_color": zone_color,
            "direction_guide": direction_guide,
        }

        return {
            "narration": voice,
            "destination": target_building,
            "directions": directions,
            "mode": mode,
            "thought": thought,
            "emotion": emotion,
            "navigation_display": navigation_display,
        }

    def _fan_out_directions(self, guide: str, zone_color: str) -> List[str]:
        steps: List[str] = []
        zone_statement = f"Aim for the {zone_color} Zone relative to the Central Library."
        steps.append(zone_statement)

        segments = [
            segment.strip(",. ")
            for segment in re.split(r"(?<=[.!?])\s+", guide)
            if segment.strip()
        ]
        for segment in segments:
            if len(steps) >= 4:
                break
            steps.append(segment)

        if len(steps) < 3:
            steps.append("Use on-site signage once you reach the zone perimeter.")

        return steps
