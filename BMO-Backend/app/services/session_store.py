import asyncio
from collections import defaultdict
from typing import Dict, List, Literal, TypedDict

MessageRole = Literal["user", "assistant"]


class ChatMessage(TypedDict):
    role: MessageRole
    content: str


class SessionStore:
    """In-memory session store. Replace with Redis or a database for production."""

    def __init__(self) -> None:
        self._sessions: Dict[str, List[ChatMessage]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def create(self, session_id: str) -> None:
        async with self._lock:
            if session_id not in self._sessions:
                self._sessions[session_id] = []

    async def append(self, session_id: str, role: MessageRole, content: str) -> None:
        async with self._lock:
            self._sessions[session_id].append({"role": role, "content": content})

    async def get_history(self, session_id: str) -> List[ChatMessage]:
        async with self._lock:
            return list(self._sessions.get(session_id, []))

    async def clear(self, session_id: str) -> None:
        async with self._lock:
            if session_id in self._sessions:
                del self._sessions[session_id]
