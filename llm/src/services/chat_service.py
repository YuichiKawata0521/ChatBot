import os
from typing import AsyncGenerator
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from src.models.chat import Message

async def chat_stream_service(messages_data: list[Message], model_name: str, temperature: float):
    langchain_messages = []

    for msg in messages_data:
        if msg.role == "user":
            langchain_messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            langchain_messages.append(AIMessage(content=msg.content))
        elif msg.role == "system":
            langchain_messages.append(SystemMessage(content=msg.content))
    
    llm = ChatOpenAI(
        model=model_name,
        temperature=temperature,
        streaming=True
    )

    async for chunk in llm.astream(langchain_messages):
        if chunk.content:
            yield chunk.content