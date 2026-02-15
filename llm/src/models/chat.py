from pydantic import BaseModel
from typing import List, Optional

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    model_name: Optional[str] = "gpt-4o-mini"
    temperature: Optional[float] = 0.7