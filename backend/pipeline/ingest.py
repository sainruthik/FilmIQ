import re
from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

from config import settings

_embeddings: OpenAIEmbeddings | None = None


def get_embeddings() -> OpenAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = OpenAIEmbeddings(
            model=settings.embed_model,
            openai_api_key=settings.openai_api_key,
        )
    return _embeddings


def collection_name(job_id: str) -> str:
    return f"film_{job_id[:12].replace('-', '')}"


def extract_film_title(pages: list) -> str:
    if not pages:
        return "Film Analysis"

    text = pages[0].page_content
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    genre_words = {
        "HORROR", "DRAMA", "COMEDY", "THRILLER", "ACTION", "ROMANCE",
        "DOCUMENTARY", "ANIMATION", "PERIOD", "PIECE", "VAMPIRE", "CRIME",
        "MYSTERY", "FANTASY", "SCI-FI", "WESTERN", "MUSICAL", "WAR",
        "SPORT", "SPORTS", "FAMILY", "BIOGRAPHICAL", "BIO",
    }

    year = None
    for line in lines[:25]:
        m = re.search(r"\b(19|20)\d{2}\b", line)
        if m:
            year = m.group()
            break

    for line in lines:
        if line.startswith('"') or line.startswith("'"):
            continue
        words = set(line.upper().split())
        if not words or words.issubset(genre_words):
            continue
        if 2 <= len(line) <= 60 and not re.search(r"\d{4}", line):
            title = line.title() if line.isupper() else line
            return f"{title} ({year})" if year else title

    return "Film Analysis"


def ingest_pdfs(job_id: str, pdf_paths: list[str]) -> tuple:
    """Load one or more PDFs, chunk, embed, upsert to Qdrant. Returns (vector_store, chunks, film_title)."""
    pages = []
    for path in pdf_paths:
        pages.extend(PyPDFLoader(path).load())

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(pages)

    film_title = extract_film_title(pages)
    embeddings = get_embeddings()
    coll = collection_name(job_id)

    client = QdrantClient(url=settings.qdrant_host, api_key=settings.qdrant_api_key)
    existing = [c.name for c in client.get_collections().collections]
    if coll in existing:
        client.delete_collection(coll)

    client.create_collection(
        collection_name=coll,
        vectors_config=VectorParams(size=settings.embed_dim, distance=Distance.COSINE),
    )

    vector_store = QdrantVectorStore.from_documents(
        documents=chunks,
        embedding=embeddings,
        url=settings.qdrant_host,
        api_key=settings.qdrant_api_key,
        collection_name=coll,
        prefer_grpc=False,
    )

    return vector_store, chunks, film_title


# Backward-compat alias
def ingest_pdf(job_id: str, pdf_path: str) -> tuple:
    return ingest_pdfs(job_id, [pdf_path])
