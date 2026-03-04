import json
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from src.models.chat import Message


def _extract_token_usage(chunk):
    usage = getattr(chunk, "usage_metadata", None) or {}

    if not usage:
        response_metadata = getattr(chunk, "response_metadata", None) or {}
        usage = response_metadata.get("token_usage", {})

    input_tokens = usage.get("input_tokens", usage.get("prompt_tokens", 0))
    output_tokens = usage.get("output_tokens", usage.get("completion_tokens", 0))
    total_tokens = usage.get("total_tokens", input_tokens + output_tokens)

    return {
        "input_tokens": int(input_tokens or 0),
        "output_tokens": int(output_tokens or 0),
        "total_tokens": int(total_tokens or 0)
    }

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
        streaming=True,
        model_kwargs={"stream_options": {"include_usage": True}}
    )

    latest_usage = {
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0
    }

    async for chunk in llm.astream(langchain_messages):
        if chunk.content:
            yield json.dumps({"type": "text", "content": chunk.content}, ensure_ascii=False) + "\n"

        usage = _extract_token_usage(chunk)
        if usage["input_tokens"] > 0 or usage["output_tokens"] > 0 or usage["total_tokens"] > 0:
            latest_usage = usage

    yield json.dumps({"type": "usage", **latest_usage}, ensure_ascii=False) + "\n"