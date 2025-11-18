from fastapi import APIRouter, Depends, File, UploadFile

from app.dependencies import get_transcription_service
from app.schemas.transcription import TranscriptionResponse
from app.services.transcription import TranscriptionService

router = APIRouter(prefix="/api/v1/transcription", tags=["transcription"])


@router.post("", response_model=TranscriptionResponse, summary="Transcribe uploaded audio via Gladia")
async def transcribe_audio(
    audio: UploadFile = File(...),
    service: TranscriptionService = Depends(get_transcription_service),
) -> TranscriptionResponse:
    transcript = await service.transcribe_upload(audio)
    return TranscriptionResponse(transcript=transcript)
