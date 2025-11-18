# syntax=docker/dockerfile:1.7
FROM python:3.11-slim as base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    POETRY_VIRTUALENVS_CREATE=false

WORKDIR /app

COPY requirements.txt ./
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY docker-healthcheck.py ./docker-healthcheck.py

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "/app/docker-healthcheck.py"]

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
