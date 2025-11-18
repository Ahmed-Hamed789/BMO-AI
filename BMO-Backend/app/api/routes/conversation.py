from fastapi import APIRouter, Depends

from app.dependencies import get_conversation_service
from app.schemas.conversation import RespondPayload, RespondRequest, WakeResponse
from app.services.conversation import ConversationService

router = APIRouter(prefix="/api/v1/conversation", tags=["conversation"])


@router.post("/wake", response_model=WakeResponse, summary="Initiate a session")
async def wake(
    service: ConversationService = Depends(get_conversation_service),
) -> WakeResponse:
    return await service.start_session()



@router.post(
    "/respond",
    response_model=RespondPayload,
    summary="Generate navigation guidance + speech from a transcript",
)
async def respond(
    payload: RespondRequest,
    service: ConversationService = Depends(get_conversation_service),
) -> RespondPayload:
    return await service.generate_response(payload.session_id, payload.transcript)
