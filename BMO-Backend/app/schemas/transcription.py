from pydantic import BaseModel


class TranscriptionResponse(BaseModel):
    transcript: str
