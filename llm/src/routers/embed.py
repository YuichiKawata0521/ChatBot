from fastapi import APIRouter
from src.models.embed import EmbedRequest, EmbedResponse, QueryEmbedRequest, QueryEmbedResponse
from src.services.embed_service import process_embedding, get_query_embedding

router = APIRouter()

@router.post("/embed", response_model=EmbedResponse)
async def embed_ednpoint(req: EmbedRequest):
    chunks = await process_embedding(req.text, req.chunk_size, req.chunk_over_lap)
    return EmbedResponse(chunks=chunks)

@router.post("/embed/query", response_model=QueryEmbedResponse)
async def embed_query_endpoint(req: QueryEmbedRequest):
    embedding = await get_query_embedding(req.text)
    return QueryEmbedResponse(embedding=embedding)