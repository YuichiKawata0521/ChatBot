from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from src.models.chat import ChatRequest
from src.services.chat_service import chat_stream_service

router = APIRouter()

@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    return StreamingResponse(
        chat_stream_service(req.messages, req.model_name, req.temperature),
        media_type="text/event-stream"
    )