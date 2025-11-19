from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import conversation, transcription
from app.core.config import get_settings

settings = get_settings()

allow_all_origins = "*" in settings.cors_origins

app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
)

cors_kwargs = (
    {"allow_origins": [], "allow_origin_regex": ".*"}
    if allow_all_origins
    else {"allow_origins": settings.cors_origins}
)

app.add_middleware(
    CORSMiddleware,
    **cors_kwargs,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(conversation.router)
app.include_router(transcription.router)


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}
