from dotenv import load_dotenv
import os
from langchain_openai import ChatOpenAI

load_dotenv()
model = os.getenv('LLM_MODEL_NAME') or 'gpt-4o-mini'
def get_llm():
    return ChatOpenAI(
        model=model,
        temperature=0.4
    )