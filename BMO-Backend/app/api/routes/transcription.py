from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/v1/transcription", tags=["transcription"])


@router.post("")
async def deprecated_transcription() -> None:
	raise HTTPException(
		status_code=410,
		detail=(
			"Server-side transcription has been retired. Use the Chrome Web Speech integration "
			"shipped in the frontend instead."
		),
	)
