from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "BMO Backend"
    app_version: str = "0.1.0"
    app_description: str = "FastAPI backend powering BMO's voice + navigation workflow."
    app_url: str = "http://localhost:3000"

    cors_origins: List[str] = ["http://localhost:3000", "https://localhost:3000"]

    openrouter_api_key: str
    openrouter_model: str = "google/gemini-2.0-flash-exp:free"
    openrouter_temperature: float = 0.2

    openai_api_key: str
    tts_model: str = "gpt-4o-mini-tts"
    tts_voice: str = "alloy"

    default_greeting: str = "Hello! I’m BMO, your tour companion."


@lru_cache()
def get_settings() -> Settings:
    return Settings()
