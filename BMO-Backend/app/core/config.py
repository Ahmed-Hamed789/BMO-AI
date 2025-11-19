import json
from functools import lru_cache
from typing import List, Optional

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def forgiving_json_loads(value):
    if isinstance(value, (bytes, bytearray)):
        value = value.decode()

    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return stripped
        try:
            return json.loads(stripped)
        except json.JSONDecodeError:
            return stripped

    return value


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        json_loads=forgiving_json_loads,
    )

    app_name: str = "BMO Backend"
    app_version: str = "0.1.0"
    app_description: str = "FastAPI backend powering BMO's voice + navigation workflow."
    app_url: str = "http://localhost:3000"

    cors_origins: List[str] = ["http://localhost:3000", "https://localhost:3000"]

    openrouter_api_key: str
    openrouter_model: str = "google/gemini-2.0-flash-exp:free"
    openrouter_models: List[str] = [
        "google/gemini-2.0-flash-exp:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "qwen/qwen-2.5-72b-instruct:free",
        "mistralai/mistral-nemo:free",
    ]
    openrouter_temperature: float = 0.2

    edge_tts_voice: str = "en-US-JennyNeural"
    edge_tts_rate: str = "+0%"
    edge_tts_volume: str = "+0%"

    default_greeting: str = (
        "Hey there! I’m BMO, broadcasting from the Central Library. Ask me about any building or shortcut."
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def normalize_cors_origins(cls, value):
        """Allow JSON arrays, comma-separated strings, or single origins."""
        if isinstance(value, list):
            return value

        if not isinstance(value, str):
            return value

        cleaned = value.strip()
        if not cleaned:
            return []

        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                return parsed
            if isinstance(parsed, str):
                return [parsed]
        except json.JSONDecodeError:
            pass

        return [origin.strip() for origin in cleaned.split(",") if origin.strip()]

    @model_validator(mode="after")
    def ensure_app_url_allowed(self):
        if not self.app_url:
            return self

        normalized_app = self.app_url.rstrip("/")
        normalized_origins = [origin.rstrip("/") for origin in self.cors_origins]

        if normalized_app not in normalized_origins:
            self.cors_origins.append(self.app_url)

        return self


@lru_cache()
def get_settings() -> Settings:
    return Settings()
