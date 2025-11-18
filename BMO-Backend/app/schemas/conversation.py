from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field


class WakeResponse(BaseModel):
    session_id: str
    message: str


class RespondRequest(BaseModel):
    session_id: str = Field(..., description="Conversation session identifier")
    transcript: str = Field(..., description="Transcribed user speech or typed command")


class SpeechPayload(BaseModel):
    mime_type: str
    base64: str


class RespondPayload(BaseModel):
    session_id: str
    transcript: str
    narration: str
    destination: str
    directions: List[str]
    mode: str
    speech: SpeechPayload
