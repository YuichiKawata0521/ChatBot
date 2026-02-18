from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routers import chat, embed, convert

app = FastAPI()

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(chat.router, prefix="/api")
app.include_router(embed.router, prefix="/api")
app.include_router(convert.router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "ok", "mode": "llm-only"}