from pydantic import BaseModel
from typing import List

class EmbedRequest(BaseModel):
    text: str
    chunk_size: int = 1000
    chunk_over_lap: int = 200

class ChunkResult(BaseModel):
    chunk_index: int
    content: str
    embedding: List[float]
    token_count: int

class EmbedResponse(BaseModel):
    chunks: List[ChunkResult]