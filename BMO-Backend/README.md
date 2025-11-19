# BMO Backend (FastAPI)

This FastAPI service powers BMO's voice-driven tour guide workflow. It exposes:

- `/api/v1/conversation/wake` – start a session and get a greeting
- `/api/v1/conversation/listen` – legacy endpoint kept for compatibility (returns 410)
- `/api/v1/conversation/respond` – send a transcript, get OpenRouter narration, navigation cues, and synthesized speech

The `/respond` payload now strictly returns JSON metadata in addition to the speech binary:

- `thought` – candid internal monologue from BMO
- `voice_response` – what BMO vocalizes (mirrors the speech audio)
- `navigation_display` – structured cues for the UI (`zone`, `headline`, `details`, optional `map_attachment`)
- `emotion` – friendly mood label (`delighted`, `focused`, etc.)

The automatic Swagger UI lives at `http://localhost:8000/docs`.

## Prerequisites

- Python 3.11+
- API keys stored in a `.env` file (see below)

```dotenv
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
EDGE_TTS_VOICE=en-US-JennyNeural
EDGE_TTS_RATE=+0%
EDGE_TTS_VOLUME=+0%
APP_URL=http://localhost:3000
CORS_ORIGINS=["http://localhost:3000","https://localhost:3000"]
```

> Speech-to-text now happens directly in the browser via the Chrome Web Speech API, so the backend no longer consumes audio uploads. Speech synthesis uses Microsoft Edge TTS and the defaults above; no additional API key is required. If you develop over HTTPS (e.g., `https://localhost:3000`), keep both HTTP and HTTPS origins in `CORS_ORIGINS` so the browser can reach FastAPI.

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

### Persona + AIU map context

- Edit `app/resources/aiu_map.md` to attach the latest campus map, safety cues, or wayfinding notes. The contents of this file are streamed into the LLM before every response.
- Keep the "### Instructions for human editors" section at the top so future teammates know how to refresh the map. Under `### Map`, replace the placeholder hero text with a Markdown description, ASCII sketch, or even a base64/image link.
- If you need to reset the persona tone, tweak `SYSTEM_PROMPT` inside `app/services/conversation.py`. It references the map context automatically—no code changes required when the file updates.

#### Embedding a PNG map in Markdown

1. Save the PNG inside `BMO-Backend/app/resources/media/` (create the folder if it doesn’t exist). Stick to a predictable filename such as `bmo-campus-map.png` so teammates know what to update next time.
2. Open `app/resources/aiu_map.md` and add a Markdown image tag that points to the file:

   ```markdown
   ![AIU aerial map](../media/bmo-campus-map.png)
   ```

   When the backend loads the Markdown, the LLM sees the alt text plus the relative path, which is enough to hint at the visual reference.
3. If you prefer to keep everything in a single file, convert the PNG to base64 and embed it inline:

   ```cmd
   certutil -encode .\app\resources\media\bmo-campus-map.png bmo-campus-map.b64
   ```

   Then paste the base64 string inside the Markdown image tag:

   ```markdown
   ![AIU aerial map](data:image/png;base64,PASTE_STRING_HERE)
   ```

   Large images can make the Markdown unwieldy, so keep the PNG small (≤500 KB) or summarize key areas beneath the image.

Once you save the file and reference it from `aiu_map.md`, the backend immediately reloads the Markdown the next time BMO responds. No rebuild or restart is required—the model will see your updated map description on the very next request.

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
