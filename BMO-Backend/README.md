# BMO Backend (FastAPI)

This FastAPI service powers BMO's voice-driven tour guide workflow. It exposes:

- `/api/v1/conversation/wake` – start a session and get a greeting
- `/api/v1/conversation/listen` – upload recorded audio to run Speech-to-Text (OpenAI Whisper)
- `/api/v1/conversation/respond` – send a transcript, get OpenRouter narration, navigation cues, and synthesized speech

The automatic Swagger UI lives at `http://localhost:8000/docs`.

## Prerequisites

- Python 3.11+
- API keys stored in a `.env` file (see below)

```dotenv
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
OPENAI_API_KEY=...
TTS_MODEL=gpt-4o-mini-tts
TTS_VOICE=alloy
APP_URL=http://localhost:3000
CORS_ORIGINS=["http://localhost:3000","https://localhost:3000"]
```

> Speech-to-text now happens directly in the browser via the Chrome Web Speech API. The backend no longer consumes audio uploads or OpenAI STT credits—only TTS synthesis requires `OPENAI_API_KEY`. If you develop over HTTPS (e.g., `https://localhost:3000`), keep both HTTP and HTTPS origins in `CORS_ORIGINS` so the browser can reach FastAPI.

The backend now targets OpenRouter's `google/gemini-2.0-flash-exp:free` model by default. Update `OPENROUTER_MODEL` and `OPENROUTER_API_KEY` in `.env` if you need to switch models or rotate credentials.

## Setup

```cmd
cd BMO-Backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend will start on `http://localhost:8000`.

## Docker (recommended for local runs)

> Copy `.env.example` to `.env` (and fill in your API keys) **before** building so the container can read your settings at runtime.

```cmd
cd BMO-Backend
docker build -t bmo-backend:latest .
docker compose up -d
docker restart BMO-Backend
```

- `docker build` creates/updates the `bmo-backend:latest` image.
- `docker compose up -d` uses `docker-compose.yml` to start the container in the background with the canonical name `BMO-Backend` and port `8000` exposed.
- `docker restart BMO-Backend` restarts the running container any time you need to apply env changes.

The container ships with a heartbeat that hits `/health` every 10 seconds via Docker's `HEALTHCHECK`. If the probe fails three times in a row, Docker will mark the container as `unhealthy`, making it easy to wire into orchestration alerts.

After the container is up, hit the health endpoint to confirm everything is online:

```cmd
curl http://localhost:8000/health
```

You should receive `{"status":"ok"}`.
