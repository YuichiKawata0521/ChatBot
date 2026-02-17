import tiktoken
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from src.models.embed import ChunkResult

async def process_embedding(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> list[ChunkResult]:
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap
    )

    docs = text_splitter.split_text(text)

    embeddings_model = OpenAIEmbeddings(model="text-embedding-3-small")
    embeddings = embeddings_model.embed_documents(docs)

    encoding = tiktoken.get_encoding("cl100k_base")

    results = []

    for i, (doc, emb) in enumerate(zip(docs, embeddings)):
        token_count = len(encoding.encode(doc))
        results.append(ChunkResult(
            chunk_index=i,
            content=doc,
            embedding=emb,
            token_count=token_count
        ))
    
    return results