from fastapi import APIRouter
from src.models.embed import EmbedRequest, EmbedResponse
from src.services.embed_service import process_embedding

router = APIRouter()

@router.post("/embed", response_model=EmbedResponse)
async def embed_ednpoint(req: EmbedRequest):
    chunks = await process_embedding(req.text, req.chunk_size, req.chunk_over_lap)
    return EmbedResponse(chunks=chunks)