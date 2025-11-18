from functools import lru_cache

from app.core.config import get_settings
from app.services.conversation import ConversationService
from app.services.openrouter import OpenRouterClient
from app.services.session_store import SessionStore
from app.services.speech import SpeechService


@lru_cache()
def get_session_store() -> SessionStore:
    return SessionStore()


@lru_cache()
def get_speech_service() -> SpeechService:
    return SpeechService(get_settings())


@lru_cache()
def get_openrouter_client() -> OpenRouterClient:
    return OpenRouterClient(get_settings())


def get_conversation_service() -> ConversationService:
    return ConversationService(
        settings=get_settings(),
        session_store=get_session_store(),
        openrouter=get_openrouter_client(),
        speech_service=get_speech_service(),
    )
